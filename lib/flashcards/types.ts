export type WordType = "noun" | "verb" | "adjective" | "phonics" | "preposition";

export type Card = {
  id: string;
  word: string;
  image: string;
  type: WordType;
  countability?: "count" | "uncount" | "both";
  themes?: string[];
};

export type TrayItem = {
  id: string;
  word: string;
  image: string;
  type: Card["type"];
};

export type CarouselEntry = {
  index: number;
  animating: boolean;
  direction: "left" | "right";
  nextIndex: number;
  phase: "start" | "move";
};

export const FLASHCARD_THEMES: Record<WordType, string[]> = {
  noun: [
    "animals baby",
    "animals land",
    "animals sea",
    "body",
    "classroom",
    "clothes",
    "dates",
    "drink",
    "family",
    "food",
    "fruit",
    "furniture",
    "health",
    "holidays",
    "jobs",
    "nature",
    "numbers",
    "people",
    "places",
    "rooms",
    "sports",
    "subjects",
    "time",
    "toys",
    "transport",
    "utensils",
    "vegetables",
    "weather",
  ],
  verb: ["activities", "action", "mental processes", "communication", "sensing"],
  adjective: [
    "condition",
    "size",
    "appearance",
    "personality",
    "feelings",
    "colors",
    "causes",
    "ful_less",
  ],
  phonics: [
    "alphabet",
    "short a",
    "short e",
    "short i",
    "short o",
    "short u",
    "long a",
    "long i",
    "long o",
    "long u",
    "double consonants",
    "double vowel",
    "sight words",
  ],
  preposition: ["place", "movement"],
};
