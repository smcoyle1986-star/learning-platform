import type { Metadata } from "next";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "place-prepositions-beginner-esl";
const cards = [{ id: "00306cb3-5964-4ac5-9d65-0c770f008303", word: "in" }, { id: "48143e48-4f17-4d1d-99e5-5b4491783ce4", word: "on" }, { id: "0a8b8c7c-a054-44b9-91c1-97538147d4c9", word: "under" }, { id: "38360ad3-df2e-46ca-b12f-c583042391e0", word: "above" }, { id: "2e37fc0d-3109-4a88-9a6e-1610fc2ac911", word: "below" }, { id: "ed4e9e79-9a57-4c57-94a9-4f5633d6234f", word: "next to" }];
export const metadata: Metadata = { title: "Free Place Prepositions Lesson Pack for Beginner ESL", alternates: { canonical: `/free-resources/${slug}` } };
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Place Prepositions", topic: "Place", words: cards.map((card) => card.word), cards, cardType: "preposition", worksheet: "Classendo Place Wordsearch", activity: "Classroom Position Hunt", activityCopy: "", lessonCopy: "" }} />; }
