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

  const rawArgs = process.argv.slice(2);
  const variantArg = rawArgs.find((arg) => arg.startsWith("--variants="));
  const variants = variantArg
    ? variantArg
        .split("=")[1]
        ?.split(",")
        .map((value) => Number(value.trim()))
        .filter((value): value is 1 | 2 | 3 => value === 1 || value === 2 || value === 3)
    : [1, 2, 3];

  const lemmas = rawArgs
    .filter((arg) => !arg.startsWith("--variants="))
    .map((lemma) => lemma.trim().toLowerCase())
    .filter(Boolean);
  if (lemmas.length === 0) {
    throw new Error(
      "Usage: node --import tsx scripts/delete-storage-images.ts [--variants=1,2,3] <lemma> [lemma...]"
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) {
    throw new Error("Supabase env vars are missing.");
  }

  const supabase = createClient(supabaseUrl, serviceRole);
  const bucket = "vocab-images";
  const files = lemmas.flatMap((lemma) =>
    variants.map((n) => `nouns/${lemma}/${lemma}_${n}.png`)
  );

  const { data, error } = await supabase.storage.from(bucket).remove(files);
  if (error) {
    throw new Error(`Failed to delete files: ${error.message}`);
  }

  console.log(JSON.stringify({ removed: files, resultCount: data?.length ?? 0 }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
