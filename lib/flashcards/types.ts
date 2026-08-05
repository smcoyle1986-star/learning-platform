export type WordType = "noun" | "verb" | "adjective" | "phonics" | "preposition";
export type CardType = WordType | "custom";

export type Card = {
  id: string;
  word: string;
  image: string;
  type: CardType;
  countability?: "count" | "uncount" | "both";
  themes?: string[];
  creatorImageId?: string;
  creatorCardId?: string;
};

export type TrayItem = {
  id: string;
  word: string;
  image: string;
  type: Card["type"];
  creator_image_id?: string | null;
};

export type CarouselEntry = {
  index: number;
  animating: boolean;
  direction: "left" | "right";
  nextIndex: number;
  phase: "start" | "move";
};

export type FlashcardImageVariant = {
  url: string;
  isPremium: boolean;
};

export type ThemeOption = {
  label: string;
  value: string;
};

export type ThemeGroup = {
  title: string;
  items: ThemeOption[];
  tone?: "grammar" | "meaning";
};

export const ADJECTIVE_THEME_GROUPS: ThemeGroup[] = [
  {
    title: "Grammar Themes",
    tone: "grammar",
    items: [
      { label: "comparatives", value: "comparative" },
      { label: "superlatives", value: "superlative" },
      { label: "adverbs", value: "adverb" },
    ],
  },
  {
    title: "Meaning Themes",
    tone: "meaning",
    items: [
      { label: "appearance", value: "appearance" },
      { label: "colors", value: "colors" },
      { label: "feelings", value: "feelings" },
      { label: "condition", value: "condition" },
      { label: "quality", value: "quality" },
      { label: "senses", value: "senses" },
      { label: "position", value: "position" },
      { label: "speed", value: "speed" },
      { label: "personality", value: "personality" },
      { label: "size", value: "size" },
    ],
  },
];

export const FLASHCARD_THEMES: Record<WordType, string[]> = {
  noun: [
    "animals",
    "body",
    "buildings & places",
    "classroom",
    "clothing",
    "family",
    "food & drinks",
    "furniture & home",
    "health",
    "holidays & events",
    "jobs",
    "kitchen",
    "nature",
    "people",
    "school subjects",
    "sports & hobbies",
    "time",
    "toys & games",
    "transportation",
    "weather",
  ],
  verb: [
    "action",
    "daily life",
    "communication",
    "sensing",
    "thinking",
    "movement",
    "play & hobbies",
  ],
  adjective: [
    "comparative",
    "superlative",
    "adverb",
    "appearance",
    "colors",
    "feelings",
    "condition",
    "quality",
    "senses",
    "position",
    "speed",
    "personality",
    "size",
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
  preposition: ["place", "movement", "directions"],
};
