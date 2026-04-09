import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath: string) {
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

type StorageEntry = {
  name: string;
  id?: string | null;
};

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

async function walkStorage(params: {
  listFn: (folder: string, offset: number) => Promise<{ data: StorageEntry[] | null; error: Error | null }>;
  folder: string;
}): Promise<string[]> {
  const { listFn, folder } = params;
  const entries = await listAll(listFn, folder);
  const files: string[] = [];

  for (const entry of entries) {
    const name = String(entry.name ?? "");
    if (!name) continue;

    if (name.toLowerCase().endsWith(".png")) {
      files.push(`${folder}/${name}`);
      continue;
    }

    files.push(...(await walkStorage({ listFn, folder: `${folder}/${name}` })));
  }

  return files;
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));

  const outputRootArg = process.argv[2];
  const storageFolderArg = process.argv[3] ?? "nouns";
  if (!outputRootArg) {
    throw new Error(
      "Usage: node --import tsx scripts/download-storage-folder.ts <output-dir> [storage-folder]"
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const bucket = supabase.storage.from("vocab-images");
  const outputRoot = path.resolve(outputRootArg);

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

  const files = await walkStorage({ listFn, folder: storageFolderArg });
  let downloaded = 0;

  for (const filePath of files) {
    const { data, error } = await bucket.download(filePath);
    if (error) {
      console.error(`Failed to download ${filePath}: ${error.message}`);
      continue;
    }

    const localPath = path.join(outputRoot, filePath);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    const buffer = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(localPath, buffer);
    downloaded += 1;
    console.log(`Downloaded ${downloaded}/${files.length}: ${filePath}`);
  }

  console.log(
    JSON.stringify(
      {
        outputRoot,
        storageFolder: storageFolderArg,
        fileCount: files.length,
        downloaded,
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
