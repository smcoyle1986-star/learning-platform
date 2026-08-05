import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type RequestedSet = {
  title: string;
  lemmas: string[];
};

type VerbRow = {
  id: string;
  lemma: string;
  image_id: string | null;
};

type CardRow = {
  lesson_set_id: string;
  verb_id: string | null;
  front: string;
  back: string;
  position: number;
};

const FIRST_APPROVED_TITLE = "Action Verbs - Easy";
const EXCLUSION_HEADING = "DO NOT CREATE THESE SETS";
const EXCLUDED_TITLES = new Set([
  "Speaking Politely - Medium",
  "Cooking Actions - Easy",
  "Cooking Actions - Medium",
  "Open Your Book & Close Your Book - Easy",
]);
const TITLE_PATTERN = /^[^*].+ - (Easy|Medium|Hard)$/;

function loadEnvironment(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function requiredEnvironment(key: string) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function parseRequestedSets(filePath: string): RequestedSet[] {
  const lines = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n|\u2028|\u2029/)
    .map((line) => line.trim())
    .filter(Boolean);

  const start = lines.indexOf(FIRST_APPROVED_TITLE);
  const end = lines.indexOf(EXCLUSION_HEADING);
  if (start < 0 || end <= start) {
    throw new Error("Could not locate the approved Classendo verb-set block.");
  }

  const sets: RequestedSet[] = [];
  let current: RequestedSet | null = null;

  for (const line of lines.slice(start, end)) {
    if (TITLE_PATTERN.test(line)) {
      if (/\(\d+\)/.test(line)) {
        throw new Error(`Card counts are not allowed in titles: ${line}`);
      }
      if (EXCLUDED_TITLES.has(line)) {
        throw new Error(`Excluded title appeared in the approved block: ${line}`);
      }
      current = { title: line, lemmas: [] };
      sets.push(current);
      continue;
    }

    if (line.startsWith("IMPORTANT:")) continue;
    if (!current) throw new Error(`Lemma appeared before the first set: ${line}`);
    current.lemmas.push(line);
  }

  if (!sets.length) throw new Error("No approved sets were parsed.");

  const duplicateTitles = sets
    .map((set) => set.title)
    .filter((title, index, titles) => titles.indexOf(title) !== index);
  if (duplicateTitles.length) {
    throw new Error(`Duplicate approved titles: ${[...new Set(duplicateTitles)].join(", ")}`);
  }

  for (const set of sets) {
    const uniqueLemmas = new Set(set.lemmas);
    if (uniqueLemmas.size !== set.lemmas.length) {
      throw new Error(`Duplicate lemma inside ${set.title}.`);
    }
    if (set.lemmas.length < 2 || set.lemmas.length > 50) {
      throw new Error(`${set.title} has an invalid card count.`);
    }
  }

  return sets;
}

function tagsForTitle(title: string) {
  const difficulty = title.match(/ - (Easy|Medium|Hard)$/)?.[1]?.toLowerCase();
  return ["verbs", "Classendo", ...(difficulty ? [difficulty] : [])];
}

async function verifySeededState(
  supabase: SupabaseClient,
  ownerId: string,
  requestedSets: RequestedSet[],
  verbsByLemma: Map<string, VerbRow>,
) {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("display_name,username")
    .eq("id", ownerId)
    .single();
  if (profileError) throw profileError;
  if (profile.display_name !== "Classendo" || profile.username !== null) {
    throw new Error("The administrator profile does not display exactly as Classendo.");
  }

  const { data: ownerSets, error: setsError } = await supabase
    .from("lesson_sets")
    .select("id,name,user_id,is_public,hidden_at,deleted_at")
    .eq("user_id", ownerId);
  if (setsError) throw setsError;

  const requestedTitles = new Set(requestedSets.map((set) => set.title));
  const curatedSets = (ownerSets ?? []).filter((set) => requestedTitles.has(String(set.name)));
  if (curatedSets.length !== requestedSets.length) {
    throw new Error(`Expected ${requestedSets.length} exact curated sets; found ${curatedSets.length}.`);
  }
  for (const title of EXCLUDED_TITLES) {
    if ((ownerSets ?? []).some((set) => set.name === title)) {
      throw new Error(`Excluded administrator set exists: ${title}`);
    }
  }

  const setsByTitle = new Map<string, (typeof curatedSets)[number]>();
  for (const set of curatedSets) {
    if (setsByTitle.has(String(set.name))) throw new Error(`Duplicate live title: ${set.name}`);
    if (!set.is_public || set.hidden_at !== null || set.deleted_at !== null) {
      throw new Error(`Community visibility is invalid for ${set.name}.`);
    }
    setsByTitle.set(String(set.name), set);
  }

  const setIds = curatedSets.map((set) => String(set.id));
  const cards: CardRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("cards")
      .select("lesson_set_id,verb_id,front,back,position")
      .in("lesson_set_id", setIds)
      .order("lesson_set_id")
      .order("position")
      .range(offset, offset + 999);
    if (error) throw error;
    cards.push(...((data ?? []) as CardRow[]));
    if ((data ?? []).length < 1000) break;
  }

  const verbsById = new Map([...verbsByLemma.values()].map((verb) => [verb.id, verb]));
  for (const requested of requestedSets) {
    const liveSet = setsByTitle.get(requested.title);
    if (!liveSet) throw new Error(`Missing live set: ${requested.title}`);
    const liveCards = cards
      .filter((card) => card.lesson_set_id === liveSet.id)
      .sort((a, b) => a.position - b.position);
    if (liveCards.length !== requested.lemmas.length) {
      throw new Error(`${requested.title} has ${liveCards.length} cards; expected ${requested.lemmas.length}.`);
    }
    requested.lemmas.forEach((lemma, position) => {
      const card = liveCards[position];
      const verb = card?.verb_id ? verbsById.get(card.verb_id) : undefined;
      if (
        card?.position !== position ||
        card?.front !== lemma ||
        verb?.lemma !== lemma ||
        card?.back !== verb.image_id ||
        !card.back.includes("_1.png")
      ) {
        throw new Error(`${requested.title} failed exact card validation at position ${position}: ${lemma}`);
      }
    });
  }

  const expectedCardCount = requestedSets.reduce((total, set) => total + set.lemmas.length, 0);
  if (cards.length !== expectedCardCount) {
    throw new Error(`Expected ${expectedCardCount} cards; found ${cards.length}.`);
  }

  return { verifiedSetCount: curatedSets.length, verifiedCardCount: cards.length };
}

async function main() {
  const apply = process.argv.includes("--apply");
  const inputPath = process.argv.slice(2).find((argument) => !argument.startsWith("--"));
  if (!inputPath) {
    throw new Error("Usage: node --import tsx scripts/seed-admin-verb-community-sets.ts <request.txt> [--apply]");
  }

  loadEnvironment(path.join(process.cwd(), ".env.local"));
  loadEnvironment(path.join(process.cwd(), ".env"));

  const supabase = createClient(
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const requestedSets = parseRequestedSets(path.resolve(inputPath));

  const { data: verbs, error: verbsError } = await supabase
    .from("verbs")
    .select("id,lemma,image_id")
    .range(0, 999);
  if (verbsError) throw verbsError;

  const verbRows = (verbs ?? []) as VerbRow[];
  const verbsByLemma = new Map<string, VerbRow>();
  for (const verb of verbRows) {
    if (verbsByLemma.has(verb.lemma)) {
      throw new Error(`The live verbs table contains duplicate exact lemma rows for: ${verb.lemma}`);
    }
    verbsByLemma.set(verb.lemma, verb);
  }

  const missingBySet = requestedSets
    .map((set) => ({
      title: set.title,
      missing: set.lemmas.filter((lemma) => !verbsByLemma.has(lemma)),
    }))
    .filter((set) => set.missing.length > 0);
  if (missingBySet.length) {
    throw new Error(`Exact lemma validation failed:\n${JSON.stringify(missingBySet, null, 2)}`);
  }

  const invalidImages = requestedSets
    .flatMap((set) => set.lemmas)
    .filter((lemma, index, lemmas) => lemmas.indexOf(lemma) === index)
    .filter((lemma) => !String(verbsByLemma.get(lemma)?.image_id ?? "").includes("_1.png"));
  if (invalidImages.length) {
    throw new Error(`These verbs do not have image_1: ${invalidImages.join(", ")}`);
  }

  const { data: owners, error: ownersError } = await supabase
    .from("admin_memberships")
    .select("user_id,role")
    .eq("role", "owner");
  if (ownersError) throw ownersError;
  if ((owners ?? []).length !== 1) {
    throw new Error(`Expected exactly one Classendo owner account; found ${(owners ?? []).length}.`);
  }
  const ownerId = String(owners![0].user_id);

  const { data: existingSets, error: existingSetsError } = await supabase
    .from("lesson_sets")
    .select("id,name,user_id,is_public")
    .eq("user_id", ownerId);
  if (existingSetsError) throw existingSetsError;

  const existingByTitle = new Map((existingSets ?? []).map((set) => [String(set.name), set]));
  const excludedExisting = [...EXCLUDED_TITLES].filter((title) => existingByTitle.has(title));
  if (excludedExisting.length) {
    throw new Error(`Excluded administrator sets already exist and require review: ${excludedExisting.join(", ")}`);
  }

  const summary = {
    mode: apply ? "apply" : "dry-run",
    ownerId,
    setCount: requestedSets.length,
    cardCount: requestedSets.reduce((total, set) => total + set.lemmas.length, 0),
    uniqueLemmaCount: new Set(requestedSets.flatMap((set) => set.lemmas)).size,
    creates: requestedSets.filter((set) => !existingByTitle.has(set.title)).length,
    synchronizes: requestedSets.filter((set) => existingByTitle.has(set.title)).length,
  };

  if (!apply) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: ownerId, display_name: "Classendo", username: null }, { onConflict: "id" });
  if (profileError) throw profileError;

  const synchronizedIds: string[] = [];
  for (const set of requestedSets) {
    const sourceVerbIds = set.lemmas.map((lemma) => verbsByLemma.get(lemma)!.id);
    const { data: setId, error: syncError } = await supabase.rpc(
      "sync_classendo_admin_verb_set",
      {
        owner_id: ownerId,
        set_name: set.title,
        set_tags: tagsForTitle(set.title),
        source_verb_ids: sourceVerbIds,
      },
    );
    if (syncError) throw new Error(`${set.title}: ${syncError.message}`);
    synchronizedIds.push(String(setId));
  }

  const verification = await verifySeededState(supabase, ownerId, requestedSets, verbsByLemma);
  console.log(
    JSON.stringify(
      { ...summary, synchronizedCount: synchronizedIds.length, ...verification },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
