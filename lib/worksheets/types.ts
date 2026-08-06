import { LessonCard } from "@/lib/lessons/types";
import type { LessonContentType } from "@/lib/lessons/types";

export type WorksheetType =
  | "crossword"
  | "bullseye"
  | "matching"
  | "battleship"
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
export type SentenceScrambleLevel = "easy" | "medium" | "hard";
export type TicTacToeImageMode = "image" | "text" | "both";
export type TicTacToeBoardCount = 1 | 2 | 4 | 8;
export type BattleshipImageMode = "image" | "text" | "both";
export type BattleshipBoardMode = "empty" | "ships";

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
  questionBuilderPrompts: string[];
  readingLines: string[];
  writingLines: string[];
  writingImageMode: WorksheetClueMode;
  writingTraceable: boolean;
  writingTraceRepeats: 1 | 2 | 3;
  sentenceScrambleLines: string[];
  sentenceScrambleLevel: SentenceScrambleLevel;
  ticTacToeImageMode: TicTacToeImageMode;
  ticTacToeBoardCount: TicTacToeBoardCount;
  battleshipImageMode: BattleshipImageMode;
  battleshipBoardMode: BattleshipBoardMode;
  battleshipWorksheetCount: number;
  wordsearchListMode: WorksheetClueMode;
  wordsearchAddRandomLetters: boolean;
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
  lastUsed?: string | null;
  useCount?: number;
  downloadCount?: number;
  copiedFrom?: string | null;
  isFavorite?: boolean;
  archivedAt?: string | null;
  contentTypes?: LessonContentType[];
  tags?: string[];
};

export const DEFAULT_WORKSHEET_DRAFT: WorksheetDraft = {
  type: null,
  title: "",
  instructions: "",
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
  battleshipImageMode: "image",
  battleshipBoardMode: "empty",
  battleshipWorksheetCount: 1,
  wordsearchListMode: "both",
  wordsearchAddRandomLetters: false,
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
    available: true,
  },
  {
    id: "battleship",
    label: "Battleship",
    description: "A single landscape board filled with lesson images and grid labels.",
    available: true,
  },
  {
    id: "questions",
    label: "Question Builder",
    description: "Type your own questions directly into a printable worksheet.",
    available: true,
  },
  {
    id: "reading",
    label: "Reading",
    description: "Editable reading practice with an image cue and a writable sentence line.",
    available: true,
  },
  {
    id: "sentence-scramble",
    label: "Sentence Scramble",
    description: "Rebuild sentences using the selected target words.",
    available: true,
  },
  {
    id: "tic-tac-toe",
    label: "Tic-Tac-Toe",
    description: "Speaking or writing prompts embedded in a tic-tac-toe grid.",
    available: true,
  },
  {
    id: "wordsearch",
    label: "Wordsearch",
    description: "Find hidden lesson words in a generated grid.",
    available: true,
  },
  {
    id: "writing",
    label: "Writing",
    description: "Guided writing tasks based on the lesson content.",
    available: true,
  },
];

export function buildWorksheetDraft(type: WorksheetType): WorksheetDraft {
  switch (type) {
    case "crossword":
      return {
        type,
        title: "Crossword Worksheet",
        instructions: "Complete the crossword using the lesson clues below.",
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
        battleshipImageMode: "image",
        battleshipBoardMode: "empty",
        battleshipWorksheetCount: 1,
        wordsearchListMode: "both",
        wordsearchAddRandomLetters: false,
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
        battleshipImageMode: "image",
        battleshipBoardMode: "empty",
        battleshipWorksheetCount: 1,
        wordsearchListMode: "both",
        wordsearchAddRandomLetters: false,
        difficulty: "medium",
        clueMode: "image",
        bullseyeVersion: "points",
        bullseyeImageMode: "image",
        bullseyeInkSaver: false,
        shuffleSeed: Date.now(),
      };
    case "matching":
      return {
        type,
        title: "Matching Worksheet",
        instructions: "Draw a line from each picture to the matching word.",
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
        battleshipImageMode: "image",
        battleshipBoardMode: "empty",
        battleshipWorksheetCount: 1,
        wordsearchListMode: "both",
        wordsearchAddRandomLetters: false,
        difficulty: "medium",
        clueMode: "image",
        bullseyeVersion: "points",
        bullseyeImageMode: "image",
        bullseyeInkSaver: false,
        shuffleSeed: Date.now(),
      };
    case "battleship":
      return {
        type,
        title: "Battleship",
        instructions: "Find the lesson images on the board.",
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
        battleshipImageMode: "image",
        battleshipBoardMode: "empty",
        battleshipWorksheetCount: 1,
        wordsearchListMode: "both",
        wordsearchAddRandomLetters: false,
        difficulty: "medium",
        clueMode: "image",
        bullseyeVersion: "points",
        bullseyeImageMode: "image",
        bullseyeInkSaver: false,
        shuffleSeed: Date.now(),
      };
    case "questions":
      return {
        type,
        title: "Question Builder",
        instructions: "Type your own questions directly into the worksheet.",
        questionBuilderPrompts: Array.from({ length: 8 }, () => ""),
        readingLines: [],
        writingLines: [],
        writingImageMode: "both",
        writingTraceable: false,
        writingTraceRepeats: 1,
        sentenceScrambleLines: [],
        sentenceScrambleLevel: "medium",
        ticTacToeImageMode: "both",
        ticTacToeBoardCount: 1,
        battleshipImageMode: "image",
        battleshipBoardMode: "empty",
        battleshipWorksheetCount: 1,
        wordsearchListMode: "both",
        wordsearchAddRandomLetters: false,
        difficulty: "medium",
        clueMode: "image",
        bullseyeVersion: "points",
        bullseyeImageMode: "image",
        bullseyeInkSaver: false,
        shuffleSeed: Date.now(),
      };
    case "reading":
      return {
        type,
        title: "Reading Worksheet",
        instructions: "Read the sentence next to each image and copy it for handwriting practice.",
        questionBuilderPrompts: [],
        readingLines: Array.from({ length: 8 }, () => ""),
        writingLines: [],
        writingImageMode: "both",
        writingTraceable: false,
        writingTraceRepeats: 1,
        sentenceScrambleLines: [],
        sentenceScrambleLevel: "medium",
        ticTacToeImageMode: "both",
        ticTacToeBoardCount: 1,
        battleshipImageMode: "image",
        battleshipBoardMode: "empty",
        battleshipWorksheetCount: 1,
        wordsearchListMode: "both",
        wordsearchAddRandomLetters: false,
        difficulty: "medium",
        clueMode: "image",
        bullseyeVersion: "points",
        bullseyeImageMode: "image",
        bullseyeInkSaver: false,
        shuffleSeed: Date.now(),
      };
    case "sentence-scramble":
      return {
        type,
        title: "Sentence Scramble",
        instructions: "Write each sentence, then use the scramble controls to mix up the words.",
        questionBuilderPrompts: [],
        readingLines: [],
        writingLines: [],
        writingImageMode: "both",
        writingTraceable: false,
        writingTraceRepeats: 1,
        sentenceScrambleLines: Array.from({ length: 8 }, () => ""),
        sentenceScrambleLevel: "medium",
        ticTacToeImageMode: "both",
        ticTacToeBoardCount: 1,
        battleshipImageMode: "image",
        battleshipBoardMode: "empty",
        battleshipWorksheetCount: 1,
        wordsearchListMode: "both",
        wordsearchAddRandomLetters: false,
        difficulty: "medium",
        clueMode: "image",
        bullseyeVersion: "points",
        bullseyeImageMode: "image",
        bullseyeInkSaver: false,
        shuffleSeed: Date.now(),
      };
    case "wordsearch":
      return {
        type,
        title: "Wordsearch Worksheet",
        instructions: "Find the hidden lesson words in the grid below.",
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
        battleshipImageMode: "image",
        battleshipBoardMode: "empty",
        battleshipWorksheetCount: 1,
        wordsearchListMode: "both",
        wordsearchAddRandomLetters: false,
        difficulty: "medium",
        clueMode: "both",
        bullseyeVersion: "points",
        bullseyeImageMode: "image",
        bullseyeInkSaver: false,
        shuffleSeed: Date.now(),
      };
    case "writing":
      return {
        type,
        title: "Writing",
        instructions: "Trace each word next to the image.",
        questionBuilderPrompts: [],
        readingLines: [],
        writingLines: Array.from({ length: 8 }, () => ""),
        writingImageMode: "both",
        writingTraceable: false,
        writingTraceRepeats: 1,
        sentenceScrambleLines: [],
        sentenceScrambleLevel: "medium",
        ticTacToeImageMode: "both",
        ticTacToeBoardCount: 1,
        battleshipImageMode: "image",
        battleshipBoardMode: "empty",
        battleshipWorksheetCount: 1,
        wordsearchListMode: "both",
        wordsearchAddRandomLetters: false,
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
        battleshipImageMode: "image",
        battleshipBoardMode: "empty",
        battleshipWorksheetCount: 1,
        wordsearchListMode: "both",
        wordsearchAddRandomLetters: false,
      };
  }
}

export function formatWorksheetWord(word: string) {
  return String(word ?? "").replaceAll("_", " ");
}
