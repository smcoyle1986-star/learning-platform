import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type RequestedSet = { title: string; lemmas: string[] };
type AdjectiveRow = { id: string; lemma: string; image_id: string | null };
type CardRow = {
  lesson_set_id: string;
  adjective_id: string | null;
  verb_id: string | null;
  front: string;
  back: string | null;
  position: number;
};

const IMAGE_OPTIONAL_LEMMAS = new Set(["light", "heavy"]);
const TITLE_PATTERN = /^.+ - (Easy|Medium|Hard)$/;

const REQUESTED_SETS: RequestedSet[] = [
  { title: "First Adjectives - Easy", lemmas: ["big", "small", "good", "bad", "happy", "sad"] },
  { title: "Everyday Adjectives - Easy", lemmas: ["hot", "cold", "fast", "slow", "old", "new"] },
  { title: "Common Adjectives - Medium", lemmas: ["easy", "difficult", "clean", "dirty", "open", "closed", "full", "empty", "busy", "quiet"] },
  { title: "Describing People - Easy", lemmas: ["happy", "sad", "friendly", "kind", "funny", "smart"] },
  { title: "Describing Things - Medium", lemmas: ["big", "small", "huge", "long", "short", "light", "heavy", "hard", "soft", "clean", "dirty", "new", "old"] },

  { title: "Colors - Easy", lemmas: ["red", "blue", "green", "yellow", "black", "white"] },
  { title: "Colors - Medium", lemmas: ["red", "blue", "green", "yellow", "black", "white", "orange", "pink", "purple", "brown"] },
  { title: "Colors - Hard", lemmas: ["red", "blue", "green", "yellow", "black", "white", "orange", "pink", "purple", "brown", "gray", "dark blue", "light blue", "dark green", "light green", "colorful", "colorless"] },

  { title: "Feelings - Easy", lemmas: ["happy", "sad", "angry", "scared", "tired", "excited"] },
  { title: "Feelings - Medium", lemmas: ["happy", "sad", "angry", "scared", "tired", "excited", "bored", "nervous", "worried", "surprised", "confused", "calm"] },
  { title: "Feelings - Hard", lemmas: ["amazed", "annoyed", "disappointed", "embarrassed", "encouraged", "exhausted", "frightened", "frustrated", "helpless", "hopeless", "lonely", "restless", "shocked", "stressed", "terrified", "thankful"] },
  { title: "Positive Feelings - Medium", lemmas: ["happy", "calm", "excited", "encouraged", "hopeful", "interested", "proud", "relaxed", "satisfied", "thankful"] },
  { title: "Difficult Feelings - Medium", lemmas: ["angry", "annoyed", "bored", "confused", "disappointed", "embarrassed", "frightened", "frustrated", "lonely", "nervous", "scared", "stressed", "tired", "worried"] },
  { title: "Strong Feelings - Hard", lemmas: ["amazed", "exhausted", "frightened", "shocked", "surprised", "terrified"] },
  { title: "How Do You Feel? - Easy", lemmas: ["hungry", "thirsty", "sleepy", "tired", "hot", "cold"] },

  { title: "Appearance - Easy", lemmas: ["beautiful", "handsome", "pretty", "cute", "ugly", "bald"] },
  { title: "Hair Descriptions - Medium", lemmas: ["long hair", "short hair", "medium-length hair", "straight hair", "curly hair", "wavy hair", "ponytail", "pigtails"] },
  { title: "Looking Clean & Messy - Medium", lemmas: ["clean-looking", "dirty-looking", "messy", "shiny", "dull"] },

  { title: "Personality - Easy", lemmas: ["kind", "mean", "friendly", "funny", "smart", "shy"] },
  { title: "Personality - Medium", lemmas: ["brave", "polite", "rude", "honest", "dishonest", "hardworking", "lazy", "grumpy"] },
  { title: "Positive Personality Traits - Medium", lemmas: ["kind", "friendly", "brave", "polite", "honest", "hardworking", "helpful", "thoughtful", "respectful", "careful", "smart"] },
  { title: "Character & Behavior - Hard", lemmas: ["careful", "careless", "thoughtful", "respectful", "helpful", "honest", "dishonest", "hardworking", "polite", "rude", "brave", "quiet", "silly", "young", "old"] },

  { title: "Quality - Easy", lemmas: ["good", "bad", "great", "easy", "difficult", "simple"] },
  { title: "Value & Usefulness - Medium", lemmas: ["cheap", "expensive", "useful", "useless", "meaningful", "meaningless"] },
  { title: "Condition - Easy", lemmas: ["open", "closed", "full", "empty", "clean", "dirty"] },
  { title: "Condition - Medium", lemmas: ["new", "old", "broken", "fixed", "wet", "dry", "busy", "crowded"] },
  { title: "Safety & Strength - Medium", lemmas: ["safe", "dangerous", "strong", "weak", "harmful", "harmless", "powerful", "powerless"] },
  { title: "Success & Difficulty - Medium", lemmas: ["easy", "difficult", "simple", "successful", "unsuccessful", "good", "bad", "great"] },
  { title: "Describing Places - Medium", lemmas: ["busy", "crowded", "noisy", "quiet", "clean", "dirty", "safe", "dangerous", "new", "old"] },

  { title: "Size - Easy", lemmas: ["big", "small", "huge", "tiny", "tall", "short", "long", "light", "heavy"] },
  { title: "Shapes & Lines - Easy", lemmas: ["flat", "curved", "straight", "bent"] },
  { title: "Width & Thickness - Medium", lemmas: ["wide", "narrow", "thick", "thin"] },
  { title: "Position & Distance - Easy", lemmas: ["high", "low", "near", "far", "deep", "shallow"] },
  { title: "Speed - Easy", lemmas: ["fast", "slow", "quick"] },

  { title: "Taste - Easy", lemmas: ["sweet", "sour", "salty", "bitter", "spicy", "delicious"] },
  { title: "Sound - Easy", lemmas: ["quiet", "loud", "noisy"] },
  { title: "Light & Surface - Medium", lemmas: ["bright", "dark", "shiny", "dull"] },
  { title: "Touch & Temperature - Easy", lemmas: ["hard", "soft", "hot", "cold", "wet", "dry"] },

  { title: "Opposite Adjectives - Easy", lemmas: ["big", "small", "light", "heavy", "happy", "sad", "hot", "cold", "good", "bad", "fast", "slow", "young", "old"] },
  { title: "Opposite Adjectives - Medium", lemmas: ["open", "closed", "full", "empty", "clean", "dirty", "safe", "dangerous", "strong", "weak", "cheap", "expensive"] },
  { title: "Opposite Adjectives - Hard", lemmas: ["useful", "useless", "meaningful", "meaningless", "harmful", "harmless", "successful", "unsuccessful", "powerful", "powerless", "painful", "painless"] },
  { title: "Adjectives Ending in -ful & -less - Hard", lemmas: ["meaningful", "meaningless", "painful", "painless", "powerful", "powerless", "harmful", "harmless", "helpful", "helpless", "hopeful", "hopeless", "careful", "careless", "eventful", "eventless", "tasteful", "tasteless", "colorful", "colorless"] },
];

function loadEnvironment(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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

function validateDefinitions() {
  const duplicateTitles = REQUESTED_SETS.map((set) => set.title).filter((title, index, titles) => titles.indexOf(title) !== index);
  if (duplicateTitles.length) throw new Error(`Duplicate titles: ${[...new Set(duplicateTitles)].join(", ")}`);
  for (const set of REQUESTED_SETS) {
    if (!TITLE_PATTERN.test(set.title) || /\(\d+\)/.test(set.title)) throw new Error(`Invalid title: ${set.title}`);
    if (set.lemmas.length < 2 || set.lemmas.length > 50) throw new Error(`Invalid card count: ${set.title}`);
    if (new Set(set.lemmas).size !== set.lemmas.length) throw new Error(`Duplicate adjective in ${set.title}`);
  }
}

function tagsForTitle(title: string) {
  const difficulty = title.match(/ - (Easy|Medium|Hard)$/)?.[1]?.toLowerCase();
  return ["adjectives", "Classendo", ...(difficulty ? [difficulty] : [])];
}

async function verifyState(supabase: SupabaseClient, ownerId: string, adjectivesByLemma: Map<string, AdjectiveRow>) {
  const { data: profile, error: profileError } = await supabase.from("profiles").select("display_name,username").eq("id", ownerId).single();
  if (profileError) throw profileError;
  if (profile.display_name !== "Classendo" || profile.username !== null) throw new Error("Administrator profile is not displayed as Classendo.");

  const { data: ownerSets, error: setsError } = await supabase.from("lesson_sets").select("id,name,is_public,hidden_at,deleted_at").eq("user_id", ownerId);
  if (setsError) throw setsError;
  const requestedTitles = new Set(REQUESTED_SETS.map((set) => set.title));
  const curatedSets = (ownerSets ?? []).filter((set) => requestedTitles.has(String(set.name)));
  if (curatedSets.length !== REQUESTED_SETS.length) throw new Error(`Expected ${REQUESTED_SETS.length} exact adjective sets; found ${curatedSets.length}.`);

  const setsByTitle = new Map<string, (typeof curatedSets)[number]>();
  for (const set of curatedSets) {
    if (setsByTitle.has(String(set.name))) throw new Error(`Duplicate live title: ${set.name}`);
    if (!set.is_public || set.hidden_at !== null || set.deleted_at !== null) throw new Error(`Community visibility is invalid for ${set.name}.`);
    setsByTitle.set(String(set.name), set);
  }

  const setIds = curatedSets.map((set) => String(set.id));
  const cards: CardRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from("cards").select("lesson_set_id,adjective_id,verb_id,front,back,position").in("lesson_set_id", setIds).order("lesson_set_id").order("position").range(offset, offset + 999);
    if (error) throw error;
    cards.push(...((data ?? []) as CardRow[]));
    if ((data ?? []).length < 1000) break;
  }

  const adjectivesById = new Map([...adjectivesByLemma.values()].map((row) => [row.id, row]));
  for (const requested of REQUESTED_SETS) {
    const liveSet = setsByTitle.get(requested.title);
    if (!liveSet) throw new Error(`Missing live set: ${requested.title}`);
    const liveCards = cards.filter((card) => card.lesson_set_id === liveSet.id).sort((a, b) => a.position - b.position);
    if (liveCards.length !== requested.lemmas.length) throw new Error(`${requested.title} card count is incorrect.`);
    requested.lemmas.forEach((lemma, position) => {
      const card = liveCards[position];
      const adjective = card?.adjective_id ? adjectivesById.get(card.adjective_id) : undefined;
      if (card?.position !== position || card?.front !== lemma || adjective?.lemma !== lemma || card?.back !== adjective.image_id || card?.verb_id !== null) {
        throw new Error(`${requested.title} failed exact validation at position ${position}: ${lemma}`);
      }
    });
  }

  const expectedCards = REQUESTED_SETS.reduce((sum, set) => sum + set.lemmas.length, 0);
  if (cards.length !== expectedCards) throw new Error(`Expected ${expectedCards} cards; found ${cards.length}.`);
  const imageLessCards = cards.filter((card) => card.back === null).map((card) => card.front);
  if (imageLessCards.some((lemma) => !IMAGE_OPTIONAL_LEMMAS.has(lemma))) throw new Error("An unapproved image-less adjective card exists.");
  return { verifiedSetCount: curatedSets.length, verifiedCardCount: cards.length, imageLessCardCount: imageLessCards.length };
}

async function main() {
  const apply = process.argv.includes("--apply");
  loadEnvironment(path.join(process.cwd(), ".env.local"));
  loadEnvironment(path.join(process.cwd(), ".env"));
  validateDefinitions();

  const supabase = createClient(requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"), requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: adjectives, error: adjectivesError } = await supabase.from("adjectives").select("id,lemma,image_id").range(0, 999);
  if (adjectivesError) throw adjectivesError;
  const adjectivesByLemma = new Map<string, AdjectiveRow>();
  for (const adjective of (adjectives ?? []) as AdjectiveRow[]) {
    if (adjectivesByLemma.has(adjective.lemma)) throw new Error(`Duplicate exact adjective lemma: ${adjective.lemma}`);
    adjectivesByLemma.set(adjective.lemma, adjective);
  }

  const requestedLemmas = [...new Set(REQUESTED_SETS.flatMap((set) => set.lemmas))];
  const missing = requestedLemmas.filter((lemma) => !adjectivesByLemma.has(lemma));
  if (missing.length) throw new Error(`Missing exact adjective lemmas: ${missing.join(", ")}`);
  const invalidImages = requestedLemmas.filter((lemma) => {
    const image = adjectivesByLemma.get(lemma)!.image_id;
    return IMAGE_OPTIONAL_LEMMAS.has(lemma) ? image !== null && !image.includes("_1.png") : !String(image ?? "").includes("_1.png");
  });
  if (invalidImages.length) throw new Error(`Invalid adjective image_1 records: ${invalidImages.join(", ")}`);

  const { data: owners, error: ownersError } = await supabase.from("admin_memberships").select("user_id,role").eq("role", "owner");
  if (ownersError) throw ownersError;
  if ((owners ?? []).length !== 1) throw new Error(`Expected exactly one Classendo owner; found ${(owners ?? []).length}.`);
  const ownerId = String(owners![0].user_id);
  const { data: existing, error: existingError } = await supabase.from("lesson_sets").select("id,name").eq("user_id", ownerId);
  if (existingError) throw existingError;
  const existingTitles = new Set((existing ?? []).map((set) => String(set.name)));
  const summary = {
    mode: apply ? "apply" : "dry-run",
    ownerId,
    setCount: REQUESTED_SETS.length,
    cardCount: REQUESTED_SETS.reduce((sum, set) => sum + set.lemmas.length, 0),
    uniqueLemmaCount: requestedLemmas.length,
    creates: REQUESTED_SETS.filter((set) => !existingTitles.has(set.title)).length,
    synchronizes: REQUESTED_SETS.filter((set) => existingTitles.has(set.title)).length,
    currentlyImageLess: requestedLemmas.filter((lemma) => adjectivesByLemma.get(lemma)!.image_id === null),
  };
  if (!apply) return console.log(JSON.stringify(summary, null, 2));

  const { error: profileError } = await supabase.from("profiles").upsert({ id: ownerId, display_name: "Classendo", username: null }, { onConflict: "id" });
  if (profileError) throw profileError;
  for (const set of REQUESTED_SETS) {
    const { error } = await supabase.rpc("sync_classendo_admin_adjective_set", {
      owner_id: ownerId,
      set_name: set.title,
      set_tags: tagsForTitle(set.title),
      source_adjective_ids: set.lemmas.map((lemma) => adjectivesByLemma.get(lemma)!.id),
    });
    if (error) throw new Error(`${set.title}: ${error.message}`);
  }
  console.log(JSON.stringify({ ...summary, ...(await verifyState(supabase, ownerId, adjectivesByLemma)) }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
