import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "colors-adjectives-beginner-esl";
const cards = [{ id: "8288f798-1c52-46bb-a109-89bd99ae8d21", word: "red" }, { id: "443a9495-1af0-46d8-a3bc-c335f0320c4c", word: "blue" }, { id: "7213e9bb-2847-438a-a34e-dd6917d6aa75", word: "green" }, { id: "401c86eb-41d3-441a-8c87-e915854a5df2", word: "yellow" }, { id: "e9f08570-eaba-4c9e-b22d-7c68b88a8724", word: "black" }, { id: "d995a2e3-9405-45a0-a1bd-9d1fb7768a43", word: "white" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Colors Adjectives" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Colors Adjectives", topic: "Colors", words: cards.map((card) => card.word), cards, cardType: "adjective", worksheet: "Classendo Colors Tic-Tac-Toe", activity: "Color Corners", activityCopy: "", lessonCopy: "" }} />; }
