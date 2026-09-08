import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  getVocabularyStaticVariantPath,
  VOCABULARY_STATIC_VARIANT_WIDTHS,
  type VocabularyStaticVariantWidth,
} from "@/lib/images/storage";

const VOCABULARY_BUCKET = "vocab-images";

export type GeneratedVocabularyVariant = {
  width: VocabularyStaticVariantWidth;
  path: string;
  buffer: Buffer;
};

/**
 * Produces the three screen-delivery files from an untouched master image.
 * `inside` and `withoutEnlargement` preserve the full, transparent artwork.
 */
export async function generateVocabularyStaticVariants(
  sourcePath: string,
  source: Buffer,
): Promise<GeneratedVocabularyVariant[]> {
  return Promise.all(
    VOCABULARY_STATIC_VARIANT_WIDTHS.map(async (width) => ({
      width,
      path: getVocabularyStaticVariantPath(sourcePath, width),
      buffer: await sharp(source)
        .resize({
          width,
          height: width,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: width === 1024 ? 82 : 76, alphaQuality: 100 })
        .toBuffer(),
    })),
  );
}

export async function uploadVocabularyStaticVariants(
  supabase: SupabaseClient,
  sourcePath: string,
  source: Buffer,
  options: { force?: boolean } = {},
) {
  const variants = await generateVocabularyStaticVariants(sourcePath, source);
  const result = {
    created: 0,
    createdBytes: 0,
    skipped: 0,
    paths: variants.map((variant) => variant.path),
  };

  for (const variant of variants) {
    const upload = await supabase.storage.from(VOCABULARY_BUCKET).upload(
      variant.path,
      variant.buffer,
      {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: Boolean(options.force),
      },
    );

    if (!upload.error) {
      result.created += 1;
      result.createdBytes += variant.buffer.length;
      continue;
    }

    // Re-runs are intentionally harmless. Storage reports this condition when
    // an immutable derivative already exists and `upsert` is false.
    if (!options.force && /already exists|duplicate/i.test(upload.error.message)) {
      result.skipped += 1;
      continue;
    }

    throw new Error(`Could not upload static variant ${variant.path}: ${upload.error.message}`);
  }

  return result;
}
