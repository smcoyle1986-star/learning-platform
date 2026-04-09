import fs from "node:fs";
import path from "node:path";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import {
  buildNounImagePrompt,
} from "@/lib/noun-images/prompt-builder";
import {
  normalizeFlashcardPng,
} from "@/lib/noun-images/image-processing";
import {
  generateImageWithOpenAI,
} from "@/lib/noun-images/openai-image-client";
import {
  GeneratedNounImage,
  NounGenerationInput,
  NounVariantDefinition,
} from "@/lib/noun-images/types";
import {
  planNounImageVariants,
} from "@/lib/noun-images/planner";

const IMAGE_BUCKET = "vocab-images";
const IMAGE_CATEGORY = "noun";
const DEFAULT_LOCAL_IMAGE_ROOT = "/Users/Sean/Desktop/nouns-backup";

function getStorageRootFolder(category: string) {
  const normalized = category.trim().toLowerCase();
  if (normalized === "noun") return "nouns";
  if (normalized === "adjective") return "adjectives";
  if (normalized === "preposition") return "prepositions";
  if (normalized === "phonic") return "phonics";
  if (normalized === "verb") return "verbs";
  return normalized.endsWith("s") ? normalized : `${normalized}s`;
}

function getMaxSubjectSizeForVariant(variantDef: NounVariantDefinition) {
  if (variantDef.promptProfile === "family" || variantDef.promptProfile === "jobs") {
    return 860;
  }

  return 992;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry<T>(
  label: string,
  task: () => Promise<T>,
  attempts: number,
  delayMs: number
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        console.warn(`${label} failed on attempt ${attempt}/${attempts}`, error);
        await sleep(delayMs * attempt);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function buildStoragePath(
  lemma: string,
  variant: string,
  category: string,
  variantDef?: NounVariantDefinition
) {
  const rootFolder = getStorageRootFolder(category);

  if (lemma === "family friend") {
    return `${rootFolder}/family_friend/${variant.replaceAll("family friend", "family_friend")}.png`;
  }

  if (variantDef?.promptProfile === "holidays") {
    if (lemma === "christmas") {
      return `${rootFolder}/christmas_holidays/${variant.replaceAll("christmas", "christmas_holidays")}.png`;
    }

    if (lemma === "halloween") {
      return `${rootFolder}/halloween_holidays/${variant.replaceAll("halloween", "halloween_holidays")}.png`;
    }
  }

  if (variantDef?.promptProfile === "nature") {
    if (lemma === "lake") {
      return `${rootFolder}/lake_nature/${variant.replaceAll("lake", "lake_nature")}.png`;
    }

    if (lemma === "river") {
      return `${rootFolder}/river_nature/${variant.replaceAll("river", "river_nature")}.png`;
    }
  }

  return `${rootFolder}/${lemma}/${variant}.png`;
}

function getLocalImageRoot() {
  return process.env.LOCAL_IMAGE_ROOT?.trim() || DEFAULT_LOCAL_IMAGE_ROOT;
}

async function saveFinalImageLocally(params: {
  storagePath: string;
  buffer: Buffer;
}) {
  const root = getLocalImageRoot();
  const absolutePath = path.join(root, params.storagePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, params.buffer);
  return absolutePath;
}

async function uploadFinalImage(params: {
  path: string;
  buffer: Buffer;
}) {
  const supabase = getSupabaseAdmin();
  const upload = await supabase.storage.from(IMAGE_BUCKET).upload(params.path, params.buffer, {
    contentType: "image/png",
    upsert: true,
  });

  if (upload.error) {
    throw new Error(`Supabase storage upload failed: ${upload.error.message}`);
  }

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(params.path);
  return data.publicUrl;
}

async function upsertVocabImageRow(params: {
  nounId?: string;
  lemma: string;
  category: string;
  variant: string;
  imagePath: string;
  isDefault: boolean;
  isPremium: boolean;
}) {
  const supabase = getSupabaseAdmin();
  const payload = {
    noun_id: params.nounId ?? null,
    lemma: params.lemma,
    category: params.category,
    variant: params.variant,
    image_path: params.imagePath,
    is_default: params.isDefault,
    is_premium: params.isPremium,
  };

  let existingQuery = supabase
    .from("vocab_images")
    .select("id")
    .eq("category", params.category)
    .eq("variant", params.variant);

  if (params.nounId) {
    existingQuery = existingQuery.eq("noun_id", params.nounId);
  } else {
    existingQuery = existingQuery.eq("lemma", params.lemma).is("noun_id", null);
  }

  const { data: existingRows, error: existingError } = await existingQuery.limit(1);

  if (existingError) {
    throw new Error(`Failed to read existing vocab_images row: ${existingError.message}`);
  }

  const existing = existingRows?.[0];

  if (existing?.id) {
    const { error } = await supabase
      .from("vocab_images")
      .update(payload)
      .eq("id", existing.id);

    if (error) {
      throw new Error(`Failed to update vocab_images row: ${error.message}`);
    }

    return;
  }

  const { error } = await supabase.from("vocab_images").insert(payload);

  if (error) {
    throw new Error(`Failed to insert vocab_images row: ${error.message}`);
  }
}

async function getExistingVocabImage(params: {
  nounId?: string;
  lemma: string;
  category: string;
  variant: string;
}) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("vocab_images")
    .select("image_path, is_default, is_premium")
    .eq("category", params.category)
    .eq("variant", params.variant);

  if (params.nounId) {
    query = query.eq("noun_id", params.nounId);
  } else {
    query = query.eq("lemma", params.lemma).is("noun_id", null);
  }

  const { data, error } = await query.limit(1);

  if (error) {
    throw new Error(`Failed to read existing vocab_images row: ${error.message}`);
  }

  return data?.[0] ?? null;
}

async function processVariant(params: {
  nounId?: string;
  lemma: string;
  countability: NounGenerationInput["countability"];
  category: string;
  variantDef: NounVariantDefinition;
  overwriteExisting: boolean;
  uploadToSupabase: boolean;
}): Promise<GeneratedNounImage> {
  const { prompt, negativePrompt } = buildNounImagePrompt({
    lemma: params.lemma,
    countability: params.countability === "both" ? "count" : params.countability,
    variant: params.variantDef,
  });

  if (params.uploadToSupabase && !params.overwriteExisting) {
    const existing = await getExistingVocabImage({
      nounId: params.nounId,
      lemma: params.lemma,
      category: params.category,
      variant: params.variantDef.variant,
    });

    if (existing?.image_path) {
      const supabase = getSupabaseAdmin();
      const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(existing.image_path);
      return {
        lemma: params.lemma,
        nounId: params.nounId,
        countability: params.countability,
        category: params.category,
        variant: params.variantDef.variant,
        variantNumber: params.variantDef.variantNumber,
        imagePath: existing.image_path,
        publicUrl: data.publicUrl,
        isDefault: params.variantDef.isDefault,
        isPremium: params.variantDef.isPremium,
        prompt,
        width: 1024,
        height: 1024,
      };
    }
  }

  const generated = await retry(
    `OpenAI image generation for ${params.variantDef.variant}`,
    () =>
      generateImageWithOpenAI({
        prompt: [prompt, negativePrompt ? `Negative prompt guidance: ${negativePrompt}` : ""]
          .filter(Boolean)
          .join(". "),
        modelOverride: params.variantDef.modelOverride,
        qualityOverride: params.variantDef.qualityOverride,
        useStyleReference: params.variantDef.useStyleReference,
        styleReferencePath: params.variantDef.styleReferencePath,
      }),
    3,
    2_000
  );

  const transparentBuffer = await retry(
    `Transparent asset normalization for ${params.variantDef.variant}`,
    async () => {
      const normalized = await normalizeFlashcardPng(generated.imageBuffer, {
        maxSubjectSize: getMaxSubjectSizeForVariant(params.variantDef),
      });
      return normalized;
    },
    2,
    1_500
  );

  const storagePath = buildStoragePath(
    params.lemma,
    params.variantDef.variant,
    params.category,
    params.variantDef
  );
  const localPath = await saveFinalImageLocally({
    storagePath,
    buffer: transparentBuffer.buffer,
  });

  let publicUrl = localPath;

  if (params.uploadToSupabase) {
    publicUrl = await uploadFinalImage({
      path: storagePath,
      buffer: transparentBuffer.buffer,
    });

    await upsertVocabImageRow({
      nounId: params.nounId,
      lemma: params.lemma,
      category: params.category,
      variant: params.variantDef.variant,
      imagePath: storagePath,
      isDefault: params.variantDef.isDefault,
      isPremium: params.variantDef.isPremium,
    });
  }

  return {
    lemma: params.lemma,
    nounId: params.nounId,
    countability: params.countability,
    category: params.category,
    variant: params.variantDef.variant,
    variantNumber: params.variantDef.variantNumber,
    imagePath: storagePath,
    publicUrl,
    localPath,
    isDefault: params.variantDef.isDefault,
    isPremium: params.variantDef.isPremium,
    prompt,
    width: transparentBuffer.width,
    height: transparentBuffer.height,
  };
}

export async function generateNounImageSet(input: NounGenerationInput) {
  const nounId = input.nounId;
  const lemma = input.lemma.trim().toLowerCase();
  if (!lemma) {
    throw new Error("lemma is required");
  }

  const countability = input.countability;
  if (!countability) {
    throw new Error("countability is required");
  }

  const category = input.category ?? IMAGE_CATEGORY;
  const overwriteExisting = input.overwriteExisting ?? false;
  const uploadToSupabase = input.uploadToSupabase ?? false;
  let variantDefs = planNounImageVariants({
    lemma,
    countability,
  });
  if (input.variantNumbers?.length) {
    const allowed = new Set(input.variantNumbers);
    variantDefs = variantDefs.filter((variantDef) => allowed.has(variantDef.variantNumber));
  }
  const results: GeneratedNounImage[] = [];

  for (const variantDef of variantDefs) {
    const result = await processVariant({
      nounId,
      lemma,
      countability,
      category,
      variantDef,
      overwriteExisting,
      uploadToSupabase,
    });
    results.push(result);
  }

  return results;
}

export async function loadNounsForGeneration(limit?: number) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("nouns")
    .select("id, lemma, countability")
    .order("lemma", { ascending: true });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load nouns: ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    nounId: row.id,
    lemma: row.lemma,
    countability: row.countability,
  })) as NounGenerationInput[];
}

export async function loadNounsForTheme(theme: string, limit?: number) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("nouns")
    .select("id, lemma, countability, themes")
    .contains("themes", [theme])
    .order("lemma", { ascending: true });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load nouns for theme "${theme}": ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    nounId: row.id,
    lemma: row.lemma,
    countability: row.countability,
  })) as NounGenerationInput[];
}
