import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

type NounRow = {
  id: string;
  lemma: string;
  themes: string[] | null;
};

type VocabImageRow = {
  noun_id: string;
  lemma: string;
  category: "noun";
  image_path: string;
  is_default: boolean;
  is_premium: boolean;
  variant: string;
};

const IMAGE_BUCKET = "vocab-images";

function normalize(value: string) {
  return String(value ?? "").trim().toLowerCase();
}

function underscore(value: string) {
  return normalize(value).replace(/\s+/g, "_");
}

function getSelectedTheme(row: NounRow, selectedThemes: string[]) {
  const rowThemes = (row.themes ?? []).map(normalize);
  return selectedThemes.find((theme) => rowThemes.includes(theme)) ?? rowThemes[0] ?? "";
}

async function listFolder(
  supabase: SupabaseClient,
  folderPath: string
) {
  const { data, error } = await supabase.storage.from(IMAGE_BUCKET).list(folderPath, {
    limit: 100,
  });

  if (error) {
    return [];
  }

  return data ?? [];
}

async function findExistingFolderBase(params: {
  supabase: SupabaseClient;
  lemma: string;
  theme: string;
  duplicateCount: number;
}) {
  const { supabase, lemma, theme, duplicateCount } = params;
  const lowerLemma = normalize(lemma);
  const lowerTheme = normalize(theme);
  const underscoredLemma = underscore(lemma);
  const underscoredTheme = underscore(theme);

  const candidates = new Set<string>();

  if (duplicateCount > 1) {
    candidates.add(`${lowerLemma}_${lowerTheme}`);
    candidates.add(`${underscoredLemma}_${lowerTheme}`);
    candidates.add(`${lowerLemma}_${underscoredTheme}`);
    candidates.add(`${underscoredLemma}_${underscoredTheme}`);
  }

  candidates.add(lowerLemma);
  candidates.add(underscoredLemma);

  for (const candidate of candidates) {
    const files = await listFolder(supabase, `nouns/${candidate}`);
    const pngs = files.filter((file: any) => /\.png$/i.test(String(file.name ?? "")));
    if (pngs.length > 0) {
      return {
        folderBase: candidate,
        files: pngs,
      };
    }
  }

  return null;
}

function buildVariantRows(params: {
  nounId: string;
  lemma: string;
  folderBase: string;
  files: Array<{ name: string }>;
}) {
  const { nounId, lemma, folderBase, files } = params;
  const lowerLemma = normalize(lemma);

  const parsed = files
    .map((file) => {
      const name = String(file.name ?? "");
      const match = name.match(/_(\d+)\.png$/i);
      const variantNumber = Number(match?.[1]);
      return Number.isFinite(variantNumber)
        ? { name, variantNumber }
        : null;
    })
    .filter((entry): entry is { name: string; variantNumber: number } => Boolean(entry))
    .sort((a, b) => a.variantNumber - b.variantNumber);

  return parsed.map<VocabImageRow>((entry) => ({
    noun_id: nounId,
    lemma: lowerLemma,
    category: "noun",
    image_path: `nouns/${folderBase}/${entry.name}`,
    is_default: entry.variantNumber === 1,
    is_premium: entry.variantNumber !== 1,
    variant: `${lowerLemma}_${entry.variantNumber}`,
  }));
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));

  const themesArg = process.argv[2];
  if (!themesArg) {
    throw new Error(
      "Usage: node --import tsx scripts/sync-theme-vocab-images.ts <theme1,theme2,...>"
    );
  }

  const selectedThemes = themesArg
    .split(",")
    .map((theme) => normalize(theme))
    .filter(Boolean);

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

  const { data: allNouns, error: allError } = await supabase
    .from("nouns")
    .select("id, lemma, themes");

  if (allError) throw allError;

  const relevantRows = (allNouns ?? []).filter((row) => {
    const rowThemes = (row.themes ?? []).map(normalize);
    return selectedThemes.some((theme) => rowThemes.includes(theme));
  }) as NounRow[];

  const duplicateCounts = new Map<string, number>();
  for (const row of allNouns ?? []) {
    const key = normalize(String(row.lemma ?? ""));
    duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
  }

  const rowsToInsert: VocabImageRow[] = [];
  const missing: Array<{ lemma: string; theme: string }> = [];

  for (const row of relevantRows) {
    const theme = getSelectedTheme(row, selectedThemes);
    const duplicateCount = duplicateCounts.get(normalize(row.lemma)) ?? 1;
    const existingFolder = await findExistingFolderBase({
      supabase,
      lemma: row.lemma,
      theme,
      duplicateCount,
    });

    if (!existingFolder) {
      missing.push({ lemma: row.lemma, theme });
      continue;
    }

    rowsToInsert.push(
      ...buildVariantRows({
        nounId: row.id,
        lemma: row.lemma,
        folderBase: existingFolder.folderBase,
        files: existingFolder.files as Array<{ name: string }>,
      })
    );
  }

  const nounIds = [...new Set(relevantRows.map((row) => row.id))];

  if (nounIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("vocab_images")
      .delete()
      .in("noun_id", nounIds);

    if (deleteError) {
      throw new Error(`Failed to delete existing vocab_images rows: ${deleteError.message}`);
    }
  }

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("vocab_images")
      .insert(rowsToInsert);

    if (insertError) {
      throw new Error(`Failed to insert vocab_images rows: ${insertError.message}`);
    }
  }

  console.log(
    JSON.stringify(
      {
        themes: selectedThemes,
        nounCount: relevantRows.length,
        insertedRowCount: rowsToInsert.length,
        missing,
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
