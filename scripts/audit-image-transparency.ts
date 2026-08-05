import fs from "node:fs";
import path from "node:path";

import sharp from "sharp";

const MANIFEST_PATH = path.join(
  process.cwd(),
  "migration",
  "vocab-storage-transfer-manifest.json"
);
const OUTPUT_PATH = path.join(
  process.cwd(),
  "migration",
  "image-transparency-audit.json"
);

type ManifestEntry = {
  category: string;
  sourcePath: string;
  destinationPath: string;
};

type AuditRow = {
  category: string;
  sourcePath: string;
  destinationPath: string;
  width: number;
  height: number;
  hasAlphaChannel: boolean;
  transparentFraction: number;
  semiTransparentFraction: number;
  whiteBorderFraction: number;
  nearWhiteBorderFraction: number;
  checkerboardScore: number;
  classification:
    | "transparent"
    | "opaque_white_background"
    | "possible_checkerboard"
    | "opaque_other";
};

function round(value: number) {
  return Math.round(value * 10000) / 10000;
}

function quantizedColor(red: number, green: number, blue: number) {
  const step = 16;
  return [
    Math.round(red / step) * step,
    Math.round(green / step) * step,
    Math.round(blue / step) * step,
  ].join(",");
}

async function auditImage(entry: ManifestEntry): Promise<AuditRow> {
  const metadata = await sharp(entry.sourcePath).metadata();
  const { data, info } = await sharp(entry.sourcePath)
    .ensureAlpha()
    .resize(96, 96, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let transparent = 0;
  let semiTransparent = 0;
  let whiteBorder = 0;
  let nearWhiteBorder = 0;
  let borderPixels = 0;
  const borderColors = new Map<string, number>();

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * 4;
      const red = data[offset];
      const green = data[offset + 1];
      const blue = data[offset + 2];
      const alpha = data[offset + 3];

      if (alpha < 16) transparent += 1;
      else if (alpha < 250) semiTransparent += 1;

      const isBorder =
        x < 6 || y < 6 || x >= info.width - 6 || y >= info.height - 6;
      if (!isBorder) continue;
      borderPixels += 1;

      if (red >= 248 && green >= 248 && blue >= 248) whiteBorder += 1;
      if (red >= 235 && green >= 235 && blue >= 235) nearWhiteBorder += 1;
      if (alpha >= 250) {
        const key = quantizedColor(red, green, blue);
        borderColors.set(key, (borderColors.get(key) ?? 0) + 1);
      }
    }
  }

  const totalPixels = info.width * info.height;
  const sortedBorderColors = Array.from(borderColors.entries()).sort(
    (left, right) => right[1] - left[1]
  );
  const topNeutralColors = sortedBorderColors
    .slice(0, 4)
    .filter(([key]) => {
      const [red, green, blue] = key.split(",").map(Number);
      return (
        Math.max(red, green, blue) - Math.min(red, green, blue) <= 24 &&
        red >= 176 &&
        red <= 256
      );
    });
  const topTwoCoverage =
    (topNeutralColors[0]?.[1] ?? 0) / borderPixels +
    (topNeutralColors[1]?.[1] ?? 0) / borderPixels;
  const secondCoverage = (topNeutralColors[1]?.[1] ?? 0) / borderPixels;
  const checkerboardScore =
    topTwoCoverage >= 0.68 && secondCoverage >= 0.12
      ? topTwoCoverage
      : 0;

  const transparentFraction = transparent / totalPixels;
  const semiTransparentFraction = semiTransparent / totalPixels;
  const whiteBorderFraction = whiteBorder / borderPixels;
  const nearWhiteBorderFraction = nearWhiteBorder / borderPixels;
  const isTransparent =
    transparentFraction >= 0.005 || semiTransparentFraction >= 0.01;

  let classification: AuditRow["classification"] = "opaque_other";
  if (isTransparent) classification = "transparent";
  else if (checkerboardScore >= 0.68)
    classification = "possible_checkerboard";
  else if (whiteBorderFraction >= 0.72 || nearWhiteBorderFraction >= 0.84)
    classification = "opaque_white_background";

  return {
    category: entry.category,
    sourcePath: entry.sourcePath,
    destinationPath: entry.destinationPath,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    hasAlphaChannel: Boolean(metadata.hasAlpha),
    transparentFraction: round(transparentFraction),
    semiTransparentFraction: round(semiTransparentFraction),
    whiteBorderFraction: round(whiteBorderFraction),
    nearWhiteBorderFraction: round(nearWhiteBorderFraction),
    checkerboardScore: round(checkerboardScore),
    classification,
  };
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as {
    entries: ManifestEntry[];
  };
  const rows: AuditRow[] = [];
  const concurrency = 12;

  for (let index = 0; index < manifest.entries.length; index += concurrency) {
    const batch = manifest.entries.slice(index, index + concurrency);
    rows.push(...(await Promise.all(batch.map(auditImage))));
  }

  const counts = Object.fromEntries(
    Object.entries(Object.groupBy(rows, (row) => row.classification)).map(
      ([classification, classifiedRows]) => [
        classification,
        classifiedRows?.length ?? 0,
      ]
    )
  );
  const candidates = rows.filter(
    (row) =>
      row.classification === "opaque_white_background" ||
      row.classification === "possible_checkerboard"
  );
  const opaqueOther = rows.filter(
    (row) => row.classification === "opaque_other"
  );
  const report = {
    generatedAt: new Date().toISOString(),
    totalImages: rows.length,
    counts,
    candidateCount: candidates.length,
    candidates,
    opaqueOtherCount: opaqueOther.length,
    opaqueOther,
  };

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify(
      {
        output: OUTPUT_PATH,
        totalImages: rows.length,
        counts,
        candidateCount: candidates.length,
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
