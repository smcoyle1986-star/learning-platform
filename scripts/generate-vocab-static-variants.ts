import fs from "node:fs";

import { createClient } from "@supabase/supabase-js";

import {
  generateVocabularyStaticVariants,
  uploadVocabularyStaticVariants,
} from "../lib/images/static-vocab-variants.server";

const BUCKET = "vocab-images";
const PAGE_SIZE = 1_000;
const sourceExtensions = /\.(png|jpe?g|webp)$/i;

function readEnvironment() {
  const fromFile: Record<string, string> = {};
  try {
    for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      fromFile[trimmed.slice(0, separator)] = trimmed.slice(separator + 1);
    }
  } catch {
    // Vercel and CI provide the same values through process.env.
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? fromFile.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? fromFile.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw new Error("Missing Supabase credentials.");
  return { url, serviceRole };
}

async function loadSourcePaths() {
  const { url, serviceRole } = readEnvironment();
  const supabase = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const paths = new Set<string>();

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("vocab_images")
      .select("image_path")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(`Could not load vocabulary image paths: ${error.message}`);
    for (const row of data ?? []) {
      const imagePath = String(row.image_path ?? "").trim();
      if (imagePath && !imagePath.startsWith("derived/") && sourceExtensions.test(imagePath)) {
        paths.add(imagePath);
      }
    }
    if (!data || data.length < PAGE_SIZE) break;
  }

  return { supabase, paths: [...paths].sort() };
}

async function main() {
  const write = process.argv.includes("--write");
  const force = process.argv.includes("--force");
  const estimate = process.argv.includes("--estimate");
  const pathsIndex = process.argv.indexOf("--paths");
  const pathsFileIndex = process.argv.indexOf("--paths-file");
  const concurrencyIndex = process.argv.indexOf("--concurrency");
  const limitIndex = process.argv.indexOf("--limit");
  const requestedLimit = limitIndex >= 0 ? Number(process.argv[limitIndex + 1]) : undefined;
  if (limitIndex >= 0 && (!Number.isInteger(requestedLimit) || requestedLimit! < 1)) {
    throw new Error("--limit must be followed by a positive whole number.");
  }
  const requestedConcurrency = concurrencyIndex >= 0 ? Number(process.argv[concurrencyIndex + 1]) : 6;
  if (!Number.isInteger(requestedConcurrency) || requestedConcurrency < 1 || requestedConcurrency > 12) {
    throw new Error("--concurrency must be a whole number from 1 to 12.");
  }

  const { supabase, paths } = await loadSourcePaths();
  if (pathsIndex >= 0 && pathsFileIndex >= 0) {
    throw new Error("Use either --paths or --paths-file, not both.");
  }
  const requestedPaths = pathsIndex >= 0
    ? process.argv[pathsIndex + 1]?.split(",").map((path) => path.trim()).filter(Boolean)
    : pathsFileIndex >= 0
      ? JSON.parse(fs.readFileSync(process.argv[pathsFileIndex + 1] ?? "", "utf8"))
        .missing
        .map((item: { source: string }) => item.source)
      : undefined;
  if (pathsIndex >= 0 && !requestedPaths?.length) {
    throw new Error("--paths must be followed by a comma-separated list of source storage paths.");
  }
  if (pathsFileIndex >= 0 && !requestedPaths?.length) {
    throw new Error("--paths-file must name an integrity report with at least one missing source path.");
  }
  const unknownPaths = requestedPaths?.filter((path: string) => !paths.includes(path)) ?? [];
  if (unknownPaths.length) {
    throw new Error(`These paths are not registered vocabulary masters: ${unknownPaths.join(", ")}`);
  }
  const selected = requestedPaths ?? (requestedLimit ? paths.slice(0, requestedLimit) : paths);
  const derivativeCount = selected.length * 3;
  console.log(`Vocabulary source images: ${paths.length}`);
  console.log(`Selected for this run: ${selected.length}`);
  console.log(`Static WebP derivatives planned: ${derivativeCount} (160px, 480px, 1024px per source)`);

  if (!write) {
    if (estimate && selected.length > 0) {
      const sampleCount = Math.min(20, selected.length);
      const sampleIndexes = Array.from(
        new Set(Array.from({ length: sampleCount }, (_, index) =>
          Math.round((index * (selected.length - 1)) / Math.max(1, sampleCount - 1)),
        )),
      );
      const bytesByWidth = new Map<number, number>();
      let sampled = 0;

      for (const index of sampleIndexes) {
        const sourcePath = selected[index];
        try {
          const { data, error } = await supabase.storage.from(BUCKET).download(sourcePath);
          if (error || !data) throw new Error(error?.message ?? "Source image was unavailable.");
          const variants = await generateVocabularyStaticVariants(
            sourcePath,
            Buffer.from(await data.arrayBuffer()),
          );
          for (const variant of variants) {
            bytesByWidth.set(variant.width, (bytesByWidth.get(variant.width) ?? 0) + variant.buffer.length);
          }
          sampled += 1;
        } catch (error) {
          console.error(`Estimate skipped ${sourcePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      if (sampled > 0) {
        const estimatedBytes = [...bytesByWidth.values()].reduce(
          (total, bytes) => total + (bytes / sampled) * selected.length,
          0,
        );
        console.log(`Estimated from ${sampled} evenly-spread source images: ${(estimatedBytes / 1024 / 1024).toFixed(0)} MiB total static storage.`);
        for (const [width, bytes] of bytesByWidth) {
          console.log(`  ${width}px average: ${(bytes / sampled / 1024).toFixed(0)} KiB per derivative`);
        }
      }
    }
    console.log("Plan only: no files were downloaded or uploaded. Run with --write after reviewing this count.");
    return;
  }

  let created = 0;
  let createdBytes = 0;
  let skipped = 0;
  const failures: Array<{ path: string; message: string }> = [];
  let nextIndex = 0;
  let completed = 0;
  const runOne = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= selected.length) return;
      const sourcePath = selected[index];
    try {
      const { data, error } = await supabase.storage.from(BUCKET).download(sourcePath);
      if (error || !data) throw new Error(error?.message ?? "Source image was unavailable.");
      const result = await uploadVocabularyStaticVariants(
        supabase,
        sourcePath,
        Buffer.from(await data.arrayBuffer()),
        { force },
      );
      created += result.created;
      createdBytes += result.createdBytes;
      skipped += result.skipped;
      completed += 1;
      if (completed % 25 === 0 || completed === selected.length) {
        console.log(`Progress ${completed}/${selected.length}: ${created} created, ${skipped} skipped, ${failures.length} failed.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ path: sourcePath, message });
      completed += 1;
      console.error(`[${index + 1}/${selected.length}] ${sourcePath}: ${message}`);
    }
    }
  }

  await Promise.all(Array.from({ length: Math.min(requestedConcurrency, selected.length) }, runOne));
  console.log(`Completed: ${completed} masters processed; ${created} created (${(createdBytes / 1024 / 1024).toFixed(1)} MiB), ${skipped} skipped, ${failures.length} failed.`);
  if (failures.length) {
    console.error(JSON.stringify(failures, null, 2));
    process.exitCode = 1;
  }
}

void main();
