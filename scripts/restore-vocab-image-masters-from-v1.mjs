import fs from "node:fs";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "vocab-images";
const CUTOFF = "2026-09-11T09:00:00.000Z";
const TABLES = ["nouns", "verbs", "adjectives", "phonics", "prepositions"];
const CONCURRENCY = 12;

function loadEnv() {
  const values = {};
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const value = line.trim();
    if (!value || value.startsWith("#")) continue;
    const separator = value.indexOf("=");
    if (separator > 0) values[value.slice(0, separator)] = value.slice(separator + 1);
  }
  return values;
}

function storagePath(value) {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = value.indexOf(marker);
  return index < 0 ? null : value.slice(index + marker.length).split("?")[0];
}

function v1Url(path) {
  const extension = path.lastIndexOf(".");
  const stem = extension > path.lastIndexOf("/") ? path.slice(0, extension) : path;
  return `https://tsccyjrniiamnwgrtvpw.supabase.co/storage/v1/object/public/${BUCKET}/derived/v1/${stem}-1024.webp`;
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const paths = new Set();
for (const table of TABLES) {
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select("image_id").range(from, from + 999);
    if (error) throw error;
    for (const row of data ?? []) {
      const path = row.image_id ? storagePath(String(row.image_id)) : null;
      if (path && !path.startsWith("derived/")) paths.add(path);
    }
    if (!data || data.length < 1000) break;
  }
}

const candidates = [];
const queue = [...paths];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const source = queue.pop();
    const slash = source.lastIndexOf("/");
    const { data, error } = await supabase.storage.from(BUCKET).list(source.slice(0, slash), { limit: 1_000 });
    if (error) throw error;
    const item = (data ?? []).find((entry) => entry.name === source.slice(slash + 1));
    if (item?.updated_at && item.updated_at >= CUTOFF) candidates.push(source);
  }
}));

const restored = [];
const failures = [];
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (candidates.length) {
    const source = candidates.pop();
    try {
      const response = await fetch(v1Url(source));
      if (!response.ok) throw new Error(`v1 response ${response.status}`);
      const restoredPng = await sharp(Buffer.from(await response.arrayBuffer())).png().toBuffer();
      const { error } = await supabase.storage.from(BUCKET).update(source, restoredPng, {
        contentType: "image/png",
        upsert: true,
      });
      if (error) throw error;
      restored.push(source);
    } catch (error) {
      failures.push({ source, error: String(error) });
    }
  }
}));

console.log(JSON.stringify({ cutoff: CUTOFF, restored: restored.sort(), failures }, null, 2));
if (failures.length) process.exitCode = 1;
