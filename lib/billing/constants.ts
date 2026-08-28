import type { WorksheetType } from "@/lib/worksheets/types";

export const PREMIUM_ACTIVE_STATUSES = new Set([
  "trialing",
  "active",
  "past_due",
]);

export const FREE_DASHBOARD_SAVE_LIMIT = 6;

export const PREMIUM_GAME_IDS = [
  "image-reveal",
  "kaboom",
  "spin-and-speak",
  "yes-or-no",
  "choose-your-side",
  "four-corners",
  "memory-flip",
  "connect-four",
  "conquer",
  "whack-a-word",
] as const;

export const PREMIUM_WORKSHEET_TYPES: WorksheetType[] = [
  "crossword",
  "bullseye",
  "matching",
  "battleship",
  "questions",
  "reading",
  "sentence-scramble",
  "tic-tac-toe",
  "wordsearch",
  "writing",
];
