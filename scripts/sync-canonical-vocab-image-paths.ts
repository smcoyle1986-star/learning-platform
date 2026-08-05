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

type VocabImageRow = {
  id: number | string;
  image_path: string | null;
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

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as {
    transferSafe: boolean;
    actionCounts: Record<string, number>;
    entries: Array<{ destinationPath: string; action: string }>;
    unclaimedRemoteObjects: Array<{ path: string }>;
  };
  if (
    !manifest.transferSafe ||
    manifest.entries.some((entry) => entry.action !== "skip_verified")
  ) {
    throw new Error("Refusing database sync until every manifest image is skip_verified.");
  }

  const verifiedPaths = new Set(
    manifest.entries.map((entry) => entry.destinationPath)
  );
  const remotePaths = new Set([
    ...verifiedPaths,
    ...manifest.unclaimedRemoteObjects.map((entry) => entry.path),
  ]);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const rows: VocabImageRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("vocab_images")
      .select("id, image_path")
      .range(offset, offset + 999);
    if (error) throw error;
    const batch = (data ?? []) as VocabImageRow[];
    rows.push(...batch);
    if (batch.length < 1000) break;
  }

  const updates = rows
    .filter((row) => Boolean(row.image_path))
    .map((row) => {
      const source = String(row.image_path);
      return { id: row.id, source, destination: canonicalStoragePath(source) };
    })
    .filter((row) => row.source !== row.destination);

  const resolvable = updates.filter((row) => verifiedPaths.has(row.destination));
  const unresolved = updates.filter((row) => !verifiedPaths.has(row.destination));
  const stale = unresolved.filter(
    (row) => !remotePaths.has(row.source) && !remotePaths.has(row.destination)
  );
  const apply = process.argv.includes("--apply");
  const deleteStale = process.argv.includes("--delete-stale");

  console.log(
    JSON.stringify(
      {
        apply,
        rows: rows.length,
        updates: resolvable.length,
        unresolved: unresolved.length,
        stale: stale.length,
        deleteStale,
        staleRows: stale,
        unresolvedRows: unresolved,
        sample: resolvable.slice(0, 25),
      },
      null,
      2
    )
  );

  if (!apply || resolvable.length === 0) return;

  const failures: Array<{ id: string | number; error: string }> = [];
  let completed = 0;
  for (const row of resolvable) {
    const { error } = await supabase
      .from("vocab_images")
      .update({ image_path: row.destination })
      .eq("id", row.id);
    if (error) failures.push({ id: row.id, error: error.message });
    completed += 1;
    if (completed % 25 === 0 || completed === resolvable.length) {
      console.log(
        JSON.stringify({
          completed,
          total: resolvable.length,
          failures: failures.length,
        })
      );
    }
  }

  if (failures.length > 0) {
    console.error(JSON.stringify({ failures }, null, 2));
    throw new Error(`${failures.length} vocab_images updates failed.`);
  }

  if (deleteStale && stale.length > 0) {
    const staleIds = stale.map((row) => row.id);
    const { error } = await supabase.from("vocab_images").delete().in("id", staleIds);
    if (error) throw error;
    console.log(JSON.stringify({ deletedStaleRows: staleIds }));
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
