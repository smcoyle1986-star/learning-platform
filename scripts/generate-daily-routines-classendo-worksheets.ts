import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createWorksheetPdfBuffer } from "@/lib/worksheets/pdf";
import type { LessonCard } from "@/lib/lessons/types";
import type { WorksheetDraft } from "@/lib/worksheets/types";

const root = process.cwd();
const outputDir = path.join(root, "tmp/pdfs/daily-routines-classendo");
const base = "https://tsccyjrniiamnwgrtvpw.supabase.co/storage/v1/object/public/vocab-images/verbs";
const words = [
  "wake up", "get dressed", "brush your teeth", "eat breakfast", "go to school", "study",
  "play", "eat dinner", "do homework", "read", "watch TV", "sleep",
];
const imagePath = (word: string) => {
  const key = word.replaceAll(" ", "_");
  return `${base}/${key}/${key}_1.png`;
};
async function createCards(): Promise<LessonCard[]> {
  const watchTvPng = await readFile(
    path.join(root, "public/resources/daily-routines-12-card-lesson-pack-beginner-esl/watch_tv.png")
  );
  const watchTvImage = `data:image/png;base64,${watchTvPng.toString("base64")}`;

  return words.map((word, position) => ({
    id: `daily-routines-${position + 1}`,
    word,
    image: word === "watch TV" ? watchTvImage : imagePath(word),
    position,
    type: "verb",
  }));
}

const common = {
  questionBuilderPrompts: [], readingLines: [], writingLines: [], writingImageMode: "both" as const,
  writingTraceable: false, writingTraceRepeats: 1 as const, sentenceScrambleLines: [],
  sentenceScrambleLevel: "medium" as const, battleshipImageMode: "image" as const,
  battleshipBoardMode: "empty" as const, battleshipWorksheetCount: 1,
  wordsearchListMode: "both" as const, wordsearchAddRandomLetters: false,
  difficulty: "medium" as const, clueMode: "image" as const,
  bullseyeVersion: "points" as const, bullseyeImageMode: "image" as const,
  bullseyeInkSaver: false,
};

const ticTacToe: WorksheetDraft = {
  ...common, type: "tic-tac-toe", title: "Daily Routines Tic-Tac-Toe",
  instructions: "Say the pictured action correctly before writing X or O.",
  ticTacToeImageMode: "both", ticTacToeBoardCount: 4, shuffleSeed: 20260819,
};
const bullseye: WorksheetDraft = {
  ...common, type: "bullseye", title: "Daily Routines Bullseye",
  instructions: "Drop a token, say the target sentence, then take the printed score.",
  ticTacToeImageMode: "both", ticTacToeBoardCount: 1, shuffleSeed: 20260820,
};

async function main() {
  await mkdir(outputDir, { recursive: true });
  const cards = await createCards();
  await Promise.all([
    createWorksheetPdfBuffer(cards, ticTacToe).then((pdf) => writeFile(path.join(outputDir, "tic-tac-toe.pdf"), pdf)),
    createWorksheetPdfBuffer(cards, bullseye).then((pdf) => writeFile(path.join(outputDir, "bullseye.pdf"), pdf)),
  ]);
  console.log(outputDir);
}

void main();
