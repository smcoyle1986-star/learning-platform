import type { Metadata } from "next";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "five-senses-verbs-beginner-esl";
const cards = [{ id: "049e9796-f046-4eba-bc7c-fbc4792c7fc2", word: "see" }, { id: "0bfee3b9-2ba8-4a18-9f19-fe9356efdb5f", word: "hear" }, { id: "6fd3b099-1626-4d96-af3a-df8eaae834c6", word: "smell" }, { id: "3c672115-542b-49bc-971e-bd0ab5a2891d", word: "taste" }, { id: "27550aa7-ca3e-40d7-8d73-179962f8160d", word: "touch" }, { id: "84df8d53-19a4-434b-b34d-0afff779add8", word: "feel" }];
export const metadata: Metadata = { title: "Free Five Senses Verbs Lesson Pack for Beginner ESL", alternates: { canonical: `/free-resources/${slug}` } };
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Five Senses Verbs", topic: "Five Senses", words: cards.map((card) => card.word), cards, cardType: "verb", worksheet: "Classendo Five Senses Crossword", activity: "Senses Hunt", activityCopy: "", lessonCopy: "" }} />; }
