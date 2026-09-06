const SUPABASE_PUBLIC_OBJECT_PATH = "/storage/v1/object/public/";
const SUPABASE_RENDER_PATH = "/storage/v1/render/image/public/";
const OPTIMIZABLE_BUCKETS = new Set(["vocab-images", "Classendo-images"]);

function parsePublicStorageUrl(value: string) {
  try {
    const url = new URL(value);
    const markerIndex = url.pathname.indexOf(SUPABASE_PUBLIC_OBJECT_PATH);
    if (!url.hostname.endsWith("supabase.co") || markerIndex === -1) return null;

    const objectPath = url.pathname.slice(markerIndex + SUPABASE_PUBLIC_OBJECT_PATH.length);
    const [bucket] = objectPath.split("/");
    if (!bucket || !OPTIMIZABLE_BUCKETS.has(bucket)) return null;

    return { url, objectPath };
  } catch {
    return null;
  }
}

/**
 * Returns a Supabase CDN transformation URL for public Classendo artwork.
 * Original images remain the source of truth; this only changes delivery size
 * and format for screen use.
 */
export function getOptimizedStorageImageUrl(
  source: string,
  width: number,
  quality = 72,
) {
  const parsed = parsePublicStorageUrl(source);
  if (!parsed) return null;

  const next = new URL(parsed.url.toString());
  next.pathname = `${SUPABASE_RENDER_PATH}${parsed.objectPath}`;
  next.searchParams.set("width", String(Math.round(width)));
  // Supabase defaults a one-dimensional transform to `cover`, which crops
  // square flashcard artwork into a portrait strip. `contain` preserves the
  // complete illustration while still serving a right-sized WebP asset.
  next.searchParams.set("resize", "contain");
  next.searchParams.set("quality", String(quality));
  next.searchParams.set("format", "webp");
  return next.toString();
}

function getLandingProxyTransformUrl(source: string, width: number, quality: number) {
  if (!source.startsWith("/api/landing-image")) return null;
  const separator = source.includes("?") ? "&" : "?";
  return `${source}${separator}width=${Math.round(width)}&quality=${quality}&format=webp`;
}

export function getOptimizedImageUrl(source: string, width: number, quality = 72) {
  return (
    getOptimizedStorageImageUrl(source, width, quality) ??
    getLandingProxyTransformUrl(source, width, quality)
  );
}
