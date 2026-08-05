import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const BUCKET = "vocab-images";
const AUDIT_PATH = path.join(
  process.cwd(),
  "migration",
  "image-transparency-audit.json"
);
const REPAIR_ROOT = path.join(
  process.cwd(),
  "tmp",
  "imagegen",
  "transparency-repair"
);
const REPORT_PATH = path.join(
  process.cwd(),
  "migration",
  "image-transparency-upload-report.json"
);

type AuditEntry = {
  destinationPath: string;
};

type AuditReport = {
  candidates: AuditEntry[];
  opaqueOther: AuditEntry[];
};

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function sha256(content: Buffer) {
  return createHash("sha256").update(content).digest("hex");
}

async function withRetry<T>(
  operation: () => Promise<T>,
  label: string,
  attempts = 4
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      console.warn(`${label} failed on attempt ${attempt}; retrying.`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw lastError;
}

async function alphaSummary(content: Buffer) {
  const metadata = await sharp(content).metadata();
  const { data, info } = await sharp(content)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let transparentPixels = 0;
  let transparentCornerPixels = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha < 16) transparentPixels += 1;
      if (
        alpha < 16 &&
        (x < 8 || x >= info.width - 8) &&
        (y < 8 || y >= info.height - 8)
      ) {
        transparentCornerPixels += 1;
      }
    }
  }

  return {
    width: info.width,
    height: info.height,
    hasAlpha: Boolean(metadata.hasAlpha),
    transparentFraction:
      Math.round(
        (transparentPixels / (info.width * info.height)) * 10_000
      ) / 10_000,
    transparentCornerPixels,
  };
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const audit = JSON.parse(
    fs.readFileSync(AUDIT_PATH, "utf8")
  ) as AuditReport;
  const entries = [...audit.candidates, ...audit.opaqueOther];
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bucket = supabase.storage.from(BUCKET);
  const results = [];

  for (const entry of entries) {
    const filePath = path.join(REPAIR_ROOT, entry.destinationPath);
    const content = fs.readFileSync(filePath);
    const localHash = sha256(content);
    const localAlpha = await alphaSummary(content);

    if (
      !localAlpha.hasAlpha ||
      localAlpha.transparentFraction <= 0 ||
      localAlpha.transparentCornerPixels !== 256
    ) {
      throw new Error(
        `Transparency validation failed for ${entry.destinationPath}.`
      );
    }

    await withRetry(
      async () => {
        const { error } = await bucket.upload(entry.destinationPath, content, {
          contentType: "image/png",
          cacheControl: "3600",
          upsert: true,
        });
        if (error) throw error;
      },
      `Upload for ${entry.destinationPath}`
    );

    const downloaded = await withRetry(
      async () => {
        const { data, error } = await bucket.download(entry.destinationPath);
        if (error) throw error;
        if (!data) throw new Error("Empty download response.");
        return data;
      },
      `Verification download for ${entry.destinationPath}`
    );

    const remoteContent = Buffer.from(await downloaded.arrayBuffer());
    const remoteHash = sha256(remoteContent);
    const remoteAlpha = await alphaSummary(remoteContent);
    if (remoteHash !== localHash) {
      throw new Error(
        `Checksum mismatch after uploading ${entry.destinationPath}.`
      );
    }

    results.push({
      destinationPath: entry.destinationPath,
      bytes: content.length,
      sha256: localHash,
      alpha: remoteAlpha,
      publicUrl: bucket.getPublicUrl(entry.destinationPath).data.publicUrl,
    });
    console.log(`Uploaded and verified ${entry.destinationPath}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    bucket: BUCKET,
    uploadedFiles: results.length,
    results,
  };
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ success: true, ...report }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
