import fs from "node:fs";
import path from "node:path";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "vocab-images";
const MANIFEST_PATH = path.join(
  process.cwd(),
  "migration",
  "vocab-storage-transfer-manifest.json"
);

type VerbRow = {
  id: string;
  lemma: string;
  image_id: string | null;
};

type VocabImageRow = {
  id: number | string;
  noun_id: string | null;
  lemma: string;
  image_path: string;
  variant: string | null;
  is_default: boolean;
  is_premium: boolean;
};

type ManifestEntry = {
  category: string;
  destinationPath: string;
  action: string;
};

type DesiredImage = {
  lemma: string;
  verbId: string;
  sourcePath: string;
  destinationPath: string;
  variantNumber: number;
};

type StorageRow = {
  name: string;
  metadata?: {
    mimetype?: string;
    size?: number;
  } | null;
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

async function readAll<T>(
  queryPage: (offset: number) => Promise<{ data: T[] | null; error: Error | null }>
) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await queryPage(offset);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows;
}

async function listAll(
  supabase: SupabaseClient,
  folder: string
): Promise<StorageRow[]> {
  const rows: StorageRow[] = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await supabase.storage.from(BUCKET).list(folder, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    const batch = (data ?? []) as StorageRow[];
    rows.push(...batch);
    if (batch.length < 100) break;
  }
  return rows;
}

async function updatePrimaryImages(
  supabase: SupabaseClient,
  updates: Array<{ id: string; imageUrl: string }>
) {
  for (let index = 0; index < updates.length; index += 20) {
    await Promise.all(
      updates.slice(index, index + 20).map(async (update) => {
        const { error } = await supabase
          .from("verbs")
          .update({ image_id: update.imageUrl })
          .eq("id", update.id);
        if (error) throw error;
      })
    );
  }
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as {
    transferSafe: boolean;
    entries: ManifestEntry[];
  };
  if (
    !manifest.transferSafe ||
    manifest.entries.some((entry) => entry.action !== "skip_verified")
  ) {
    throw new Error("Refusing sync until every manifest image is skip_verified.");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const verbs = await readAll<VerbRow>(async (offset) => {
    const result = await supabase
      .from("verbs")
      .select("id, lemma, image_id")
      .range(offset, offset + 999);
    return { data: result.data as VerbRow[] | null, error: result.error };
  });
  const existingRows = await readAll<VocabImageRow>(async (offset) => {
    const result = await supabase
      .from("vocab_images")
      .select(
        "id, noun_id, lemma, image_path, variant, is_default, is_premium"
      )
      .eq("category", "verb")
      .range(offset, offset + 999);
    return {
      data: result.data as VocabImageRow[] | null,
      error: result.error,
    };
  });

  const verbsByCanonicalLemma = new Map(
    verbs.map((verb) => [canonicalName(verb.lemma), verb])
  );
  const desiredByPath = new Map<string, DesiredImage>();
  const unmappedSources: string[] = [];

  for (const entry of manifest.entries.filter(
    (candidate) => candidate.category === "verbs"
  )) {
    const fileName = path.posix.basename(entry.destinationPath);
    const extension = path.posix.extname(fileName).toLowerCase();
    const stem = path.posix.basename(fileName, extension);
    const match = stem.match(/^(.*?)_+(\d+)$/);
    if (!match) {
      unmappedSources.push(entry.destinationPath);
      continue;
    }

    const fileLemma = canonicalName(match[1]);
    const verb = verbsByCanonicalLemma.get(fileLemma);
    if (!verb) {
      unmappedSources.push(entry.destinationPath);
      continue;
    }

    const variantNumber = Number(match[2]);
    const destinationPath = `verbs/${fileLemma}/${fileLemma}_${variantNumber}${extension}`;
    const desired: DesiredImage = {
      lemma: verb.lemma,
      verbId: verb.id,
      sourcePath: entry.destinationPath,
      destinationPath,
      variantNumber,
    };
    const existing = desiredByPath.get(destinationPath);
    if (
      !existing ||
      entry.destinationPath === destinationPath ||
      existing.sourcePath !== existing.destinationPath
    ) {
      desiredByPath.set(destinationPath, desired);
    }
  }

  if (unmappedSources.length > 0) {
    throw new Error(
      `Refusing sync because ${unmappedSources.length} verb images could not be mapped: ${unmappedSources.join(", ")}`
    );
  }

  const storageFolders = await listAll(supabase, "verbs");
  const storagePaths = new Set<string>();
  const placeholderPaths: string[] = [];
  for (const folder of storageFolders) {
    const folderName = folder.name;
    const objects = await listAll(supabase, `verbs/${folderName}`);
    for (const object of objects) {
      const objectPath = `verbs/${folderName}/${object.name}`;
      storagePaths.add(objectPath);
      if (object.name === ".keep") placeholderPaths.push(objectPath);
    }
  }

  const copies = Array.from(desiredByPath.values()).filter(
    (image) =>
      image.sourcePath !== image.destinationPath &&
      !storagePaths.has(image.destinationPath)
  );
  const missingSources = copies.filter(
    (image) => !storagePaths.has(image.sourcePath)
  );
  if (missingSources.length > 0) {
    throw new Error(
      `Refusing sync because source objects are missing: ${missingSources
        .map((image) => image.sourcePath)
        .join(", ")}`
    );
  }

  const existingByPath = new Map(
    existingRows.map((row) => [row.image_path, row])
  );
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<{
    id: string | number;
    payload: Record<string, unknown>;
  }> = [];
  const primaryByVerbId = new Map<string, string>();

  for (const image of desiredByPath.values()) {
    const payload = {
      noun_id: null,
      lemma: image.lemma,
      category: "verb",
      image_path: image.destinationPath,
      variant: `${canonicalName(image.lemma)}_${image.variantNumber}`,
      is_default: image.variantNumber === 1,
      is_premium: image.variantNumber !== 1,
    };
    const existing = existingByPath.get(image.destinationPath);
    if (!existing) {
      inserts.push(payload);
    } else if (
      existing.lemma !== payload.lemma ||
      existing.is_default !== payload.is_default ||
      existing.is_premium !== payload.is_premium ||
      existing.noun_id !== null
    ) {
      updates.push({ id: existing.id, payload });
    }

    if (image.variantNumber === 1) {
      primaryByVerbId.set(
        image.verbId,
        supabase.storage
          .from(BUCKET)
          .getPublicUrl(image.destinationPath).data.publicUrl
      );
    }
  }

  const primaryUpdates = verbs
    .filter(
      (verb) =>
        primaryByVerbId.has(verb.id) &&
        verb.image_id !== primaryByVerbId.get(verb.id)
    )
    .map((verb) => ({
      id: verb.id,
      imageUrl: primaryByVerbId.get(verb.id)!,
    }));

  const apply = process.argv.includes("--apply");
  const removePlaceholders = process.argv.includes("--remove-placeholders");
  console.log(
    JSON.stringify(
      {
        apply,
        removePlaceholders,
        verbRows: verbs.length,
        manifestImages: manifest.entries.filter(
          (entry) => entry.category === "verbs"
        ).length,
        canonicalImages: desiredByPath.size,
        canonicalCopies: copies.map((image) => ({
          source: image.sourcePath,
          destination: image.destinationPath,
        })),
        inserts: inserts.length,
        updates: updates.length,
        primaryImageUpdates: primaryUpdates.length,
        placeholderObjects: placeholderPaths,
      },
      null,
      2
    )
  );

  if (!apply) return;

  for (const copy of copies) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .copy(copy.sourcePath, copy.destinationPath);
    if (error) throw error;
  }
  for (let index = 0; index < inserts.length; index += 100) {
    const { error } = await supabase
      .from("vocab_images")
      .insert(inserts.slice(index, index + 100));
    if (error) throw error;
  }
  for (const update of updates) {
    const { error } = await supabase
      .from("vocab_images")
      .update(update.payload)
      .eq("id", update.id);
    if (error) throw error;
  }
  await updatePrimaryImages(supabase, primaryUpdates);

  if (removePlaceholders && placeholderPaths.length > 0) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .remove(placeholderPaths);
    if (error) throw error;
  }

  console.log(
    JSON.stringify({
      success: true,
      copied: copies.length,
      inserted: inserts.length,
      updated: updates.length,
      primaryImagesUpdated: primaryUpdates.length,
      placeholdersRemoved: removePlaceholders ? placeholderPaths.length : 0,
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
