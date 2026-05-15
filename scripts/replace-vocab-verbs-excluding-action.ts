import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

type StorageEntry = { name: string; id?: string | null };

const TRANSPARENT_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9KobjigAAAABJRU5ErkJggg==";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function normalizeLemma(value: string) {
  return value.trim().toLowerCase().replace(/_/g, " ");
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    bucket: "vocab-images",
    storageFolder: "verbs",
    dryRun: false,
    limit: undefined as number | undefined,
  };

  for (const arg of args) {
    if (arg.startsWith("--bucket=")) parsed.bucket = arg.split("=")[1]?.trim() || parsed.bucket;
    else if (arg.startsWith("--folder=")) parsed.storageFolder = arg.split("=")[1]?.trim() || parsed.storageFolder;
    else if (arg.startsWith("--limit=")) {
      const n = Number(arg.split("=")[1]);
      if (Number.isFinite(n) && n > 0) parsed.limit = n;
    }
    else if (arg === "--dry-run") parsed.dryRun = true;
  }

  return parsed;
}

async function listAll(
  listFn: (folder: string, offset: number) => Promise<{ data: StorageEntry[] | null; error: Error | null }>,
  folder: string
) {
  const rows: StorageEntry[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await listFn(folder, offset);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < 100) break;
    offset += 100;
  }

  return rows;
}

async function walkFiles(
  listFn: (folder: string, offset: number) => Promise<{ data: StorageEntry[] | null; error: Error | null }>,
  folder: string
): Promise<string[]> {
  const entries = await listAll(listFn, folder);
  const files: string[] = [];

  for (const entry of entries) {
    const name = String(entry.name ?? "");
    if (!name) continue;

    const lower = name.toLowerCase();
    const fullPath = `${folder}/${name}`;

    if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp")) {
      files.push(fullPath);
      continue;
    }

    files.push(...(await walkFiles(listFn, fullPath)));
  }

  return files;
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));
  const args = parseArgs();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRole) throw new Error("Missing Supabase env vars.");

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: verbs, error: verbsError } = await supabase.from("verbs").select("lemma,themes");
  if (verbsError) throw verbsError;

  const actionLemmas = new Set(
    (verbs ?? [])
      .filter((row: any) => (row.themes ?? []).map((t: string) => String(t).toLowerCase()).includes("action"))
      .map((row: any) => normalizeLemma(String(row.lemma ?? "")))
  );

  const bucket = supabase.storage.from(args.bucket);
  const listFn = async (folder: string, offset: number) => {
    const result = await bucket.list(folder, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    return {
      data: (result.data as StorageEntry[] | null) ?? null,
      error: result.error ? new Error(`${folder}: ${result.error.message}`) : null,
    };
  };

  const allFiles = await walkFiles(listFn, args.storageFolder);
  let targets = allFiles.filter((filePath) => {
    const withoutRoot = filePath.replace(/^verbs\//, "");
    const folderName = withoutRoot.split("/")[0] ?? "";
    const folderLemma = normalizeLemma(folderName);
    return !actionLemmas.has(folderLemma);
  });

  if (args.limit) {
    targets = targets.slice(0, args.limit);
  }

  console.log(
    JSON.stringify(
      {
        bucket: args.bucket,
        folder: args.storageFolder,
        actionLemmas: actionLemmas.size,
        totalFilesInFolder: allFiles.length,
        selectedForReplace: targets.length,
        dryRun: args.dryRun,
      },
      null,
      2
    )
  );

  if (args.dryRun) {
    console.log("Sample targets:");
    for (const p of targets.slice(0, 20)) console.log(p);
    return;
  }

  const placeholder = Buffer.from(TRANSPARENT_PNG_BASE64, "base64");
  let replaced = 0;

  for (const filePath of targets) {
    const { error } = await bucket.update(filePath, placeholder, {
      contentType: "image/png",
      upsert: true,
    });

    if (error) {
      console.error(`Failed to replace ${filePath}: ${error.message}`);
      continue;
    }

    replaced += 1;
    console.log(`Replaced ${replaced}/${targets.length}: ${filePath}`);
  }

  console.log(`Replacement complete. Replaced ${replaced} files.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
