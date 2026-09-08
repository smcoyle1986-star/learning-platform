import fs from "node:fs";

import { createClient } from "@supabase/supabase-js";

import {
  getVocabularyStaticVariantPath,
  VOCABULARY_STATIC_VARIANT_WIDTHS,
} from "../lib/images/storage";

const BUCKET = "vocab-images";
const PAGE_SIZE = 1_000;
const CONCURRENCY = 12;
const sourceExtensions = /\.(png|jpe?g|webp)$/i;

function env() {
  const fromFile: Record<string, string> = {};
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator !== -1) fromFile[trimmed.slice(0, separator)] = trimmed.slice(separator + 1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? fromFile.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY ?? fromFile.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) throw new Error("Missing Supabase credentials.");
  return { url, serviceRole };
}

async function main() {
  const reportPathIndex = process.argv.indexOf("--report");
  const reportPath = reportPathIndex >= 0 ? process.argv[reportPathIndex + 1] : undefined;
  if (reportPathIndex >= 0 && !reportPath) throw new Error("--report must be followed by a file path.");
  const { url, serviceRole } = env();
  const supabase = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const listDerivedFiles = async (folder: string) => {
    let lastError: string | null = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const { data, error } = await supabase.storage.from(BUCKET).list(folder, { limit: 1_000 });
      if (!error) return { data: data ?? [], error: null };
      lastError = error.message;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
    }
    return { data: [], error: lastError ?? "Unknown Storage listing error" };
  };
  const sources = new Map<string, string>();
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("vocab_images")
      .select("image_path, category")
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    for (const row of data ?? []) {
      const path = String(row.image_path ?? "").trim();
      if (path && !path.startsWith("derived/") && sourceExtensions.test(path)) {
        sources.set(path, String(row.category ?? "unknown"));
      }
    }
    if (!data || data.length < PAGE_SIZE) break;
  }

  const sourceEntries = [...sources.entries()].sort(([left], [right]) => left.localeCompare(right));
  const missing: Array<{ source: string; category: string; widths: number[] }> = [];
  const listFailures: Array<{ source: string; message: string }> = [];
  let found = 0;
  let bytes = 0;
  let cursor = 0;
  let checked = 0;

  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= sourceEntries.length) return;
      const [source, category] = sourceEntries[index];
      const slash = source.lastIndexOf("/");
      const derivedFolder = `derived/v1/${source.slice(0, slash)}`;
      const expected = new Map(
        VOCABULARY_STATIC_VARIANT_WIDTHS.map((width) => [
          getVocabularyStaticVariantPath(source, width).slice(derivedFolder.length + 1),
          width,
        ]),
      );
      const { data, error } = await listDerivedFiles(derivedFolder);
      if (error) {
        listFailures.push({ source, message: error });
      } else {
        const absent: number[] = [];
        for (const [name, width] of expected) {
          const entry = (data ?? []).find((item) => item.name === name);
          if (!entry) absent.push(width);
          else {
            found += 1;
            bytes += Number(entry.metadata?.size ?? 0);
          }
        }
        if (absent.length) missing.push({ source, category, widths: absent });
      }
      checked += 1;
      if (checked % 250 === 0 || checked === sourceEntries.length) {
        console.log(`Checked ${checked}/${sourceEntries.length}: ${found} present, ${missing.length} masters with missing variants.`);
      }
    }
  }));

  const report = {
    masters: sourceEntries.length,
    expected: sourceEntries.length * VOCABULARY_STATIC_VARIANT_WIDTHS.length,
    found,
    missingVariantCount: sourceEntries.length * VOCABULARY_STATIC_VARIANT_WIDTHS.length - found,
    addedBytes: bytes,
    addedMiB: +(bytes / 1024 / 1024).toFixed(1),
    missing,
    listFailures,
  };
  if (reportPath) {
    fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Wrote integrity report to ${reportPath}`);
  }
  console.log(JSON.stringify(report, null, 2));
  if (report.missingVariantCount > 0 || report.listFailures.length > 0) process.exitCode = 1;
}

void main();
