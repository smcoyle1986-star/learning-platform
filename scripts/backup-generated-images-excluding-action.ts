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

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: { outputDir: string; bucket: string; dryRun: boolean } = {
    outputDir: "/Users/Sean/Desktop/verbs-backup",
    bucket: "generated-images",
    dryRun: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--output-dir=")) parsed.outputDir = arg.split("=")[1]?.trim() || parsed.outputDir;
    else if (arg.startsWith("--bucket=")) parsed.bucket = arg.split("=")[1]?.trim() || parsed.bucket;
    else if (arg === "--dry-run") parsed.dryRun = true;
  }

  return parsed;
}

function extractPublicObjectPath(imageUrl: string, bucket: string) {
  try {
    const u = new URL(imageUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const idx = u.pathname.indexOf(marker);
    if (idx < 0) return null;
    return decodeURIComponent(u.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

async function listAllFiles(
  listFn: (folder: string, offset: number) => Promise<{ data: StorageEntry[] | null; error: Error | null }>,
  folder: string
): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await listFn(folder, offset);
    if (error) throw error;
    const batch = data ?? [];

    for (const entry of batch) {
      const name = String(entry.name ?? "");
      if (!name) continue;
      if (name.toLowerCase().endsWith(".png") || name.toLowerCase().endsWith(".jpg") || name.toLowerCase().endsWith(".jpeg") || name.toLowerCase().endsWith(".webp")) {
        files.push(folder ? `${folder}/${name}` : name);
      }
    }

    if (batch.length < 100) break;
    offset += 100;
  }

  const subfolders: string[] = [];
  offset = 0;
  while (true) {
    const { data, error } = await listFn(folder, offset);
    if (error) throw error;
    const batch = data ?? [];

    for (const entry of batch) {
      const name = String(entry.name ?? "");
      if (!name) continue;
      const lower = name.toLowerCase();
      if (!lower.endsWith(".png") && !lower.endsWith(".jpg") && !lower.endsWith(".jpeg") && !lower.endsWith(".webp")) {
        subfolders.push(folder ? `${folder}/${name}` : name);
      }
    }

    if (batch.length < 100) break;
    offset += 100;
  }

  for (const sub of subfolders) {
    files.push(...(await listAllFiles(listFn, sub)));
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
    .select("lemma,themes,image_id")
    .not("image_id", "is", null);

  if (verbsError) throw verbsError;

  const actionPaths = new Set(
    (verbs ?? [])
      .filter((row: any) => (row.themes ?? []).map((t: string) => String(t).toLowerCase()).includes("action"))
      .map((row: any) => extractPublicObjectPath(String(row.image_id ?? ""), args.bucket))
      .filter((v): v is string => Boolean(v))
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
      error: result.error ? new Error(result.error.message) : null,
    };
  };

  const allFiles = await listAllFiles(listFn, "");
  const targets = allFiles.filter((filePath) => !actionPaths.has(filePath));

  console.log(
    JSON.stringify(
      {
        bucket: args.bucket,
        outputDir: args.outputDir,
        totalBucketFiles: allFiles.length,
        actionProtectedFiles: actionPaths.size,
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
