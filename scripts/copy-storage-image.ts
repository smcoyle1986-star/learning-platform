import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

function parseEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

async function main() {
  parseEnvFile(path.join(process.cwd(), ".env.local"));
  parseEnvFile(path.join(process.cwd(), ".env"));

  const sourcePath = process.argv[2];
  const targetPath = process.argv[3];

  if (!sourcePath || !targetPath) {
    throw new Error("Usage: tsx scripts/copy-storage-image.ts <sourcePath> <targetPath>");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRole) {
    throw new Error("Supabase env vars are missing.");
  }

  const supabase = createClient(supabaseUrl, serviceRole);
  const bucket = "vocab-images";

  const { data, error } = await supabase.storage.from(bucket).download(sourcePath);
  if (error || !data) {
    throw new Error(`Failed to download ${sourcePath}: ${error?.message ?? "no data"}`);
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(targetPath, buffer, { contentType: "image/png", upsert: true });

  if (uploadError) {
    throw new Error(`Failed to upload ${targetPath}: ${uploadError.message}`);
  }

  console.log(`Copied ${sourcePath} -> ${targetPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
