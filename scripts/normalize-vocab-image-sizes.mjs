import fs from "node:fs";
import process from "node:process";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const CANVAS = 1024;
const SAMPLE = 256;
const BUCKET = "vocab-images";
const REPORT_PATH = "/private/tmp/classendo-image-normalization-report.json";
const APPLY = process.argv.includes("--apply");
const ONLY_PREVIOUSLY_CHANGED = process.argv.includes("--only-previously-changed");
const lemmaArgument = process.argv.find((argument) => argument.startsWith("--lemmas="));
const ONLY_LEMMAS = lemmaArgument ? new Set(lemmaArgument.slice("--lemmas=".length).split(",")) : null;

function loadEnv() {
  const env = {};
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index > 0) env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return env;
}

function publicObjectPath(url) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length).split("?")[0];
}

async function measure(buffer) {
  const { data } = await sharp(buffer)
    .resize(SAMPLE, SAMPLE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let minX = SAMPLE;
  let minY = SAMPLE;
  let maxX = -1;
  let maxY = -1;
  let ink = 0;
  let total = 0;

  for (let y = 1; y < SAMPLE - 1; y += 1) {
    for (let x = 1; x < SAMPLE - 1; x += 1) {
      const offset = (y * SAMPLE + x) * 4;
      const luma = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const brightness = luma(data[offset], data[offset + 1], data[offset + 2]);
      const left = luma(data[offset - 4], data[offset - 3], data[offset - 2]);
      const right = luma(data[offset + 4], data[offset + 5], data[offset + 6]);
      const up = luma(data[offset - SAMPLE * 4], data[offset - SAMPLE * 4 + 1], data[offset - SAMPLE * 4 + 2]);
      const down = luma(data[offset + SAMPLE * 4], data[offset + SAMPLE * 4 + 1], data[offset + SAMPLE * 4 + 2]);
      const edge = Math.abs(right - left) + Math.abs(down - up);

      if (brightness > 68 && edge > 22) {
        ink += 1;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
      total += 1;
    }
  }

  const width = maxX >= minX ? maxX - minX + 1 : 0;
  const height = maxY >= minY ? maxY - minY + 1 : 0;
  return {
    x: maxX >= minX ? (minX + maxX) / (2 * SAMPLE) : 0.5,
    y: maxY >= minY ? (minY + maxY) / (2 * SAMPLE) : 0.5,
    width: width / SAMPLE,
    height: height / SAMPLE,
    maxDimension: Math.max(width, height) / SAMPLE,
    area: (width * height) / (SAMPLE * SAMPLE),
    edgeCoverage: ink / total,
  };
}

function classify(table, metric) {
  const aspect = metric.width / Math.max(metric.height, 0.001);
  if (table === "phonics") return { category: "phonics", target: 0.7 };
  if (aspect >= 2.25 || aspect <= 0.45) return { category: "wide-or-tall", target: 0.84 };
  if (metric.edgeCoverage >= 0.3 || metric.area >= 0.75) return { category: "detailed-scene", target: 0.88 };
  if (metric.maxDimension < 0.72) return { category: "compact-illustration", target: 0.78 };
  return { category: "standard-illustration", target: 0.8 };
}

async function normalise(buffer, metric, scale) {
  const source = await sharp(buffer).resize(CANVAS, CANVAS).png().toBuffer();
  const scaledSize = Math.ceil(CANVAS * scale);
  const scaled = await sharp(source).resize(scaledSize, scaledSize).png().toBuffer();
  const cropLeft = Math.round(metric.x * scaledSize - CANVAS / 2);
  const cropTop = Math.round(metric.y * scaledSize - CANVAS / 2);
  const padLeft = Math.max(0, -cropLeft);
  const padTop = Math.max(0, -cropTop);
  const padRight = Math.max(0, cropLeft + CANVAS - scaledSize);
  const padBottom = Math.max(0, cropTop + CANVAS - scaledSize);

  const padded = await sharp({
    create: {
      width: scaledSize + padLeft + padRight,
      height: scaledSize + padTop + padBottom,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 1 },
    },
  })
    .composite([{ input: scaled, left: padLeft, top: padTop }])
    .png()
    .toBuffer();

  return sharp(padded)
    .extract({ left: cropLeft + padLeft, top: cropTop + padTop, width: CANVAS, height: CANVAS })
    .png()
    .toBuffer();
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const entries = [];

for (const table of ["nouns", "verbs", "adjectives", "phonics", "prepositions"]) {
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select("lemma,image_id").range(from, from + 999);
    if (error) throw error;
    entries.push(...data.filter((row) => row.image_id).map((row) => ({ table, lemma: row.lemma, url: row.image_id })));
    if (data.length < 1000) break;
  }
}

let images = [...new Map(entries.map((entry) => [entry.url, entry])).values()]
  .map((entry) => ({ ...entry, objectPath: publicObjectPath(entry.url) }))
  .filter((entry) => entry.objectPath);

if (ONLY_PREVIOUSLY_CHANGED) {
  const previous = JSON.parse(fs.readFileSync(REPORT_PATH, "utf8"));
  const paths = new Set(previous.report.filter((entry) => entry.changed).map((entry) => entry.objectPath));
  images = images.filter((entry) => paths.has(entry.objectPath));
}
if (ONLY_LEMMAS) images = images.filter((entry) => ONLY_LEMMAS.has(entry.lemma));

const pending = [...images];
const report = [];
const concurrency = 12;

await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (pending.length) {
      const entry = pending.pop();
      try {
        const response = await fetch(entry.url);
        if (!response.ok) throw new Error(`Download failed: ${response.status}`);
        const original = Buffer.from(await response.arrayBuffer());
        const metric = await measure(original);
        const { category, target } = classify(entry.table, metric);
        const scale = Math.min(target / Math.max(metric.maxDimension, 0.001), 1.75);
        const shouldNormalise = scale > 1.04;
        const safeScale = shouldNormalise ? scale : 1;

        if (APPLY && shouldNormalise) {
          const normalised = await normalise(original, metric, safeScale);
          const { error } = await supabase.storage.from(BUCKET).update(entry.objectPath, normalised, {
            contentType: "image/png",
            upsert: true,
          });
          if (error) throw error;
        }

        report.push({
          ...entry,
          category,
          target,
          scale: Number(safeScale.toFixed(4)),
          changed: shouldNormalise,
          ...metric,
        });
      } catch (error) {
        report.push({ ...entry, error: String(error) });
      }
    }
  }),
);

report.sort((a, b) => a.objectPath.localeCompare(b.objectPath));
fs.writeFileSync(REPORT_PATH, JSON.stringify({ apply: APPLY, generatedAt: new Date().toISOString(), report }, null, 2));
const errors = report.filter((entry) => entry.error);
const changed = report.filter((entry) => entry.changed);
console.log(JSON.stringify({ mode: APPLY ? "applied" : "dry-run", audited: report.length, changed: changed.length, errors: errors.length, report: REPORT_PATH }, null, 2));
if (errors.length) process.exitCode = 1;
