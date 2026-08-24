import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createWorksheetPdfBuffer } from "@/lib/worksheets/pdf";
import type { LessonCard } from "@/lib/lessons/types";
import type { WorksheetDraft } from "@/lib/worksheets/types";
const words = ["big", "small", "hot", "cold", "fast", "slow", "old", "young", "clean", "dirty", "happy", "sad"];
const cards: LessonCard[] = words.map((word, position) => ({ id: `opposites-${position + 1}`, word, position, type: "noun", image: `https://tsccyjrniiamnwgrtvpw.supabase.co/storage/v1/object/public/vocab-images/adjectives/${word}/${word}_1.png` }));
const dir = path.join(process.cwd(), "tmp/pdfs/opposites-classendo");
const common = { questionBuilderPrompts: [], readingLines: [], writingLines: [], writingImageMode: "both" as const, writingTraceable: false, writingTraceRepeats: 1 as const, sentenceScrambleLines: [], sentenceScrambleLevel: "medium" as const, battleshipImageMode: "image" as const, battleshipBoardMode: "empty" as const, battleshipWorksheetCount: 1, wordsearchListMode: "both" as const, wordsearchAddRandomLetters: false, difficulty: "medium" as const, clueMode: "image" as const, bullseyeVersion: "points" as const, bullseyeImageMode: "image" as const, bullseyeInkSaver: false };
const tic: WorksheetDraft = { ...common, type: "tic-tac-toe", title: "Opposites Tic-Tac-Toe", instructions: "Say the pictured opposite correctly before writing X or O.", ticTacToeImageMode: "both", ticTacToeBoardCount: 4, shuffleSeed: 20260914 };
const bull: WorksheetDraft = { ...common, type: "bullseye", title: "Opposites Bullseye", instructions: "Drop a token, say It is ___, then take the printed score.", ticTacToeImageMode: "both", ticTacToeBoardCount: 1, shuffleSeed: 20260915 };
async function main() { await mkdir(dir, { recursive: true }); await Promise.all([createWorksheetPdfBuffer(cards, tic).then((pdf) => writeFile(path.join(dir, "tic-tac-toe.pdf"), pdf)), createWorksheetPdfBuffer(cards, bull).then((pdf) => writeFile(path.join(dir, "bullseye.pdf"), pdf))]); console.log(dir); }
void main();
