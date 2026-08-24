import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createWorksheetPdfBuffer } from "@/lib/worksheets/pdf";
import type { LessonCard } from "@/lib/lessons/types";
import type { WorksheetDraft } from "@/lib/worksheets/types";

const root = process.cwd();
const dir = path.join(root, "tmp/pdfs/classroom-english-classendo");
const entries = [["listen","listen"],["look","look"],["read","read"],["write","write"],["draw","draw"],["cut","cut"],["glue","glue"],["color","color"],["open","open"],["ask","ask"],["answer","answer"],["raise your hand","raise_your_hand"]] as const;
const cards: LessonCard[] = entries.map(([word,key], position) => ({ id:`classroom-${position + 1}`, word, position, type:"verb", image:`https://tsccyjrniiamnwgrtvpw.supabase.co/storage/v1/object/public/vocab-images/verbs/${key}/${key}_1.png` }));
const common = { questionBuilderPrompts:[],readingLines:[],writingLines:[],writingImageMode:"both" as const,writingTraceable:false,writingTraceRepeats:1 as const,sentenceScrambleLines:[],sentenceScrambleLevel:"medium" as const,battleshipImageMode:"image" as const,battleshipBoardMode:"empty" as const,battleshipWorksheetCount:1,wordsearchListMode:"both" as const,wordsearchAddRandomLetters:false,difficulty:"medium" as const,clueMode:"image" as const,bullseyeVersion:"points" as const,bullseyeImageMode:"image" as const,bullseyeInkSaver:false };
const tic: WorksheetDraft = { ...common,type:"tic-tac-toe",title:"Classroom Actions Tic-Tac-Toe",instructions:"Say the pictured classroom action correctly before writing X or O.",ticTacToeImageMode:"both",ticTacToeBoardCount:4,shuffleSeed:20260821 };
const bull: WorksheetDraft = { ...common,type:"bullseye",title:"Classroom Actions Bullseye",instructions:"Drop a token, say the target sentence, then take the printed score.",ticTacToeImageMode:"both",ticTacToeBoardCount:1,shuffleSeed:20260822 };
async function main(){await mkdir(dir,{recursive:true});await Promise.all([createWorksheetPdfBuffer(cards,tic).then(pdf=>writeFile(path.join(dir,"tic-tac-toe.pdf"),pdf)),createWorksheetPdfBuffer(cards,bull).then(pdf=>writeFile(path.join(dir,"bullseye.pdf"),pdf))]);console.log(dir)}
void main();
