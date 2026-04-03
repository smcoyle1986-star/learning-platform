import sharp from "sharp";

type ImageStats = {
  width: number;
  height: number;
  hasAlpha: boolean;
  transparentPixels: number;
  totalPixels: number;
  edgeTransparentRatio: number;
};

export async function downloadImageBuffer(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to download image (${response.status}) from ${url}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function readImageStats(buffer: Buffer): Promise<ImageStats> {
  const image = sharp(buffer).ensureAlpha();
  const metadata = await image.metadata();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  let transparentPixels = 0;
  let edgeTransparentPixels = 0;
  let edgePixels = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const alphaIndex = (y * info.width + x) * info.channels + 3;
      const alpha = data[alphaIndex];
      if (alpha < 250) transparentPixels += 1;

      const isEdge =
        x < 12 || y < 12 || x >= info.width - 12 || y >= info.height - 12;
      if (isEdge) {
        edgePixels += 1;
        if (alpha < 250) edgeTransparentPixels += 1;
      }
    }
  }

  return {
    width: metadata.width ?? info.width,
    height: metadata.height ?? info.height,
    hasAlpha: metadata.hasAlpha ?? info.channels === 4,
    transparentPixels,
    totalPixels: info.width * info.height,
    edgeTransparentRatio: edgePixels > 0 ? edgeTransparentPixels / edgePixels : 0,
  };
}

export async function assertUsableTransparency(buffer: Buffer) {
  const stats = await readImageStats(buffer);
  const transparentRatio = stats.transparentPixels / stats.totalPixels;

  if (!stats.hasAlpha) {
    throw new Error("Processed image does not contain an alpha channel.");
  }

  if (transparentRatio < 0.01) {
    throw new Error(
      `Processed image does not appear transparent enough (transparent ratio ${transparentRatio.toFixed(4)}).`
    );
  }

  if (stats.edgeTransparentRatio < 0.96) {
    throw new Error(
      `Processed image edge is not transparent enough (edge transparent ratio ${stats.edgeTransparentRatio.toFixed(4)}).`
    );
  }
}

export async function normalizeFlashcardPng(
  buffer: Buffer,
  options?: {
    maxSubjectSize?: number;
  }
) {
  const trimmed = sharp(buffer)
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 8 });

  const metadata = await trimmed.metadata();
  const subjectWidth = metadata.width ?? 1024;
  const subjectHeight = metadata.height ?? 1024;
  const maxSubjectSize = options?.maxSubjectSize ?? 992;
  const scale = Math.min(maxSubjectSize / subjectWidth, maxSubjectSize / subjectHeight, 1);

  const resized = await trimmed
    .resize({
      width: Math.max(1, Math.round(subjectWidth * scale)),
      height: Math.max(1, Math.round(subjectHeight * scale)),
      fit: "inside",
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  const resizedMetadata = await sharp(resized).metadata();
  const width = resizedMetadata.width ?? 0;
  const height = resizedMetadata.height ?? 0;
  const left = Math.floor((1024 - width) / 2);
  const top = Math.floor((1024 - height) / 2);

  const finalBuffer = await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resized, left, top }])
    .png()
    .toBuffer();

  await assertUsableTransparency(finalBuffer);

  return {
    buffer: finalBuffer,
    width: 1024,
    height: 1024,
  };
}
