import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

import type { LessonCard } from "@/lib/lessons/types";
import type { WorksheetDraft, WorksheetType } from "@/lib/worksheets/types";

const ADMIN_EMAIL = "smcoyle1986@gmail.com";
const WORKSHEET_TYPES: WorksheetType[] = [
  "matching",
  "crossword",
  "wordsearch",
  "battleship",
  "tic-tac-toe",
  "bullseye",
];

const INSTRUCTIONS: Record<WorksheetType, string> = {
  matching: "Draw a line from each picture to the matching word.",
  crossword: "Complete the crossword using the picture and word clues.",
  wordsearch: "Find and circle all the hidden words. Use the pictures or word list for help.",
  battleship: "Take turns calling grid coordinates. Say the matching word when you find a target.",
  "tic-tac-toe": "Choose a square and say the matching word correctly to claim it. Get three in a row.",
  bullseye: "Take turns choosing a section. Say the matching word correctly, then record the points.",
  questions: "",
  reading: "",
  writing: "",
  "sentence-scramble": "",
};

type SourceWorksheet = {
  title: string;
  contentType: "noun" | "verb" | "adjective" | "preposition" | "phonics";
  topic: string;
  worksheetType: WorksheetType;
  sourceSetNames?: string[];
  catalogTheme?: string;
  catalogOffset?: number;
};

const SET_BASED_SOURCES: SourceWorksheet[] = [
  { title: "Classendo Animals Matching", contentType: "noun", topic: "animals", worksheetType: "matching", sourceSetNames: ["Animals - Easy", "Farm Animals - Easy"] },
  { title: "Classendo Food & Drinks Crossword", contentType: "noun", topic: "food & drinks", worksheetType: "crossword", sourceSetNames: ["Food & Drinks - Easy", "Fruit - Easy"] },
  { title: "Classendo Classroom Objects Wordsearch", contentType: "noun", topic: "classroom", worksheetType: "wordsearch", sourceSetNames: ["Classroom Objects - Easy", "Classroom Objects - Medium"] },
  { title: "Classendo Transportation Battleship", contentType: "noun", topic: "transportation", worksheetType: "battleship", sourceSetNames: ["Transportation - Easy", "Transportation - Medium"] },
  { title: "Classendo Weather Tic-Tac-Toe", contentType: "noun", topic: "weather", worksheetType: "tic-tac-toe", sourceSetNames: ["Weather - Easy", "Weather - Medium"] },
  { title: "Classendo Sports Bullseye", contentType: "noun", topic: "sports", worksheetType: "bullseye", sourceSetNames: ["Sports - Easy", "Sports - Hard"] },

  { title: "Classendo Action Verbs Matching", contentType: "verb", topic: "action verbs", worksheetType: "matching", sourceSetNames: ["Action Verbs - Easy", "Action Verbs - Medium"] },
  { title: "Classendo Actions at Home Crossword", contentType: "verb", topic: "actions at home", worksheetType: "crossword", sourceSetNames: ["Actions at Home - Easy", "Actions at Home - Medium"] },
  { title: "Classendo After School Routine Wordsearch", contentType: "verb", topic: "daily routines", worksheetType: "wordsearch", sourceSetNames: ["After School Routine - Easy", "After School Routine - Medium"] },
  { title: "Classendo Asking & Answering Battleship", contentType: "verb", topic: "communication", worksheetType: "battleship", sourceSetNames: ["Asking & Answering - Easy", "Ask, Answer & Reply - Medium"] },
  { title: "Classendo Ball Actions Tic-Tac-Toe", contentType: "verb", topic: "sports actions", worksheetType: "tic-tac-toe", sourceSetNames: ["Ball Actions - Easy"] },
  { title: "Classendo Camping Actions Bullseye", contentType: "verb", topic: "camping", worksheetType: "bullseye", sourceSetNames: ["Camping - Easy"] },

  { title: "Classendo Colors Matching", contentType: "adjective", topic: "colors", worksheetType: "matching", sourceSetNames: ["Colors - Easy", "Colors - Medium"] },
  { title: "Classendo Feelings Crossword", contentType: "adjective", topic: "feelings", worksheetType: "crossword", sourceSetNames: ["Feelings - Easy", "Feelings - Medium"] },
  { title: "Classendo Appearance Wordsearch", contentType: "adjective", topic: "appearance", worksheetType: "wordsearch", sourceSetNames: ["Appearance - Easy", "Hair Descriptions - Medium"] },
  { title: "Classendo Condition Battleship", contentType: "adjective", topic: "condition", worksheetType: "battleship", sourceSetNames: ["Condition - Easy", "Condition - Medium"] },
  { title: "Classendo Everyday Adjectives Tic-Tac-Toe", contentType: "adjective", topic: "everyday adjectives", worksheetType: "tic-tac-toe", sourceSetNames: ["Everyday Adjectives - Easy", "Common Adjectives - Medium"] },
  { title: "Classendo Size & Shape Bullseye", contentType: "adjective", topic: "size and shape", worksheetType: "bullseye", sourceSetNames: ["Size - Easy", "Shapes & Lines - Easy"] },
];

const CATALOG_SOURCES: SourceWorksheet[] = [
  { title: "Classendo Prepositions of Place Matching", contentType: "preposition", topic: "place", worksheetType: "matching", catalogTheme: "place", catalogOffset: 0 },
  { title: "Classendo Movement Prepositions Crossword", contentType: "preposition", topic: "movement", worksheetType: "crossword", catalogTheme: "movement", catalogOffset: 0 },
  { title: "Classendo Directions Wordsearch", contentType: "preposition", topic: "directions", worksheetType: "wordsearch", catalogTheme: "directions", catalogOffset: 0 },
  { title: "Classendo Position & Distance Battleship", contentType: "preposition", topic: "place", worksheetType: "battleship", catalogTheme: "place", catalogOffset: 6 },
  { title: "Classendo Movement Paths Tic-Tac-Toe", contentType: "preposition", topic: "movement", worksheetType: "tic-tac-toe", catalogTheme: "movement", catalogOffset: 3 },
  { title: "Classendo Giving Directions Bullseye", contentType: "preposition", topic: "directions", worksheetType: "bullseye", catalogTheme: "directions", catalogOffset: 1 },

  { title: "Classendo Short A Matching", contentType: "phonics", topic: "short a", worksheetType: "matching", catalogTheme: "short a" },
  { title: "Classendo Short E Crossword", contentType: "phonics", topic: "short e", worksheetType: "crossword", catalogTheme: "short e" },
  { title: "Classendo Short I Wordsearch", contentType: "phonics", topic: "short i", worksheetType: "wordsearch", catalogTheme: "short i" },
  { title: "Classendo Short O Battleship", contentType: "phonics", topic: "short o", worksheetType: "battleship", catalogTheme: "short o" },
  { title: "Classendo Short U Tic-Tac-Toe", contentType: "phonics", topic: "short u", worksheetType: "tic-tac-toe", catalogTheme: "short u" },
  { title: "Classendo Long A Bullseye", contentType: "phonics", topic: "long a", worksheetType: "bullseye", catalogTheme: "long a" },
];

const SOURCES = [...SET_BASED_SOURCES, ...CATALOG_SOURCES];

function readEnv() {
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index > 0) env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return env;
}

function stableSeed(value: string) {
  let seed = 0;
  for (const character of value) seed = ((seed * 31) + character.charCodeAt(0)) >>> 0;
  return Math.max(1, seed);
}

function buildDraft(source: SourceWorksheet): WorksheetDraft {
  return {
    type: source.worksheetType,
    title: source.title,
    instructions: INSTRUCTIONS[source.worksheetType],
    questionBuilderPrompts: [],
    readingLines: [],
    writingLines: [],
    writingImageMode: "both",
    writingTraceable: false,
    writingTraceRepeats: 1,
    sentenceScrambleLines: [],
    sentenceScrambleLevel: "medium",
    ticTacToeImageMode: "both",
    ticTacToeBoardCount: 1,
    battleshipImageMode: "both",
    battleshipBoardMode: "ships",
    battleshipWorksheetCount: 1,
    wordsearchListMode: "both",
    wordsearchAddRandomLetters: true,
    difficulty: "medium",
    clueMode: "both",
    bullseyeVersion: "points",
    bullseyeImageMode: "both",
    bullseyeInkSaver: false,
    shuffleSeed: stableSeed(source.title),
  };
}

function normalizeCards(cards: LessonCard[], expectedType: SourceWorksheet["contentType"]) {
  const seen = new Set<string>();
  return cards
    .filter((card) => {
      const word = String(card.word ?? "").trim().toLowerCase();
      if (!word || seen.has(word)) return false;
      seen.add(word);
      return true;
    })
    .slice(0, 10)
    .map((card, position) => ({
      ...card,
      id: String(card.id),
      word: String(card.word).trim(),
      image: card.image ?? card.back ?? null,
      back: card.back ?? card.image ?? null,
      type: expectedType,
      position,
    }));
}

async function main() {
  if (SOURCES.length !== 30) throw new Error(`Expected 30 worksheet definitions, found ${SOURCES.length}.`);
  for (const contentType of ["noun", "verb", "adjective", "preposition", "phonics"] as const) {
    const types = SOURCES.filter((source) => source.contentType === contentType).map((source) => source.worksheetType);
    if (types.length !== 6 || WORKSHEET_TYPES.some((type) => !types.includes(type))) {
      throw new Error(`${contentType} does not include all six approved worksheet formats.`);
    }
  }

  const env = readEnv();
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw usersError;
  const administrator = users.users.find((user) => String(user.email).toLowerCase() === ADMIN_EMAIL);
  if (!administrator) throw new Error(`Administrator account ${ADMIN_EMAIL} was not found.`);

  const sourceNames = [...new Set(SET_BASED_SOURCES.flatMap((source) => source.sourceSetNames ?? []))];
  const { data: lessonSets, error: lessonSetsError } = await supabase
    .from("lesson_sets")
    .select("id,name")
    .eq("user_id", administrator.id)
    .in("name", sourceNames);
  if (lessonSetsError) throw lessonSetsError;
  const missingNames = sourceNames.filter((name) => !(lessonSets ?? []).some((set) => set.name === name));
  if (missingNames.length) throw new Error(`Missing source lesson sets: ${missingNames.join(", ")}`);

  const lessonIds = (lessonSets ?? []).map((set) => set.id);
  const { data: lessonCards, error: lessonCardsError } = await supabase
    .from("cards")
    .select("id,lesson_set_id,front,back,creator_image_id,content_type,position")
    .in("lesson_set_id", lessonIds)
    .order("position", { ascending: true });
  if (lessonCardsError) throw lessonCardsError;

  const [{ data: prepositions, error: prepositionError }, { data: phonics, error: phonicsError }] = await Promise.all([
    supabase.from("prepositions").select("id,lemma,image_id,themes").order("lemma"),
    supabase.from("phonics").select("id,lemma,image_id,theme").eq("is_active", true).order("lemma"),
  ]);
  if (prepositionError) throw prepositionError;
  if (phonicsError) throw phonicsError;

  const setIdByName = new Map((lessonSets ?? []).map((set) => [String(set.name), String(set.id)]));
  const cardsBySetId = new Map<string, LessonCard[]>();
  for (const card of lessonCards ?? []) {
    const setId = String(card.lesson_set_id);
    const cards = cardsBySetId.get(setId) ?? [];
    cards.push({
      id: String(card.id),
      word: String(card.front ?? ""),
      image: card.back,
      back: card.back,
      creator_image_id: card.creator_image_id,
      type: card.content_type ?? undefined,
      position: card.position,
    });
    cardsBySetId.set(setId, cards);
  }

  const enhancedSchemaResult = await supabase.from("worksheets").select("content_types,tags").limit(1);
  const enhancedSchema = !enhancedSchemaResult.error;
  const targetNames = SOURCES.map((source) => source.title);
  const { data: existingWorksheets, error: existingError } = await supabase
    .from("worksheets")
    .select("id,name")
    .eq("user_id", administrator.id)
    .in("name", targetNames);
  if (existingError) throw existingError;
  const existingNames = new Set((existingWorksheets ?? []).map((worksheet) => String(worksheet.name)));

  const rows = SOURCES.filter((source) => !existingNames.has(source.title)).map((source) => {
    let cards: LessonCard[] = [];
    if (source.sourceSetNames) {
      cards = source.sourceSetNames.flatMap((name) => cardsBySetId.get(setIdByName.get(name) ?? "") ?? []);
    } else if (source.contentType === "preposition") {
      const matching = (prepositions ?? []).filter((row) => (row.themes ?? []).includes(source.catalogTheme));
      const offset = source.catalogOffset ?? 0;
      const selected = [...matching.slice(offset), ...matching.slice(0, offset)].slice(0, 10);
      cards = selected.map((row, position) => ({ id: String(row.id), word: String(row.lemma), image: row.image_id, back: row.image_id, type: "preposition", position }));
    } else {
      const matching = (phonics ?? []).filter((row) => row.theme === source.catalogTheme).slice(0, 10);
      cards = matching.map((row, position) => ({ id: String(row.id), word: String(row.lemma), image: row.image_id, back: row.image_id, type: "phonics", position }));
    }
    const normalizedCards = normalizeCards(cards, source.contentType);
    if (normalizedCards.length < 4) throw new Error(`${source.title} has only ${normalizedCards.length} usable cards.`);
    return {
      user_id: administrator.id,
      name: source.title,
      worksheet_type: source.worksheetType,
      is_public: true,
      cards: normalizedCards,
      draft: buildDraft(source),
      ...(enhancedSchema ? {
        content_types: [source.contentType],
        tags: ["Classendo", "official", source.contentType, source.topic],
      } : {}),
    };
  });

  if (rows.length) {
    const { error: insertError } = await supabase.from("worksheets").insert(rows);
    if (insertError) throw insertError;
  }

  const { data: verified, error: verifyError } = await supabase
    .from("worksheets")
    .select("id,name,worksheet_type,is_public,cards,draft")
    .eq("user_id", administrator.id)
    .in("name", targetNames)
    .order("name");
  if (verifyError) throw verifyError;
  if ((verified ?? []).length !== 30) throw new Error(`Expected 30 saved worksheets, found ${(verified ?? []).length}.`);
  const invalid = (verified ?? []).filter((worksheet) => !worksheet.is_public || !Array.isArray(worksheet.cards) || worksheet.cards.length < 4 || !worksheet.draft?.instructions);
  if (invalid.length) throw new Error(`Worksheet verification failed for: ${invalid.map((worksheet) => worksheet.name).join(", ")}`);

  console.log(JSON.stringify({
    administrator: ADMIN_EMAIL,
    created: rows.length,
    alreadyPresent: 30 - rows.length,
    totalVerified: verified?.length ?? 0,
    enhancedSchema,
    worksheets: (verified ?? []).map((worksheet) => ({ name: worksheet.name, type: worksheet.worksheet_type, cards: worksheet.cards.length })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
