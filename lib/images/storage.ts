const SUPABASE_PUBLIC_OBJECT_PATH = "/storage/v1/object/public/";
const VOCABULARY_BUCKET = "vocab-images";
export const VOCABULARY_STATIC_VARIANT_ROOT = "derived/v2";

export const VOCABULARY_STATIC_VARIANT_WIDTHS = [160, 480, 1024] as const;
export type VocabularyStaticVariantWidth = (typeof VOCABULARY_STATIC_VARIANT_WIDTHS)[number];

function parseVocabularyStorageUrl(value: string) {
  try {
    const url = new URL(value);
    const markerIndex = url.pathname.indexOf(SUPABASE_PUBLIC_OBJECT_PATH);
    if (!url.hostname.endsWith("supabase.co") || markerIndex === -1) return null;

    const objectPath = url.pathname.slice(markerIndex + SUPABASE_PUBLIC_OBJECT_PATH.length);
    const [bucket] = objectPath.split("/");
    if (bucket !== VOCABULARY_BUCKET) return null;

    const sourcePath = objectPath.slice(`${VOCABULARY_BUCKET}/`.length);
    if (!sourcePath || sourcePath.startsWith("derived/")) return null;

    return { url, sourcePath };
  } catch {
    return null;
  }
}

export function getVocabularyStaticVariantPath(
  sourcePath: string,
  width: VocabularyStaticVariantWidth,
) {
  const normalized = sourcePath.replace(/^\/+/, "");
  const extensionIndex = normalized.lastIndexOf(".");
  const stem = extensionIndex > normalized.lastIndexOf("/")
    ? normalized.slice(0, extensionIndex)
    : normalized;
  return `${VOCABULARY_STATIC_VARIANT_ROOT}/${stem}-${width}.webp`;
}

function nearestStaticVariantWidth(width: number): VocabularyStaticVariantWidth {
  const requested = Math.max(1, Math.round(width));
  return VOCABULARY_STATIC_VARIANT_WIDTHS.find((candidate) => candidate >= requested)
    ?? VOCABULARY_STATIC_VARIANT_WIDTHS[VOCABULARY_STATIC_VARIANT_WIDTHS.length - 1];
}

/**
 * Returns a normal public Storage object URL for a pre-generated WebP asset.
 * The original PNG remains the master artwork and is used as the runtime
 * fallback while a newly-added variant is still being generated.
 */
export function getStaticVocabularyImageUrl(source: string, width: number) {
  const parsed = parseVocabularyStorageUrl(source);
  if (!parsed) return null;

  const staticWidth = nearestStaticVariantWidth(width);
  const next = new URL(parsed.url.origin);
  next.pathname = `${SUPABASE_PUBLIC_OBJECT_PATH}${VOCABULARY_BUCKET}/${getVocabularyStaticVariantPath(parsed.sourcePath, staticWidth)}`;
  return next.toString();
}

function getLandingProxyTransformUrl(source: string, width: number, quality: number) {
  if (!source.startsWith("/api/landing-image")) return null;
  const separator = source.includes("?") ? "&" : "?";
  return `${source}${separator}width=${Math.round(width)}&quality=${quality}&format=webp`;
}

export function getResponsiveImageUrl(source: string, width: number, quality = 72) {
  return (
    getStaticVocabularyImageUrl(source, width) ??
    getLandingProxyTransformUrl(source, width, quality)
  );
}

// Keep existing callers source-compatible while vocabulary consumers move to
// static assets. This name can be removed after all older callers are updated.
export const getOptimizedImageUrl = getResponsiveImageUrl;
