import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const MANIFEST_PATH = path.join(
  process.cwd(),
  "migration",
  "vocab-storage-transfer-manifest.json"
);
const ALLOWED_ACTIONS = new Set(["upload_missing", "replace_placeholder"]);

type ManifestEntry = {
  action: string;
  sourcePath: string;
  destinationPath: string;
  size: number;
  sha256: string;
};

type TransferManifest = {
  bucket: string;
  generatedAt: string;
  transferSafe: boolean;
  collisionCount: number;
  actionCounts: Record<string, number>;
  entries: ManifestEntry[];
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

function contentTypeFor(filePath: string) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    default:
      return "image/png";
  }
}

function sha256(filePath: string) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const manifest = JSON.parse(
    fs.readFileSync(MANIFEST_PATH, "utf8")
  ) as TransferManifest;

  if (!manifest.transferSafe) {
    throw new Error("Transfer refused: manifest transferSafe is false.");
  }
  if (manifest.collisionCount !== 0) {
    throw new Error(`Transfer refused: manifest has ${manifest.collisionCount} collisions.`);
  }
  if ((manifest.actionCounts.needs_review ?? 0) !== 0) {
    throw new Error("Transfer refused: manifest contains needs_review entries.");
  }
  if ((manifest.actionCounts.replace_different ?? 0) !== 0) {
    throw new Error(
      "Transfer refused: manifest contains replace_different entries that require explicit review."
    );
  }

  const entries = manifest.entries.filter((entry) => ALLOWED_ACTIONS.has(entry.action));
  const concurrencyArg = process.argv.find((argument) =>
    argument.startsWith("--concurrency=")
  );
  const concurrency = Math.max(
    1,
    Math.min(16, Number(concurrencyArg?.split("=")[1] ?? 8) || 8)
  );
  const dryRun = process.argv.includes("--dry-run");

  let totalBytes = 0;
  for (const entry of entries) {
    if (!fs.existsSync(entry.sourcePath)) {
      throw new Error(`Source file is missing: ${entry.sourcePath}`);
    }
    const stat = fs.statSync(entry.sourcePath);
    if (!stat.isFile() || stat.size !== entry.size) {
      throw new Error(`Source size changed since manifest: ${entry.sourcePath}`);
    }
    if (sha256(entry.sourcePath) !== entry.sha256) {
      throw new Error(`Source checksum changed since manifest: ${entry.sourcePath}`);
    }
    totalBytes += entry.size;
  }

  console.log(
    JSON.stringify(
      {
        bucket: manifest.bucket,
        manifestGeneratedAt: manifest.generatedAt,
        dryRun,
        concurrency,
        files: entries.length,
        bytes: totalBytes,
        gibibytes: Number((totalBytes / 1024 / 1024 / 1024).toFixed(3)),
        actions: {
          upload_missing: entries.filter((entry) => entry.action === "upload_missing").length,
          replace_placeholder: entries.filter(
            (entry) => entry.action === "replace_placeholder"
          ).length,
        },
      },
      null,
      2
    )
  );

  if (dryRun || entries.length === 0) return;

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bucket = supabase.storage.from(manifest.bucket);
  const failures: Array<{ path: string; error: string }> = [];
  let nextIndex = 0;
  let completed = 0;
  let uploadedBytes = 0;
  const startedAt = Date.now();

  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= entries.length) return;

      const entry = entries[index];
      const content = fs.readFileSync(entry.sourcePath);
      const { error } = await bucket.upload(entry.destinationPath, content, {
        contentType: contentTypeFor(entry.sourcePath),
        cacheControl: "3600",
        upsert: entry.action === "replace_placeholder",
      });

      if (error) {
        failures.push({ path: entry.destinationPath, error: error.message });
      } else {
        uploadedBytes += entry.size;
      }

      completed += 1;
      if (completed % 25 === 0 || completed === entries.length) {
        const elapsedSeconds = Math.max(1, (Date.now() - startedAt) / 1000);
        console.log(
          JSON.stringify({
            completed,
            total: entries.length,
            failures: failures.length,
            uploadedGiB: Number((uploadedBytes / 1024 / 1024 / 1024).toFixed(3)),
            averageMiBPerSecond: Number(
              (uploadedBytes / 1024 / 1024 / elapsedSeconds).toFixed(2)
            ),
          })
        );
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));

  if (failures.length > 0) {
    console.error(JSON.stringify({ failures }, null, 2));
    throw new Error(`${failures.length} storage uploads failed.`);
  }

  console.log(
    JSON.stringify(
      {
        success: true,
        uploadedFiles: completed,
        uploadedBytes,
        elapsedSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
