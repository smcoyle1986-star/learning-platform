import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { buildWorksheetPreviewHtml } from "@/lib/worksheets/export";
import { buildWorksheetDraft } from "@/lib/worksheets/types";

const root = process.cwd();
const asset = path.join(root, "public/resources/food-vocabulary-beginner-esl");
const imageBase = "https://tsccyjrniiamnwgrtvpw.supabase.co/storage/v1/object/public/vocab-images/nouns";
const cards = [
  ["4602822b-bde8-4c62-8167-6226afd351f7", "apple", "apple/apple_1.png"], ["901cb73f-ebe8-432c-b068-8e89b195395c", "banana", "banana/banana_1.png"], ["dc1838a6-a1d5-434a-bab7-7abc0976f8d0", "bread", "bread/bread_1.png"], ["62df7251-53bf-4b39-bd36-6a0fed1bc6c8", "cheese", "cheese/cheese_1.png"], ["ca714725-767e-403b-8f5b-8a43cd6aab95", "pizza", "pizza/pizza_1.png"], ["d654d89c-23e7-4349-ac93-019b8f2ebdd8", "rice", "rice/rice_1.png"],
].map(([id, word, image], position) => ({ id, word, image: `${imageBase}/${image}`, back: `${imageBase}/${image}`, type: "noun", position }));
async function make(type: "battleship" | "bullseye", filename: string, title: string, instructions: string) {
  const draft = { ...buildWorksheetDraft(type), title, instructions, shuffleSeed: 17, battleshipImageMode: "both" as const, battleshipBoardMode: "empty" as const, bullseyeImageMode: "both" as const, bullseyeVersion: "points" as const };
  const html = await buildWorksheetPreviewHtml(cards, draft, { includeTeacherCopy: false, previewMode: false });
  const browser = await chromium.launch({ headless: true }); const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } }); await page.setContent(html, { waitUntil: "networkidle" }); await page.pdf({ path: path.join("/private/tmp", filename), landscape: true, format: "A4", printBackground: true }); await page.screenshot({ path: path.join(asset, `food-vocabulary-${type}-pinterest.png`), fullPage: true }); await browser.close();
}
async function main() {
  await make("battleship", "food-battleship.pdf", "Food Battleship", "On your own grid, draw five ships and keep them hidden from your partner. Take turns calling a food word and coordinate. Your partner says hit or miss. Sink all ships to win.");
  await make("bullseye", "food-bullseye.pdf", "Food Bullseye", "Drop a small token. Say: I like ___. Score the points when you say it correctly.");
}
main();
