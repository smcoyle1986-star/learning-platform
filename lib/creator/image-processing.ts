import sharp from "sharp";

import {
  CREATOR_ALLOWED_UPLOAD_MIME_TYPES,
  CREATOR_MAX_OUTPUT_DIMENSION,
  CREATOR_MAX_SOURCE_PIXELS,
  CREATOR_MAX_UPLOAD_BYTES,
} from "@/lib/creator/constants";

export class CreatorImageValidationError extends Error {
  constructor(message: string, public readonly status = 422) {
    super(message);
    this.name = "CreatorImageValidationError";
  }
}

function mimeTypeForFormat(format?: string) {
  if (format === "jpeg") return "image/jpeg";
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  return null;
}

export async function processCreatorImage(input: {
  buffer: Buffer;
  declaredMimeType: string;
}) {
  if (input.buffer.byteLength === 0) {
    throw new CreatorImageValidationError("The uploaded image is empty.", 400);
  }

  if (input.buffer.byteLength > CREATOR_MAX_UPLOAD_BYTES) {
    throw new CreatorImageValidationError("Images must be 10 MB or smaller.", 413);
  }

  if (!CREATOR_ALLOWED_UPLOAD_MIME_TYPES.has(input.declaredMimeType)) {
    throw new CreatorImageValidationError("Upload a JPEG, PNG, or WebP image.", 415);
  }

  try {
    const source = sharp(input.buffer, {
      failOn: "error",
      limitInputPixels: CREATOR_MAX_SOURCE_PIXELS,
      animated: false,
    });
    const metadata = await source.metadata();
    const detectedMimeType = mimeTypeForFormat(metadata.format);

    if (!detectedMimeType || !CREATOR_ALLOWED_UPLOAD_MIME_TYPES.has(detectedMimeType)) {
      throw new CreatorImageValidationError("The file is not a supported JPEG, PNG, or WebP image.", 415);
    }

    if (!metadata.width || !metadata.height) {
      throw new CreatorImageValidationError("The uploaded image has invalid dimensions.");
    }

    if (metadata.width * metadata.height > CREATOR_MAX_SOURCE_PIXELS) {
      throw new CreatorImageValidationError("The uploaded image has too many pixels.", 413);
    }

    const processed = await source
      .rotate()
      .resize({
        width: CREATOR_MAX_OUTPUT_DIMENSION,
        height: CREATOR_MAX_OUTPUT_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 88, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: processed.data,
      mimeType: "image/webp" as const,
      width: processed.info.width,
      height: processed.info.height,
    };
  } catch (error: unknown) {
    if (error instanceof CreatorImageValidationError) throw error;
    throw new CreatorImageValidationError("The uploaded file could not be read as an image.");
  }
}
