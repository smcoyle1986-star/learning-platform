import fs from "node:fs";
import path from "node:path";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const MANIFEST_PATH = path.join(
  process.cwd(),
  "migration",
  "vocab-storage-transfer-manifest.json"
);

type CategorySpec = {
  manifestCategory: "adjectives" | "prepositions" | "phonics";
  databaseCategory: "adjective" | "preposition" | "phonics";
  table: "adjectives" | "prepositions" | "phonics";
};

const CATEGORY_SPECS: CategorySpec[] = [
  {
    manifestCategory: "adjectives",
    databaseCategory: "adjective",
    table: "adjectives",
  },
  {
    manifestCategory: "prepositions",
    databaseCategory: "preposition",
    table: "prepositions",
  },
  {
    manifestCategory: "phonics",
    databaseCategory: "phonics",
    table: "phonics",
  },
];

type VocabularyRow = {
  id: string;
  lemma: string;
  image_id: string | null;
};

type VocabImageRow = {
  id: number | string;
  noun_id: string | null;
  lemma: string;
  category: string;
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

type ImageFile = {
  path: string;
  folder: string;
  fileName: string;
  variantNumber: number | null;
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

function displayName(folder: string) {
  return folder.replaceAll("_", " ");
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

function resolveVocabularyRow(
  spec: CategorySpec,
  folder: string,
  rowsByCanonicalLemma: Map<string, VocabularyRow>
) {
  const exact = rowsByCanonicalLemma.get(canonicalName(folder));
  if (exact) return exact;

  if (spec.manifestCategory === "phonics" && /^[a-z]$/.test(folder)) {
    return rowsByCanonicalLemma.get(`${folder}${folder}`) ?? null;
  }

  if (spec.manifestCategory === "adjectives" && folder === "medium_length") {
    return rowsByCanonicalLemma.get("medium_length_hair") ?? null;
  }

  return null;
}

function resolveImageLemma(
  spec: CategorySpec,
  folder: string,
  vocabularyRow: VocabularyRow | null
) {
  if (vocabularyRow) return vocabularyRow.lemma;
  if (spec.manifestCategory === "adjectives") return displayName(folder);
  return null;
}

async function updatePrimaryImages(
  supabase: SupabaseClient,
  table: CategorySpec["table"],
  updates: Array<{ id: string; imageUrl: string }>
) {
  for (let index = 0; index < updates.length; index += 20) {
    const batch = updates.slice(index, index + 20);
    await Promise.all(
      batch.map(async (update) => {
        const { error } = await supabase
          .from(table)
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

  const apply = process.argv.includes("--apply");
  const report: Record<string, unknown> = { apply, categories: {} };

  for (const spec of CATEGORY_SPECS) {
    const vocabularyRows = await readAll<VocabularyRow>(async (offset) => {
      const result = await supabase
        .from(spec.table)
        .select("id, lemma, image_id")
        .range(offset, offset + 999);
      return {
        data: result.data as VocabularyRow[] | null,
        error: result.error,
      };
    });
    const existingRows = await readAll<VocabImageRow>(async (offset) => {
      const result = await supabase
        .from("vocab_images")
        .select(
          "id, noun_id, lemma, category, image_path, variant, is_default, is_premium"
        )
        .eq("category", spec.databaseCategory)
        .range(offset, offset + 999);
      return {
        data: result.data as VocabImageRow[] | null,
        error: result.error,
      };
    });

    const rowsByCanonicalLemma = new Map(
      vocabularyRows.map((row) => [canonicalName(row.lemma), row])
    );
    const filesByFolder = new Map<string, ImageFile[]>();
    for (const entry of manifest.entries.filter(
      (candidate) => candidate.category === spec.manifestCategory
    )) {
      const [, folder, fileName] = entry.destinationPath.split("/");
      const extension = path.posix.extname(fileName);
      const stem = path.posix.basename(fileName, extension);
      const variantMatch = stem.match(/_(\d+)$/);
      const file: ImageFile = {
        path: entry.destinationPath,
        folder,
        fileName,
        variantNumber: variantMatch ? Number(variantMatch[1]) : null,
      };
      const files = filesByFolder.get(folder) ?? [];
      files.push(file);
      filesByFolder.set(folder, files);
    }

    const existingByPath = new Map(
      existingRows.map((row) => [row.image_path, row])
    );
    const inserts: Array<Record<string, unknown>> = [];
    const updates: Array<{
      id: string | number;
      payload: Record<string, unknown>;
    }> = [];
    const primaryUpdates: Array<{ id: string; imageUrl: string }> = [];
    const unmappedFolders: string[] = [];

    for (const [folder, unsortedFiles] of filesByFolder) {
      const vocabularyRow = resolveVocabularyRow(
        spec,
        folder,
        rowsByCanonicalLemma
      );
      const lemma = resolveImageLemma(spec, folder, vocabularyRow);
      if (!lemma) {
        unmappedFolders.push(folder);
        continue;
      }

      const files = [...unsortedFiles].sort((left, right) => {
        const leftVariant = left.variantNumber ?? 1;
        const rightVariant = right.variantNumber ?? 1;
        return (
          leftVariant - rightVariant ||
          left.fileName.localeCompare(right.fileName)
        );
      });

      files.forEach((file, index) => {
        const payload = {
          noun_id: null,
          lemma,
          category: spec.databaseCategory,
          image_path: file.path,
          variant: `${canonicalName(lemma)}_${index + 1}`,
          is_default: index === 0,
          is_premium: index !== 0,
        };
        const existing = existingByPath.get(file.path);
        if (!existing) {
          inserts.push(payload);
          return;
        }
        if (
          existing.lemma !== payload.lemma ||
          existing.variant !== payload.variant ||
          existing.is_default !== payload.is_default ||
          existing.is_premium !== payload.is_premium ||
          existing.noun_id !== null
        ) {
          updates.push({ id: existing.id, payload });
        }
      });

      if (vocabularyRow && files[0]) {
        const imageUrl = supabase.storage
          .from("vocab-images")
          .getPublicUrl(files[0].path).data.publicUrl;
        if (vocabularyRow.image_id !== imageUrl) {
          primaryUpdates.push({ id: vocabularyRow.id, imageUrl });
        }
      }
    }

    (report.categories as Record<string, unknown>)[spec.databaseCategory] = {
      vocabularyRows: vocabularyRows.length,
      storageFolders: filesByFolder.size,
      desiredImageRows:
        Array.from(filesByFolder.values()).reduce(
          (total, files) => total + files.length,
          0
        ) -
        unmappedFolders.reduce(
          (total, folder) => total + (filesByFolder.get(folder)?.length ?? 0),
          0
        ),
      inserts: inserts.length,
      updates: updates.length,
      primaryImageUpdates: primaryUpdates.length,
      unmappedFolders,
    };

    if (!apply) continue;

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
    await updatePrimaryImages(supabase, spec.table, primaryUpdates);
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
