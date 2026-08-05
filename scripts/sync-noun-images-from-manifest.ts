import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const MANIFEST_PATH = path.join(
  process.cwd(),
  "migration",
  "vocab-storage-transfer-manifest.json"
);

type NounRow = {
  id: string;
  lemma: string;
  image_id: string | null;
  themes: string[] | null;
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

type ImageFile = {
  path: string;
  folder: string;
  fileName: string;
  prefix: string;
  variantNumber: number;
};

const AMBIGUOUS_FOLDER_BY_THEME: Record<
  string,
  Record<string, string>
> = {
  chair: {
    classroom: "chair",
    "furniture & home": "chair_furniture",
  },
  chicken: {
    animals: "chicken_animal",
    "food & drinks": "chicken_food",
  },
  christmas: {
    time: "christmas_dates",
    "holidays & events": "christmas_holidays",
  },
  cold: {
    health: "cold_health",
    weather: "cold_weather",
  },
  computer: {
    classroom: "computer",
    "furniture & home": "computer_furniture",
  },
  dentist: {
    jobs: "dentist",
    "buildings & places": "dentist_places",
  },
  desk: {
    classroom: "desk",
    "furniture & home": "desk_furniture",
  },
  fish: {
    animals: "fish",
    "food & drinks": "fish_food",
  },
  halloween: {
    time: "halloween_dates",
    "holidays & events": "halloween_holidays",
  },
  lake: {
    nature: "lake_nature",
    "buildings & places": "lake_place",
  },
  river: {
    nature: "river_nature",
    "buildings & places": "river_place",
  },
  scissors: {
    classroom: "scissors",
    kitchen: "scissors_utensils",
  },
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

function getAmbiguousFolder(noun: NounRow) {
  const lemma = noun.lemma.trim().toLowerCase();
  const foldersByTheme = AMBIGUOUS_FOLDER_BY_THEME[lemma];
  if (!foldersByTheme) return null;

  for (const theme of noun.themes ?? []) {
    const folder = foldersByTheme[String(theme).trim().toLowerCase()];
    if (folder) return folder;
  }
  return null;
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

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as {
    transferSafe: boolean;
    entries: Array<{
      category: string;
      destinationPath: string;
      action: string;
    }>;
  };
  if (
    !manifest.transferSafe ||
    manifest.entries.some((entry) => entry.action !== "skip_verified")
  ) {
    throw new Error("Refusing sync until every manifest image is skip_verified.");
  }

  const imageFiles: ImageFile[] = manifest.entries
    .filter((entry) => entry.category === "nouns")
    .map((entry) => {
      const [, folder, fileName] = entry.destinationPath.split("/");
      const extension = path.posix.extname(fileName);
      const stem = path.posix.basename(fileName, extension);
      const match = stem.match(/^(.*)_(\d+)$/);
      if (!match) return null;
      return {
        path: entry.destinationPath,
        folder,
        fileName,
        prefix: match[1],
        variantNumber: Number(match[2]),
      };
    })
    .filter((entry): entry is ImageFile => Boolean(entry));

  const filesByFolder = new Map<string, ImageFile[]>();
  for (const file of imageFiles) {
    const rows = filesByFolder.get(file.folder) ?? [];
    rows.push(file);
    filesByFolder.set(file.folder, rows);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const nouns = await readAll<NounRow>(async (offset) => {
    const result = await supabase
      .from("nouns")
      .select("id, lemma, image_id, themes")
      .range(offset, offset + 999);
    return { data: result.data as NounRow[] | null, error: result.error };
  });
  const existingRows = await readAll<VocabImageRow>(async (offset) => {
    const result = await supabase
      .from("vocab_images")
      .select(
        "id, noun_id, lemma, category, image_path, variant, is_default, is_premium"
      )
      .eq("category", "noun")
      .range(offset, offset + 999);
    return { data: result.data as VocabImageRow[] | null, error: result.error };
  });

  const existingByNounId = new Map<string, VocabImageRow[]>();
  for (const row of existingRows) {
    if (!row.noun_id) continue;
    const rows = existingByNounId.get(row.noun_id) ?? [];
    rows.push(row);
    existingByNounId.set(row.noun_id, rows);
  }

  const lemmaCounts = new Map<string, number>();
  nouns.forEach((noun) => {
    const key = noun.lemma.trim().toLowerCase();
    lemmaCounts.set(key, (lemmaCounts.get(key) ?? 0) + 1);
  });

  const plannedRows: Array<{
    noun: NounRow;
    file: ImageFile;
    variant: string;
    isDefault: boolean;
    isPremium: boolean;
  }> = [];
  const skipped: Array<{ lemma: string; reason: string }> = [];
  const ambiguousOnly = process.argv.includes("--ambiguous-only");
  const desiredFolderByNounId = new Map<string, string>();

  for (const noun of nouns) {
    const lemma = noun.lemma.trim().toLowerCase();
    if (ambiguousOnly && !AMBIGUOUS_FOLDER_BY_THEME[lemma]) continue;
    const lemmaKey = canonicalName(lemma);
    const existing = existingByNounId.get(noun.id) ?? [];
    const existingFolders = Array.from(
      new Set(
        existing
          .map((row) => row.image_path.split("/")[1])
          .filter((folder) => filesByFolder.has(folder))
      )
    );
    const prefixFolders = Array.from(filesByFolder.entries())
      .filter(([, files]) => files.some((file) => file.prefix === lemmaKey))
      .map(([folder]) => folder);

    let folder: string | null = getAmbiguousFolder(noun);
    if (folder && !filesByFolder.has(folder)) {
      skipped.push({
        lemma: noun.lemma,
        reason: `Configured folder ${folder} is missing`,
      });
      continue;
    }
    if (!folder && existingFolders.length === 1) {
      folder = existingFolders[0];
    } else if (!folder && prefixFolders.length === 1) {
      folder = prefixFolders[0];
    } else if (
      !folder &&
      (lemmaCounts.get(lemma) ?? 0) === 1 &&
      filesByFolder.has(lemmaKey)
    ) {
      folder = lemmaKey;
    }

    if (!folder) {
      skipped.push({ lemma: noun.lemma, reason: "No unambiguous image folder" });
      continue;
    }
    desiredFolderByNounId.set(noun.id, folder);

    const folderFiles = filesByFolder.get(folder) ?? [];
    const directFiles = folderFiles.filter((file) => file.prefix === lemmaKey);
    const existingPrefixes = new Set(
      existing.map((row) => {
        const fileName = row.image_path.split("/").at(-1) ?? "";
        return fileName.replace(/\.[^.]+$/, "").replace(/_\d+$/, "");
      })
    );
    const existingPrefixFiles = folderFiles.filter((file) =>
      existingPrefixes.has(file.prefix)
    );
    const distinctPrefixes = new Set(folderFiles.map((file) => file.prefix));
    const selectedFiles =
      directFiles.length > 0
        ? directFiles
        : existingPrefixFiles.length > 0
          ? existingPrefixFiles
          : distinctPrefixes.size === 1
            ? folderFiles
            : [];

    if (selectedFiles.length === 0) {
      skipped.push({ lemma: noun.lemma, reason: `Ambiguous files in ${folder}` });
      continue;
    }

    selectedFiles
      .sort((left, right) => left.variantNumber - right.variantNumber)
      .forEach((file) => {
        plannedRows.push({
          noun,
          file,
          variant: `${lemma}_${file.variantNumber}`,
          isDefault: file.variantNumber === 1,
          isPremium: file.variantNumber !== 1,
        });
      });
  }

  const updates: Array<{
    id: string | number;
    payload: Record<string, unknown>;
  }> = [];
  const inserts: Array<Record<string, unknown>> = [];
  const deletes: Array<{
    id: string | number;
    nounId: string;
    lemma: string;
    imagePath: string;
  }> = [];
  const defaultUpdates = new Map<string, string>();
  const desiredPathsByNounId = new Map<string, Set<string>>();
  const claimedExistingIds = new Set<string>();

  for (const planned of plannedRows) {
    const desiredPaths =
      desiredPathsByNounId.get(planned.noun.id) ?? new Set<string>();
    desiredPaths.add(planned.file.path);
    desiredPathsByNounId.set(planned.noun.id, desiredPaths);

    const rows = existingByNounId.get(planned.noun.id) ?? [];
    const existing =
      rows.find((row) => row.variant === planned.variant) ??
      rows.find((row) => row.image_path === planned.file.path);
    const payload = {
      noun_id: planned.noun.id,
      lemma: planned.noun.lemma.trim().toLowerCase(),
      category: "noun",
      image_path: planned.file.path,
      variant: planned.variant,
      is_default: planned.isDefault,
      is_premium: planned.isPremium,
    };

    if (existing) {
      claimedExistingIds.add(String(existing.id));
      if (
        existing.image_path !== payload.image_path ||
        existing.variant !== payload.variant ||
        existing.is_default !== payload.is_default ||
        existing.is_premium !== payload.is_premium
      ) {
        updates.push({ id: existing.id, payload });
      }
    } else {
      inserts.push(payload);
    }

    if (planned.isDefault) {
      const imageUrl = supabase.storage
        .from("vocab-images")
        .getPublicUrl(planned.file.path).data.publicUrl;
      if (planned.noun.image_id !== imageUrl) {
        defaultUpdates.set(planned.noun.id, imageUrl);
      }
    }
  }

  for (const [nounId, desiredPaths] of desiredPathsByNounId) {
    const desiredFolder = desiredFolderByNounId.get(nounId);
    for (const row of existingByNounId.get(nounId) ?? []) {
      const existingFolder = row.image_path.split("/")[1] ?? "";
      if (
        desiredFolder &&
        existingFolder !== desiredFolder &&
        !desiredPaths.has(row.image_path) &&
        !claimedExistingIds.has(String(row.id))
      ) {
        deletes.push({
          id: row.id,
          nounId,
          lemma: row.lemma,
          imagePath: row.image_path,
        });
      }
    }
  }

  const apply = process.argv.includes("--apply");
  const verbose = process.argv.includes("--verbose");
  console.log(
    JSON.stringify(
      {
        apply,
        ambiguousOnly,
        nounRows: nouns.length,
        mappedNouns: new Set(plannedRows.map((row) => row.noun.id)).size,
        skippedNouns: skipped.length,
        desiredImageRows: plannedRows.length,
        inserts: inserts.length,
        updates: updates.length,
        deletes: deletes.length,
        defaultImageUpdates: defaultUpdates.size,
        skipped,
        ...(verbose
          ? {
              changes: {
                inserts,
                updates,
                deletes,
              },
            }
          : {}),
      },
      null,
      2
    )
  );

  if (!apply) return;

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

  for (let index = 0; index < deletes.length; index += 100) {
    const { error } = await supabase
      .from("vocab_images")
      .delete()
      .in(
        "id",
        deletes.slice(index, index + 100).map((row) => row.id)
      );
    if (error) throw error;
  }

  for (const [nounId, imageUrl] of defaultUpdates) {
    const { error } = await supabase
      .from("nouns")
      .update({ image_id: imageUrl })
      .eq("id", nounId);
    if (error) throw error;
  }

  console.log(
    JSON.stringify({
      success: true,
      inserted: inserts.length,
      updated: updates.length,
      deleted: deletes.length,
      defaultsUpdated: defaultUpdates.size,
    })
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
