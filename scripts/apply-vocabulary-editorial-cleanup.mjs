#!/usr/bin/env node

// Applies the approved editorial cleanup while preserving vocabulary IDs so
// saved lessons continue to resolve their existing cards. Run without --apply
// for a read-only image and data validation report.
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const shouldApply = process.argv.includes("--apply");
const outputPath = path.join(root, "migration", "vocabulary-editorial-cleanup-report.json");

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

const textCorrections = {
  nouns: {
    "Budha's Birthday": "Buddha's Birthday",
    "hair dresser": "hairdresser",
    "Valentines day": "Valentine's Day",
    "St Patrick's day": "St. Patrick's Day",
    "white board": "whiteboard",
    yoyo: "yo-yo",
    yoghurt: "yogurt",
    chilli: "chili",
    // The existing "vest" card remains untouched; this card is the insulated
    // sleeveless outer layer generally called a puffer vest in US English.
    gillet: "puffer vest",
  },
  adjectives: { eventless: "uneventful" },
};

const themeUpdates = {
  nouns: {
    "03384d82-bfa8-4451-8fda-c56584dbdaa2": ["nature"], // island
    "62106858-5817-4ee8-acde-193dc9454f12": ["nature"], // ocean
    "8bc4d73f-95cd-45fe-8768-39ee8cde882e": ["nature"], // river
    "05985d86-9f5f-471e-a133-823e9f0a5df5": ["nature"], // lake
    "b429f01a-73a0-4540-a497-82e133a7f004": ["people"], // king
    "5ca61446-d29e-4300-8473-22fe761b03b9": ["people"], // queen
    "5e696e75-0231-45fd-a392-443b2396428f": ["people"], // student
    "5a396a41-95be-4454-b906-743aa0f41229": ["time"], // midday
    "9f7d5b76-48e5-4ad2-96c1-45730a3db27e": ["time"], // month
    "7b10b3dd-02f0-4795-bc83-b3a87f0c5695": ["time"], // year
    "bc60db31-48f8-4c61-8f65-6e52c5d4c19b": ["food & drinks"], // breakfast
    "f8fb49cc-4387-424f-9b1e-10eefad1f40c": ["food & drinks"], // dinner
    "c5ccf7ad-94fe-4ba1-9c38-08a629e5031c": ["food & drinks"], // snack
    "837364eb-6ba1-4130-91d4-6d872841bf28": ["toys & games"], // smartwatch
    "fec0f3d6-4473-4d16-a8f2-149f7c1558b4": ["toys & games"], // webcam
  },
  adjectives: {
    "bd786e81-1d87-43be-bb5e-289a3423a1ef": ["appearance"], // young
    "985ff8c7-c55d-4759-bcbf-23f6b6cb7626": ["shape"], // bent
    "094ef1c8-f0c6-4fef-9e23-f2e5a3a1e8f6": ["shape"], // curved
    "91a6cec6-e143-4067-b820-7a64b210497e": ["shape"], // flat
    "c61220d1-0053-44a2-86c3-af08a2dbd159": ["shape"], // straight
  },
};

// Theme updates for formerly unthemed verb cards. Their image URLs are checked
// before any live update is permitted.
const missingVerbThemes = {
  "6a0e8232-4653-4b14-b5ca-3e8dbd6cef50": ["thinking"], // like
  "1d4a7cc0-69ce-4cf4-9ccc-1e0ac35a7de1": ["thinking"], // hate
  "28e211e3-7d6b-46c7-96e8-a6bf08b8ee43": ["thinking"], // need
  "dbe848b5-e73d-45fa-aac3-494c33326202": ["thinking"], // want
  "ed1ea2f7-e31c-45f9-9b5b-cd86696372f0": ["communication"],
  "e5662f43-2832-47e2-8178-29d24cc32fa4": ["daily life", "movement"],
  "f54c4d11-a332-49e7-86c0-fc1c9f70271d": ["daily life"],
  "b016459d-c409-4ed6-892e-c317f6ffd200": ["daily life", "movement"],
  "92ef8cd4-9852-48eb-8330-4391ca147691": ["action"],
  "d2e2059d-deb0-4cf9-ba97-a956b8291d9f": ["communication"],
  "779b4f89-a0df-4f41-a3b5-c0d911d793cf": ["daily life", "thinking"],
  "159f7c92-71f9-481c-aa02-f3a9fcc44946": ["daily life"],
  "3a63af9a-f807-4957-b295-33298ecbff71": ["action"],
  "0cf1708f-9341-493c-867a-2a4c1812ad2f": ["thinking"],
  "4a974fd9-5382-42a1-bef9-f7783179ab1f": ["play & hobbies"],
  "932d8c03-0a6f-4ba9-a096-7fae75063fc8": ["daily life"],
  "2a4feb78-5452-4421-9cf2-d2811a15f4e2": ["play & hobbies"],
  "89a955ec-15c2-4acc-bd5e-bd65e72fdac9": ["daily life", "movement"],
  "ff9ebc81-728d-49e4-940f-56f340a16f34": ["daily life"],
  "47c9b9a4-f6fb-40c2-a4a4-d6be8e370df0": ["play & hobbies"],
  "cba532b2-38f1-4d43-ad6c-eb66a8ebc798": ["daily life"],
  "f2fd8e77-0e74-4a2a-b7e7-57f556a47aa5": ["daily life"],
  "bc4593db-ab35-454b-80b0-76560f1987f2": ["action", "play & hobbies"],
  "e4e716b9-dc17-4b66-9a83-2b46a4dea9ac": ["daily life"],
  "fc85c453-11dd-4dde-b183-98c1a1b5c36d": ["movement"],
  "1b65c3b2-9022-4573-b17e-c603fd1f29e4": ["daily life"],
  "b6c5a86f-7aa1-4045-8bb2-bea7f67ea85d": ["play & hobbies"],
  "77afe4a1-59c1-42db-819c-a5ee06a286cf": ["daily life"],
  "b5a66533-d591-4a1f-b30a-0bfb95ab4492": ["play & hobbies"],
  "4f221d42-681f-457d-b307-6ca947285e71": ["daily life"],
  "01bdafa6-cde4-4827-8412-7c8d243dae59": ["thinking"],
  "d029bbbf-b964-44a9-afde-ad3a1b4e014a": ["action", "play & hobbies"],
  "cb06d491-b42a-4d13-825c-8e68d474958c": ["daily life"],
  "cfa8cb53-e627-484e-827f-d62700baf3e9": ["daily life"],
  "ef1b57c1-d2a9-4650-b4ed-da3a40657308": ["thinking"],
  "45d91f2f-8028-427e-a523-0cdeaaa8db77": ["thinking"],
  "aa40a0eb-fa97-497d-b85d-0232b8192464": ["action"],
  "4f985c72-99c2-418a-b0fe-a47d83ca52f8": ["communication"],
  "4470a79b-ef65-4045-8437-9d59ce3404e5": ["daily life", "thinking"],
  "bf14d565-2f22-4ccb-9b54-7feb4048441f": ["daily life"],
  "3a80e323-645b-4f4e-9986-33a7a39b2551": ["daily life", "movement"],
  "1fe1b9ef-9159-4cf6-8c01-f6d2ebb58664": ["communication"],
  "1841d275-9d11-4637-af65-086acdc398aa": ["daily life"],
  "a1789124-5d7a-4f8c-8314-d4b5342a22e4": ["daily life", "thinking"],
  "6a5b57b4-9b20-49cc-8fd7-cab6132c1935": ["daily life"],
  "188e6582-302e-4cc6-ab5e-fe2634c8f2ad": ["daily life"],
  "bc5108a9-1dcd-454a-894e-b3dede30ff19": ["daily life"],
  "e1c74918-48db-4b75-b0d7-94847c0da779": ["daily life", "action"],
  "635c2276-7bfc-40e3-ab20-a1a44c9829af": ["daily life"],
  "c168e252-f327-4026-8c10-67c0970fae88": ["communication"],
};

const phonicsThemes = {
  alphabet: ["Aa", "Bb", "Cc", "Dd", "Ee", "Ff", "Gg", "Hh", "Ii", "Jj", "Kk", "Ll", "Mm", "Nn", "Oo", "Pp", "Qq", "Rr", "Ss", "Tt", "Uu", "Vv", "Ww", "Xx", "Yy", "Zz"],
  "short vowels": ["bed", "box", "bug", "bun", "can", "cap", "cub", "cup", "dog", "fin", "fox", "ham", "hat", "hen", "hit", "hop", "hot", "hug", "jam", "jet", "kid", "log", "mat", "mop", "nut", "pan", "pet", "pig", "pot", "red", "six", "sit", "sun", "tap", "ten", "tub", "vet", "wet", "wig", "win"],
  "silent-e long vowels": ["bake", "bite", "bone", "bride", "cake", "cape", "cave", "cube", "dice", "dive", "dune", "face", "flute", "game", "gate", "hike", "hole", "huge", "ice", "joke", "kite", "mute", "nine", "nose", "note", "phone", "poke", "price", "race", "rope", "rose", "side", "slice", "slide", "smoke", "tube", "tune", "use", "whale", "white"],
  "vowel teams & diphthongs": ["boil", "book", "boots", "bowl", "coat", "crow", "day", "feet", "green", "hook", "house", "joy", "meet", "moon", "owl", "point", "pouch", "rain", "road", "sea", "seal", "shout", "soil", "tail", "tea", "teeth", "town", "toy", "tray", "violin", "wait", "wood"],
  "r-controlled vowels": ["barn", "cart", "corner", "fur", "girl", "horn", "skirt", "star"],
  "consonant blends": ["black", "block", "brick", "clap", "cross", "drop", "drum", "flag", "glad", "hand", "sled", "smell", "stop", "swan", "sweep", "trip", "trumpet", "wind"],
  digraphs: ["bench", "chin", "dish", "elephant", "king", "lunch", "pink", "ring", "ship", "sing", "think", "whisker", "whisper"],
  "sight words": ["all", "are", "by", "for", "her", "his", "i", "if", "in", "is", "it", "my", "of", "out", "over", "the", "they", "to", "was", "we", "with", "you"],
};

function flattenPhonicsThemes() {
  const result = new Map();
  for (const [theme, lemmas] of Object.entries(phonicsThemes)) {
    for (const lemma of lemmas) {
      if (result.has(lemma)) throw new Error(`Phonics lemma is assigned twice: ${lemma}`);
      result.set(lemma, theme);
    }
  }
  return result;
}

async function rowsByIds(client, table, ids) {
  const { data, error } = await client.from(table).select("id,lemma,themes,image_id").in("id", ids);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

async function imageStatus(url) {
  if (!url) return { ok: false, reason: "No image URL" };
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok ? { ok: true, status: response.status } : { ok: false, reason: `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

async function updateById(client, table, id, update) {
  const { error } = await client.from(table).update(update).eq("id", id);
  if (error) throw new Error(`${table}:${id}: ${error.message}`);
}

async function concurrently(items, task, limit = 12) {
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await task(item);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

const env = { ...parseEnv(await fs.readFile(path.join(root, ".env.local"), "utf8")), ...process.env };
const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const phonicsByLemma = flattenPhonicsThemes();
const { data: allPhonics, error: phonicsError } = await client.from("phonics").select("id,lemma,theme,image_id");
if (phonicsError) throw new Error(`phonics: ${phonicsError.message}`);
const unmappedPhonics = (allPhonics ?? []).filter((row) => !phonicsByLemma.has(row.lemma));
const unknownPhonics = [...phonicsByLemma.keys()].filter((lemma) => !(allPhonics ?? []).some((row) => row.lemma === lemma));
if (unmappedPhonics.length || unknownPhonics.length) {
  throw new Error(`Phonics map is incomplete. Unmapped: ${unmappedPhonics.map((row) => row.lemma).join(", ")}; unknown: ${unknownPhonics.join(", ")}`);
}

const requiredImageChecks = [
  ["nouns", themeUpdates.nouns],
  ["verbs", missingVerbThemes],
];
const imageChecks = [];
for (const [table, changes] of requiredImageChecks) {
  const rows = await rowsByIds(client, table, Object.keys(changes));
  const checks = await Promise.all(rows.map(async (row) => ({
    table,
    id: row.id,
    lemma: row.lemma,
    image: await imageStatus(row.image_id),
  })));
  imageChecks.push(...checks);
}
const failedImages = imageChecks.filter((check) => !check.image.ok);

const report = {
  generatedAt: new Date().toISOString(),
  mode: shouldApply ? "apply" : "dry-run",
  summary: {
    textCorrections: Object.values(textCorrections).reduce((total, changes) => total + Object.keys(changes).length, 0),
    taxonomyThemeUpdates: Object.values(themeUpdates).reduce((total, changes) => total + Object.keys(changes).length, 0),
    missingThemeUpdates: Object.keys(missingVerbThemes).length + 8,
    phonicsUpdates: (allPhonics ?? []).filter((row) => row.theme !== phonicsByLemma.get(row.lemma)).length,
    requiredImageChecks: imageChecks.length,
    failedImageChecks: failedImages.length,
  },
  imageChecks,
  blocked: failedImages.length ? "No live changes were made because one or more records to receive a new theme lack a usable image." : null,
};

if (shouldApply && failedImages.length) throw new Error(`Image verification failed for ${failedImages.map((item) => `${item.table}:${item.lemma}`).join(", ")}`);

if (shouldApply) {
  for (const [table, changes] of Object.entries(textCorrections)) {
    await concurrently(Object.entries(changes), async ([from, to]) => {
      const { error } = await client.from(table).update({ lemma: to }).eq("lemma", from);
      if (error) throw new Error(`${table}:${from}: ${error.message}`);
    });
  }
  for (const [table, changes] of Object.entries(themeUpdates)) {
    await concurrently(Object.entries(changes), async ([id, themes]) => updateById(client, table, id, { themes }));
  }
  await concurrently(Object.entries(missingVerbThemes), async ([id, themes]) => updateById(client, "verbs", id, { themes }));
  await concurrently((allPhonics ?? []).filter((row) => phonicsByLemma.get(row.lemma) !== row.theme), async (row) => {
    const theme = phonicsByLemma.get(row.lemma);
    if (theme) await updateById(client, "phonics", row.id, { theme });
  });
}

await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report.summary, applied: shouldApply && !failedImages.length, outputPath }, null, 2));
