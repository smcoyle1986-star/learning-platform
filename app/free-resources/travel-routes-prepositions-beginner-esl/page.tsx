import type { Metadata } from "next";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "travel-routes-prepositions-beginner-esl";
const cards = [{ id: "88b09b61-2140-4a73-b4ca-51b753d2ce18", word: "go to" }, { id: "bb869105-68cf-41ea-bf56-5f6398fb9e6c", word: "head toward" }, { id: "7a9852a3-77c9-40f5-9e13-58eadf060b44", word: "walk along" }, { id: "dc07c543-9f7a-4053-b8fc-99223eb4ad3d", word: "cross" }, { id: "bd28a105-aa49-48db-94a1-42f2a5639122", word: "down" }, { id: "78625bde-6794-41c8-83c1-d3088d164dd2", word: "up" }];
export const metadata: Metadata = { title: "Free Travel Routes Prepositions Lesson Pack for Beginner ESL", alternates: { canonical: `/free-resources/${slug}` } };
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Travel Routes Prepositions", topic: "Travel Routes", words: cards.map((card) => card.word), cards, cardType: "preposition", worksheet: "Classendo Travel Routes Wordsearch", activity: "Map Walk", activityCopy: "", lessonCopy: "" }} />; }
