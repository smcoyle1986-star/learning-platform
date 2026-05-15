import { LessonRecord } from "@/lib/lessons/types";
import { LessonLevel, LessonPlanDraft } from "@/lib/lesson-plans/types";

type PlanActivity = {
  time: string;
  title: string;
  detail: string;
};

type PlanSuggestion = {
  games: string[];
  worksheets: string[];
};

const BEGINNER_GAMES = ["Yes or No?", "Image Reveal", "Four Corners", "Memory Flip"];
const MIDDLE_GAMES = ["Spin and Speak", "KaBoom!", "Memory Flip", "Four Corners"];
const HIGH_GAMES = ["Conquer", "Connect Four", "Spin and Speak", "Yes or No?"];

const BEGINNER_WORKSHEETS = ["Writing", "Bullseye", "Tic-Tac-Toe"];
const MIDDLE_WORKSHEETS = ["Wordsearch", "Sentence Scramble", "Question Builder"];
const HIGH_WORKSHEETS = ["Question Builder", "Reading", "Wordsearch", "Writing"];

function cleanWord(word?: string) {
  return (word ?? "").replaceAll("_", " ").trim();
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function uniqueByOrder(items: string[]) {
  return Array.from(new Set(items));
}

function rotatePick(items: string[], seed: number, count: number) {
  if (items.length === 0) return [];
  const rotated = [...items];
  const shift = seed % rotated.length;
  for (let i = 0; i < shift; i += 1) {
    rotated.push(rotated.shift() as string);
  }
  return uniqueByOrder(rotated).slice(0, count);
}

function getSuggestions(level: LessonLevel, seed: number): PlanSuggestion {
  const pool =
    level === "beginner"
      ? { games: BEGINNER_GAMES, worksheets: BEGINNER_WORKSHEETS }
      : level === "middle"
        ? { games: MIDDLE_GAMES, worksheets: MIDDLE_WORKSHEETS }
        : { games: HIGH_GAMES, worksheets: HIGH_WORKSHEETS };

  const games = rotatePick(pool.games, seed, 3);
  const worksheets = rotatePick(pool.worksheets, seed + 1, 2);
  return { games, worksheets };
}

function buildActivities(level: LessonLevel, lesson: LessonRecord, seed: number): PlanActivity[] {
  const words = lesson.cards.map((card) => cleanWord(card.word)).filter(Boolean);
  const sample = words.slice(0, 4).join(", ") || "the target vocabulary";
  const suggestions = getSuggestions(level, seed);

  if (level === "beginner") {
    return [
      {
        time: "0-5 min",
        title: "Welcome + visual warm-up",
        detail: `Start with quick image naming and a yes/no check using ${sample}.`,
      },
      {
        time: "5-15 min",
        title: "Teacher model",
        detail: `Use ${suggestions.games[0]} to model the key words, keep answers short, and repeat the sound with the class.`,
      },
      {
        time: "15-25 min",
        title: "Guided game practice",
        detail: `Play ${suggestions.games[1]} with the same lesson cards so students see, hear, and say the words together.`,
      },
      {
        time: "25-40 min",
        title: "Worksheet support",
        detail: `Move into ${suggestions.worksheets[0]} or ${suggestions.worksheets[1]} so students can trace, match, or sort the words with support.`,
      },
      {
        time: "40-50 min",
        title: "Final review",
        detail: `Close with ${suggestions.games[2]} and a short oral exit check using the easiest words from the lesson tray.`,
      },
    ];
  }

  if (level === "middle") {
    return [
      {
        time: "0-5 min",
        title: "Starter recall",
        detail: `Ask the class to quickly name or describe ${sample} to activate prior learning.`,
      },
      {
        time: "5-15 min",
        title: "Teacher-led input",
        detail: `Use ${suggestions.games[0]} to introduce the lesson focus and check understanding with whole-class responses.`,
      },
      {
        time: "15-25 min",
        title: "Active practice",
        detail: `Run ${suggestions.games[1]} so students can answer, score, and keep the pace moving.`,
      },
      {
        time: "25-40 min",
        title: "Worksheet application",
        detail: `Use ${suggestions.worksheets[0]} and then ${suggestions.worksheets[1]} to mix reading, writing, and word recognition.`,
      },
      {
        time: "40-50 min",
        title: "Independent challenge",
        detail: `Finish with one final round of ${suggestions.games[2]} and a quick spoken or written exit task.`,
      },
    ];
  }

  return [
    {
      time: "0-5 min",
      title: "Quick opener",
      detail: `Start with a short recall prompt built around ${sample} and ask students to justify their answers.`,
    },
    {
      time: "5-15 min",
      title: "Challenge input",
      detail: `Use ${suggestions.games[0]} to push reasoning, accuracy, and classroom discussion.`,
    },
    {
      time: "15-25 min",
      title: "Strategy round",
      detail: `Move into ${suggestions.games[1]} so teams have to think, compare, and choose carefully.`,
    },
    {
      time: "25-40 min",
      title: "Worksheet depth",
      detail: `Set ${suggestions.worksheets[0]} and ${suggestions.worksheets[1]} for more independent reading, writing, and word use.`,
    },
    {
      time: "40-50 min",
      title: "Plenary",
      detail: `Close with ${suggestions.games[2]} and a short reflection on the strongest language from the lesson.`,
    },
  ];
}

function buildObjective(level: LessonLevel, lesson: LessonRecord) {
  const base = cleanWord(lesson.name);
  if (level === "beginner") {
    return `Students will recognise and say the core ${base.toLowerCase()} words with strong visual support.`;
  }
  if (level === "middle") {
    return `Students will use ${base.toLowerCase()} vocabulary in short responses, comparisons, and quick classroom tasks.`;
  }
  return `Students will apply ${base.toLowerCase()} vocabulary in more independent speaking, reading, and writing tasks.`;
}

function buildMaterials(level: LessonLevel, lesson: LessonRecord, seed: number) {
  const suggestions = getSuggestions(level, seed);
  const sampleWords = lesson.cards
    .slice(0, 6)
    .map((card) => cleanWord(card.word))
    .filter(Boolean);
  const cardWords = sampleWords.length ? ` Sample words: ${sampleWords.join(", ")}.` : "";
  return `Classendo lesson tray, whiteboard, and selected activities for the session. Recommended games: ${suggestions.games.join(", ")}. Recommended worksheets: ${suggestions.worksheets.join(", ")}.${cardWords}`;
}

export function buildLessonPlanDraft(lesson: LessonRecord, level: LessonLevel, variant: number): LessonPlanDraft {
  const seed = hashString(`${lesson.id}:${level}:${variant}:${lesson.cards.map((card) => card.id).join("|")}`);
  const suggestions = getSuggestions(level, seed);
  const activities = buildActivities(level, lesson, seed);
  const keyWords = lesson.cards
    .slice(0, 6)
    .map((card) => cleanWord(card.word))
    .filter(Boolean)
    .join(", ");

  return {
    selectedLessonId: lesson.id,
    level,
    variant,
    title: `${lesson.name} Lesson Plan`,
    focus: `${lesson.name} for ${level} learners`,
    objective: buildObjective(level, lesson),
    materials: buildMaterials(level, lesson, seed),
    schedule: activities.map((item) => `${item.time} · ${item.title} — ${item.detail}`).join("\n"),
    recommendedGames: suggestions.games.join(" · "),
    recommendedWorksheets: suggestions.worksheets.join(" · "),
    warmUp:
      level === "beginner"
        ? `Use picture pointing and chorus repetition with ${keyWords || "the lesson cards"}.`
        : level === "middle"
          ? `Start with a quick retrieval warm-up using the most familiar cards from the lesson tray.`
          : `Start with a rapid recall and justify-the-answer warm-up using the strongest cards from the lesson tray.`,
    guidedPractice:
      level === "beginner"
        ? `Model the language with ${suggestions.games[0]} and keep the class moving through clear, short answers.`
        : level === "middle"
          ? `Model the target language, then use ${suggestions.games[0]} and ${suggestions.games[1]} to check understanding.`
          : `Model the target language and push students to explain choices, compare cards, and defend answers during ${suggestions.games[0]} and ${suggestions.games[1]}.`,
    independentPractice:
      level === "beginner"
        ? `Use ${suggestions.worksheets[0]} for trace, match, or circle-and-say practice with support.`
        : level === "middle"
          ? `Use ${suggestions.worksheets[0]} or ${suggestions.worksheets[1]} for a short independent task with light teacher support.`
          : `Use ${suggestions.worksheets[0]} and ${suggestions.worksheets[1]} for reading, writing, and challenge practice with less support.`,
    wrapUp:
      level === "beginner"
        ? `Finish with ${suggestions.games[2]} and one spoken sentence using a familiar card.`
        : level === "middle"
          ? `Finish with ${suggestions.games[2]} and a quick exit question using the lesson language.`
          : `Finish with ${suggestions.games[2]} and a short reflection on the strongest language from today.`,
    assessment:
      level === "beginner"
        ? `Check whether students can recognise the images and say the target words with prompts.`
        : level === "middle"
          ? `Check whether students can identify, read, and use the target words in short responses.`
          : `Check whether students can use the target language accurately with less teacher support.`,
    notes: `50-minute lesson flow built around ${suggestions.games.join(", ")} and ${suggestions.worksheets.join(", ")}.`,
  };
}
