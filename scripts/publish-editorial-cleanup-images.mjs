#!/usr/bin/env node

// Publishes the seven approved missing vocabulary images before their themes
// are added. Each asset is uploaded to a new versioned path; no existing image
// is overwritten.
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const assets = [
  ["5a396a41-95be-4454-b906-743aa0f41229", "midday"],
  ["9f7d5b76-48e5-4ad2-96c1-45730a3db27e", "month"],
  ["bc60db31-48f8-4c61-8f65-6e52c5d4c19b", "breakfast"],
  ["f8fb49cc-4387-424f-9b1e-10eefad1f40c", "dinner"],
  ["c5ccf7ad-94fe-4ba1-9c38-08a629e5031c", "snack"],
  ["837364eb-6ba1-4130-91d4-6d872841bf28", "smartwatch"],
  ["fec0f3d6-4473-4d16-a8f2-149f7c1558b4", "webcam"],
];

function parseEnv(contents) {
  const env = {};
  for (const line of contents.split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    const divider = text.indexOf("=");
    if (divider > 0) env[text.slice(0, divider)] = text.slice(divider + 1).replace(/^['\"]|['\"]$/g, "");
  }
  return env;
}

const env = { ...parseEnv(await fs.readFile(path.join(root, ".env.local"), "utf8")), ...process.env };
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const bucket = client.storage.from("vocab-images");
const published = [];

for (const [id, lemma] of assets) {
  const localPath = path.join(root, "assets", "content-replacements", "2026-09-06", "editorial-cleanup", `${lemma}.png`);
  const bytes = await fs.readFile(localPath);
  const storagePath = `nouns/${lemma}/${lemma}_1.png`;
  const { error: uploadError } = await bucket.upload(storagePath, bytes, { contentType: "image/png", upsert: false });
  if (uploadError) throw new Error(`${lemma}: ${uploadError.message}`);
  const { data } = bucket.getPublicUrl(storagePath);
  const imageUrl = `${data.publicUrl}?v=20260906-editorial`;
  const { error: updateError } = await client.from("nouns").update({ image_id: imageUrl }).eq("id", id);
  if (updateError) throw new Error(`${lemma}: ${updateError.message}`);
  const verify = await fetch(imageUrl, { method: "HEAD" });
  if (!verify.ok) throw new Error(`${lemma}: uploaded image verification failed (${verify.status})`);
  published.push({ id, lemma, storagePath, imageUrl });
}

console.log(JSON.stringify({ published }, null, 2));
