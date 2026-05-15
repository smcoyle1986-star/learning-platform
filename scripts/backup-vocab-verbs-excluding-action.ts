import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

type StorageEntry = { name: string; id?: string | null };

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
    outputDir: "/Users/Sean/Desktop/verbs-backup",
    bucket: "vocab-images",
    storageFolder: "verbs",
    dryRun: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--output-dir=")) parsed.outputDir = arg.split("=")[1]?.trim() || parsed.outputDir;
    else if (arg.startsWith("--bucket=")) parsed.bucket = arg.split("=")[1]?.trim() || parsed.bucket;
    else if (arg.startsWith("--folder=")) parsed.storageFolder = arg.split("=")[1]?.trim() || parsed.storageFolder;
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

  const { data: verbs, error: verbsError } = await supabase
    .from("verbs")
    .select("lemma,themes");

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

  const targets = allFiles.filter((filePath) => {
    const withoutRoot = filePath.replace(/^verbs\//, "");
    const folderName = withoutRoot.split("/")[0] ?? "";
    const folderLemma = normalizeLemma(folderName);
    return !actionLemmas.has(folderLemma);
  });

  console.log(
    JSON.stringify(
      {
        bucket: args.bucket,
        storageFolder: args.storageFolder,
        outputDir: args.outputDir,
        actionLemmas: actionLemmas.size,
        totalFilesInFolder: allFiles.length,
        selectedForBackup: targets.length,
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

  let downloaded = 0;
  for (const filePath of targets) {
    const { data, error } = await bucket.download(filePath);
    if (error || !data) {
      console.error(`Failed ${filePath}: ${error?.message ?? "no data"}`);
      continue;
    }

    const localPath = path.join(args.outputDir, args.bucket, filePath);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    const buffer = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(localPath, buffer);
    downloaded += 1;
    console.log(`Downloaded ${downloaded}/${targets.length}: ${filePath}`);
  }

  console.log(`Backup complete. Downloaded ${downloaded} files.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
