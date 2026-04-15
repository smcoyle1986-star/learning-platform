import { LessonCard } from "@/lib/lessons/types";

export type WorksheetType =
  | "crossword"
  | "bullseye"
  | "matching"
  | "questions"
  | "reading"
  | "sentence-scramble"
  | "tic-tac-toe"
  | "wordsearch"
  | "writing";

export type WorksheetDifficulty = "easy" | "medium" | "hard";
export type WorksheetClueMode = "image" | "text" | "both";
export type BullseyeVersion = "points" | "around-the-world";
export type BullseyeImageMode = "image" | "text" | "both";

export type WorksheetTypeOption = {
  id: WorksheetType;
  label: string;
  description: string;
  available: boolean;
};

export type WorksheetDraft = {
  type: WorksheetType | null;
  title: string;
  instructions: string;
  difficulty: WorksheetDifficulty;
  clueMode: WorksheetClueMode;
  bullseyeVersion: BullseyeVersion;
  bullseyeImageMode: BullseyeImageMode;
  bullseyeInkSaver: boolean;
  shuffleSeed: number;
};

export type SavedWorksheetRecord = {
  id: string;
  name: string;
  userId: string;
  worksheetType: WorksheetType;
  isPublic: boolean;
  cards: LessonCard[];
  draft: WorksheetDraft;
  createdAt?: string;
  updatedAt?: string;
};

export const DEFAULT_WORKSHEET_DRAFT: WorksheetDraft = {
  type: null,
  title: "",
  instructions: "",
  difficulty: "medium",
  clueMode: "both",
  bullseyeVersion: "points",
  bullseyeImageMode: "image",
  bullseyeInkSaver: false,
  shuffleSeed: 1,
};

export const WORKSHEET_TYPES: WorksheetTypeOption[] = [
  {
    id: "crossword",
    label: "Crossword",
    description: "Randomly place lesson words into a modern crossword with configurable clue support.",
    available: true,
  },
  {
    id: "bullseye",
    label: "Bullseye",
    description: "A circular dart-board style game with images, points, and team score areas.",
    available: true,
  },
  {
    id: "matching",
    label: "Matching",
    description: "Students match pictures and vocabulary items.",
    available: false,
  },
  {
    id: "questions",
    label: "Questions",
    description: "Question and answer practice built from the lesson set.",
    available: false,
  },
  {
    id: "reading",
    label: "Reading",
    description: "Short reading tasks built around the selected lesson vocabulary.",
    available: false,
  },
  {
    id: "sentence-scramble",
    label: "Sentence Scramble",
    description: "Rebuild sentences using the selected target words.",
    available: false,
  },
  {
    id: "tic-tac-toe",
    label: "Tic-Tac-Toe",
    description: "Speaking or writing prompts embedded in a tic-tac-toe grid.",
    available: false,
  },
  {
    id: "wordsearch",
    label: "Wordsearch",
    description: "Find hidden lesson words in a generated grid.",
    available: false,
  },
  {
    id: "writing",
    label: "Writing",
    description: "Guided writing tasks based on the lesson content.",
    available: false,
  },
];

export function buildWorksheetDraft(type: WorksheetType): WorksheetDraft {
  switch (type) {
    case "crossword":
      return {
        type,
        title: "Crossword Worksheet",
        instructions: "Complete the crossword using the lesson clues below.",
        difficulty: "medium",
        clueMode: "both",
        bullseyeVersion: "points",
        bullseyeImageMode: "image",
        bullseyeInkSaver: false,
        shuffleSeed: Date.now(),
      };
    case "bullseye":
      return {
        type,
        title: "Bullseye",
        instructions: "Land in the wedges, score points, and finish at the bullseye.",
        difficulty: "medium",
        clueMode: "image",
        bullseyeVersion: "points",
        bullseyeImageMode: "image",
        bullseyeInkSaver: false,
        shuffleSeed: Date.now(),
      };
    default:
      return {
        ...DEFAULT_WORKSHEET_DRAFT,
        type,
        title: WORKSHEET_TYPES.find((item) => item.id === type)?.label ?? "Worksheet",
      };
  }
}

export function formatWorksheetWord(word: string) {
  return String(word ?? "").replaceAll("_", " ");
}
