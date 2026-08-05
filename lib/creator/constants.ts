export const CREATOR_IMAGE_BUCKET = "creator-images";
export const CREATOR_IMAGE_URL_TTL_SECONDS = 15 * 60;
export const CREATOR_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const CREATOR_MAX_IMAGES_PER_ACCOUNT = 500;
export const CREATOR_MAX_STORAGE_BYTES_PER_ACCOUNT = 1024 * 1024 * 1024;
export const CREATOR_MAX_SOURCE_PIXELS = 40_000_000;
export const CREATOR_MAX_OUTPUT_DIMENSION = 1600;
export const CREATOR_ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
