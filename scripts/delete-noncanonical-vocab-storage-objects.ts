import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const MANIFEST_PATH = path.join(
  process.cwd(),
  "migration",
  "vocab-storage-transfer-manifest.json"
);
const SPECIAL_PATHS: Record<string, string> = {
  "nouns/coffee shop/coffee shop_2.png": "nouns/coffee_shop/coffee_shop_4.png",
};
const IMAGE_EXTENSION = /\.(png|jpe?g|webp)$/i;

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

function canonicalName(value: string) {
  return value
    .normalize("NFC")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function canonicalStoragePath(storagePath: string) {
  if (SPECIAL_PATHS[storagePath]) return SPECIAL_PATHS[storagePath];

  const parts = storagePath.split("/");
  if (parts.length < 3) return storagePath;
  const fileName = parts.at(-1)!;
  const extension = path.posix.extname(fileName).toLowerCase();
  const stem = path.posix.basename(fileName, path.posix.extname(fileName));
  return [
    parts[0].toLowerCase(),
    canonicalName(parts[1]),
    `${canonicalName(stem)}${extension}`,
  ].join("/");
}

function isNoncanonicalObject(storagePath: string) {
  const parts = storagePath.split("/");
  if (parts.length < 3) return false;
  const folder = parts[1];
  const fileName = parts.at(-1)!;
  const extension = path.posix.extname(fileName);
  const stem = path.posix.basename(fileName, extension);
  return (
    folder !== canonicalName(folder) ||
    (IMAGE_EXTENSION.test(fileName) && stem !== canonicalName(stem))
  );
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as {
    bucket: string;
    transferSafe: boolean;
    entries: Array<{ destinationPath: string; action: string }>;
    unclaimedRemoteObjects: Array<{ path: string; size: number }>;
  };
  if (
    !manifest.transferSafe ||
    manifest.entries.some((entry) => entry.action !== "skip_verified")
  ) {
    throw new Error("Refusing cleanup until every local image is skip_verified.");
  }

  const verifiedPaths = new Set(
    manifest.entries.map((entry) => entry.destinationPath)
  );
  const candidates = manifest.unclaimedRemoteObjects.filter((entry) =>
    isNoncanonicalObject(entry.path)
  );
  const unsafeRealImages = candidates.filter(
    (entry) =>
      entry.size > 70 &&
      IMAGE_EXTENSION.test(entry.path) &&
      !verifiedPaths.has(canonicalStoragePath(entry.path))
  );
  if (unsafeRealImages.length > 0) {
    console.error(JSON.stringify({ unsafeRealImages }, null, 2));
    throw new Error(
      `Refusing cleanup: ${unsafeRealImages.length} real images lack verified canonical copies.`
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const referencedPaths = new Set<string>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("vocab_images")
      .select("image_path")
      .range(offset, offset + 999);
    if (error) throw error;
    const batch = data ?? [];
    batch.forEach((row) => referencedPaths.add(String(row.image_path ?? "")));
    if (batch.length < 1000) break;
  }

  const referencedCandidates = candidates.filter((entry) =>
    referencedPaths.has(entry.path)
  );
  if (referencedCandidates.length > 0) {
    console.error(JSON.stringify({ referencedCandidates }, null, 2));
    throw new Error(
      `Refusing cleanup: ${referencedCandidates.length} candidates are still database-referenced.`
    );
  }

  const apply = process.argv.includes("--apply");
  console.log(
    JSON.stringify(
      {
        apply,
        bucket: manifest.bucket,
        deleteObjects: candidates.length,
        deleteBytes: candidates.reduce((sum, entry) => sum + entry.size, 0),
        realImages: candidates.filter(
          (entry) => entry.size > 70 && IMAGE_EXTENSION.test(entry.path)
        ).length,
        placeholderObjects: candidates.filter((entry) => entry.size <= 70).length,
        sample: candidates.slice(0, 40),
      },
      null,
      2
    )
  );

  if (!apply || candidates.length === 0) return;

  const bucket = supabase.storage.from(manifest.bucket);
  for (let index = 0; index < candidates.length; index += 100) {
    const batch = candidates.slice(index, index + 100).map((entry) => entry.path);
    const { error } = await bucket.remove(batch);
    if (error) throw error;
    console.log(
      JSON.stringify({
        deleted: Math.min(index + batch.length, candidates.length),
        total: candidates.length,
      })
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
