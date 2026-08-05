import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import {
  nounImageOverrides,
  planNounImageVariants,
} from "@/lib/noun-images/planner";

const BUCKET = "vocab-images";
const MANIFEST_PATH = path.join(
  process.cwd(),
  "migration",
  "vocab-storage-transfer-manifest.json"
);
const REPORT_PATH = path.join(
  process.cwd(),
  "migration",
  "missing-noun-images-audit.json"
);

type StorageEntry = {
  name: string;
  id?: string | null;
};

type NounRow = {
  id: string;
  lemma: string;
  countability: "count" | "uncount" | "both" | null;
  themes: string[] | null;
  image_id: string | null;
};

type VocabImageRow = {
  id: string | number;
  noun_id: string | null;
  image_path: string;
  variant: string | null;
  is_default: boolean;
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

function isImageFile(fileName: string) {
  return /\.(png|jpe?g|webp)$/i.test(fileName);
}

function variantNumber(value: string | null | undefined) {
  const match = String(value ?? "").match(/_(\d+)(?:\.[^.]+)?$/);
  const number = Number(match?.[1]);
  return Number.isInteger(number) && number > 0 ? number : null;
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

function storagePathFromPublicUrl(value: string | null) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = String(value ?? "").indexOf(marker);
  return index >= 0
    ? decodeURIComponent(String(value).slice(index + marker.length).split("?")[0])
    : null;
}

async function readAll<T>(
  queryPage: (
    offset: number
  ) => Promise<{ data: T[] | null; error: Error | null }>
) {
  const rows: T[] = [];
  for (let offset = 0; ; offset += 1_000) {
    const { data, error } = await queryPage(offset);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < 1_000) break;
  }
  return rows;
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bucket = supabase.storage.from(BUCKET);

  async function listAll(folder: string) {
    const rows: StorageEntry[] = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await bucket.list(folder, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw error;
      const batch = (data ?? []) as StorageEntry[];
      rows.push(...batch);
      if (batch.length < 100) break;
    }
    return rows;
  }

  const topLevel = await listAll("nouns");
  const folders = topLevel
    .map((entry) => entry.name)
    .filter((name) => name && !isImageFile(name));
  const storageFilesByFolder = new Map<string, string[]>();
  const concurrency = 12;

  for (let index = 0; index < folders.length; index += concurrency) {
    const batch = folders.slice(index, index + concurrency);
    const results = await Promise.all(
      batch.map(async (folder) => {
        const files = (await listAll(`nouns/${folder}`))
          .map((entry) => entry.name)
          .filter(isImageFile)
          .map((fileName) => `nouns/${folder}/${fileName}`);
        return [folder, files] as const;
      })
    );
    results.forEach(([folder, files]) => {
      storageFilesByFolder.set(folder, files);
    });
  }

  const storagePaths = new Set(
    Array.from(storageFilesByFolder.values()).flat()
  );
  const nouns = await readAll<NounRow>(async (offset) => {
    const result = await supabase
      .from("nouns")
      .select("id,lemma,countability,themes,image_id")
      .range(offset, offset + 999);
    return { data: result.data as NounRow[] | null, error: result.error };
  });
  const vocabImages = await readAll<VocabImageRow>(async (offset) => {
    const result = await supabase
      .from("vocab_images")
      .select("id,noun_id,image_path,variant,is_default")
      .eq("category", "noun")
      .range(offset, offset + 999);
    return {
      data: result.data as VocabImageRow[] | null,
      error: result.error,
    };
  });

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as {
    entries: Array<{
      category: string;
      destinationPath: string;
      sourcePath: string;
    }>;
  };
  const localEntries = manifest.entries.filter(
    (entry) => entry.category === "nouns"
  );
  const localPaths = new Set(
    localEntries.map((entry) => entry.destinationPath)
  );

  const databaseReferencesMissingFromStorage = vocabImages
    .filter((row) => row.image_path && !storagePaths.has(row.image_path))
    .map((row) => ({
      id: row.id,
      nounId: row.noun_id,
      imagePath: row.image_path,
      variant: row.variant,
      isDefault: row.is_default,
    }));

  const nounDefaultsMissingFromStorage = nouns.flatMap((noun) => {
    const imagePath = storagePathFromPublicUrl(noun.image_id);
    if (!imagePath || storagePaths.has(imagePath)) return [];
    return [
      {
        nounId: noun.id,
        lemma: noun.lemma,
        themes: noun.themes,
        imagePath,
      },
    ];
  });

  const storageNumberingGaps = Array.from(storageFilesByFolder.entries())
    .flatMap(([folder, files]) => {
      const numbers = Array.from(
        new Set(
          files
            .map((filePath) => variantNumber(filePath))
            .filter((number): number is number => number !== null)
        )
      ).sort((left, right) => left - right);
      if (numbers.length < 2) return [];
      const missing = [];
      for (
        let number = numbers[0] + 1;
        number < numbers[numbers.length - 1];
        number += 1
      ) {
        if (!numbers.includes(number)) missing.push(number);
      }
      return missing.length > 0
        ? [{ folder, presentVariants: numbers, missingVariants: missing }]
        : [];
    });

  const databaseNumberingGaps = Object.entries(
    Object.groupBy(
      vocabImages.filter((row) => row.noun_id),
      (row) => String(row.noun_id)
    )
  ).flatMap(([nounId, rows]) => {
    const numbers = Array.from(
      new Set(
        (rows ?? [])
          .map((row) => variantNumber(row.variant ?? row.image_path))
          .filter((number): number is number => number !== null)
      )
    ).sort((left, right) => left - right);
    if (numbers.length < 2) return [];
    const missing = [];
    for (
      let number = numbers[0] + 1;
      number < numbers[numbers.length - 1];
      number += 1
    ) {
      if (!numbers.includes(number)) missing.push(number);
    }
    const noun = nouns.find((row) => row.id === nounId);
    return missing.length > 0
      ? [
          {
            nounId,
            lemma: noun?.lemma ?? null,
            themes: noun?.themes ?? null,
            presentVariants: numbers,
            missingVariants: missing,
          },
        ]
      : [];
  });

  const localFilesMissingFromStorage = localEntries
    .filter((entry) => !storagePaths.has(entry.destinationPath))
    .map((entry) => ({
      destinationPath: entry.destinationPath,
      sourcePath: entry.sourcePath,
      sourceExists: fs.existsSync(entry.sourcePath),
    }));
  const storageFilesMissingLocally = Array.from(storagePaths)
    .filter((storagePath) => !localPaths.has(storagePath))
    .sort();

  const rowsByNounId = Object.groupBy(
    vocabImages.filter((row) => row.noun_id),
    (row) => String(row.noun_id)
  );
  const plannerCandidates = nouns.flatMap((noun) => {
    const expected = planNounImageVariants({
      lemma: noun.lemma,
      countability: noun.countability ?? "count",
    }).map((variant) => variant.variantNumber);
    const nounImageRows = rowsByNounId[noun.id] ?? [];
    const mapped = Array.from(
      new Set(
        nounImageRows
          .map((row) => variantNumber(row.variant ?? row.image_path))
          .filter((number): number is number => number !== null)
      )
    ).sort((left, right) => left - right);
    const mappedFolders = Array.from(
      new Set(
        nounImageRows
          .map((row) => row.image_path.split("/")[1])
          .filter(Boolean)
      )
    );
    const lemmaFolder = canonicalName(noun.lemma);
    const fallbackFolders = folders.filter((folder) => {
      if (folder === lemmaFolder) return true;
      return (storageFilesByFolder.get(folder) ?? []).some((filePath) => {
        const fileName = filePath.split("/").at(-1) ?? "";
        return fileName.replace(/\.[^.]+$/, "").replace(/_\d+$/, "") === lemmaFolder;
      });
    });
    const resolvedFolders =
      mappedFolders.length > 0
        ? mappedFolders
        : fallbackFolders.length === 1
          ? fallbackFolders
          : [];
    const storageVariants = Array.from(
      new Set(
        resolvedFolders
          .flatMap((folder) => storageFilesByFolder.get(folder) ?? [])
          .map(variantNumber)
          .filter((number): number is number => number !== null)
      )
    ).sort((left, right) => left - right);
    const missingMappings = expected.filter(
      (number) => !mapped.includes(number)
    );
    const missingFromStorage = expected.filter(
      (number) => !storageVariants.includes(number)
    );
    return missingMappings.length > 0 || missingFromStorage.length > 0
      ? [
          {
            nounId: noun.id,
            lemma: noun.lemma,
            themes: noun.themes,
            expectationSource: nounImageOverrides[
              noun.lemma.trim().toLowerCase()
            ]
              ? "explicit_override"
              : "inferred",
            expectedVariants: expected,
            mappedVariants: mapped,
            storageVariants,
            resolvedFolders,
            suggestedFolder: resolvedFolders[0] ?? lemmaFolder,
            missingMappings,
            missingFromStorage,
          },
        ]
      : [];
  });
  const generationCandidates = plannerCandidates.filter(
    (candidate) => candidate.missingFromStorage.length > 0
  );
  const mappingOnlyCandidates = plannerCandidates.filter(
    (candidate) =>
      candidate.missingMappings.length > 0 &&
      candidate.missingFromStorage.length === 0
  );

  const dentist = {
    storage: Array.from(storagePaths)
      .filter((storagePath) => storagePath.includes("/dentist"))
      .sort(),
    database: vocabImages
      .filter((row) => row.image_path.includes("/dentist"))
      .sort((left, right) => left.image_path.localeCompare(right.image_path)),
    local: localEntries
      .filter((entry) => entry.destinationPath.includes("/dentist"))
      .map((entry) => entry.destinationPath)
      .sort(),
  };

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      storageFolders: folders.length,
      storageImageFiles: storagePaths.size,
      nounRows: nouns.length,
      databaseImageRows: vocabImages.length,
      localManifestImages: localEntries.length,
      databaseReferencesMissingFromStorage:
        databaseReferencesMissingFromStorage.length,
      nounDefaultsMissingFromStorage: nounDefaultsMissingFromStorage.length,
      storageNumberingGaps: storageNumberingGaps.length,
      databaseNumberingGaps: databaseNumberingGaps.length,
      localFilesMissingFromStorage: localFilesMissingFromStorage.length,
      storageFilesMissingLocally: storageFilesMissingLocally.length,
      plannerCandidates: plannerCandidates.length,
      generationCandidates: generationCandidates.length,
      mappingOnlyCandidates: mappingOnlyCandidates.length,
    },
    dentist,
    definiteProblems: {
      databaseReferencesMissingFromStorage,
      nounDefaultsMissingFromStorage,
      storageNumberingGaps,
      databaseNumberingGaps,
      localFilesMissingFromStorage,
    },
    localBackupGaps: storageFilesMissingLocally,
    plannerCandidates,
    generationCandidates,
    mappingOnlyCandidates,
  };

  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report.summary, null, 2));
  console.log(JSON.stringify({ dentist }, null, 2));
  console.log(`Wrote ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
