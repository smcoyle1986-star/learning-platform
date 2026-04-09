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

const IMAGE_BUCKET = "vocab-images";

type StorageRow = {
  name: string;
  id?: string | null;
};

async function listAll(
  listFn: (folder: string, offset: number) => Promise<{ data: StorageRow[] | null; error: Error | null }>,
  folder: string
) {
  const rows: StorageRow[] = [];
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

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));

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

  const bucket = supabase.storage.from(IMAGE_BUCKET);

  const listFolder = async (folder: string, offset: number) => {
    const result = await bucket.list(folder, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    return {
      data: (result.data as StorageRow[] | null) ?? null,
      error: result.error ? new Error(`${folder}: ${result.error.message}`) : null,
    };
  };

  const nounFolders = (await listAll(listFolder, "nouns")).filter(
    (row) => !String(row.name ?? "").toLowerCase().endsWith(".png")
  );

  const testFolders = (await listAll(listFolder, "test")).filter(
    (row) => !String(row.name ?? "").toLowerCase().endsWith(".png")
  );

  const { data: refRows, error: refError } = await supabase.from("vocab_images").select("image_path");
  if (refError) throw refError;

  const referencedPaths = new Set((refRows ?? []).map((row: any) => String(row.image_path ?? "")));

  const unreferencedByFolder = new Map<string, string[]>();
  let totalNounFiles = 0;

  for (const folder of nounFolders) {
    const folderName = String(folder.name ?? "");
    const files = (await listAll(listFolder, `nouns/${folderName}`)).filter((row) =>
      String(row.name ?? "").toLowerCase().endsWith(".png")
    );
    totalNounFiles += files.length;

    for (const file of files) {
      const fullPath = `nouns/${folderName}/${file.name}`;
      if (!referencedPaths.has(fullPath)) {
        const current = unreferencedByFolder.get(folderName) ?? [];
        current.push(fullPath);
        unreferencedByFolder.set(folderName, current);
      }
    }
  }

  const testFiles: string[] = [];
  for (const folder of testFolders) {
    const folderName = String(folder.name ?? "");
    const files = (await listAll(listFolder, `test/${folderName}`)).filter((row) =>
      String(row.name ?? "").toLowerCase().endsWith(".png")
    );
    for (const file of files) {
      testFiles.push(`test/${folderName}/${file.name}`);
    }
  }

  const unreferencedFolders = [...unreferencedByFolder.entries()]
    .map(([folder, files]) => ({ folder, count: files.length }))
    .sort((a, b) => b.count - a.count);

  const topUnreferencedFiles = [...unreferencedByFolder.values()].flat().slice(0, 200);

  console.log(
    JSON.stringify(
      {
        nounFolderCount: nounFolders.length,
        totalNounFiles,
        referencedCount: referencedPaths.size,
        unreferencedFileCount: [...unreferencedByFolder.values()].flat().length,
        testFileCount: testFiles.length,
        testFiles,
        topUnreferencedFolders: unreferencedFolders.slice(0, 50),
        topUnreferencedFiles,
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
