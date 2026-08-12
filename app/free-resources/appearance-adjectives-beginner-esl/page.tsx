import type { Metadata } from "next";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "appearance-adjectives-beginner-esl";
const cards = [{ id: "e21ccd7e-b183-4e7f-beaf-56a8f25b02a5", word: "tall" }, { id: "7e2c37e7-7275-495f-8e51-085a52a0d354", word: "short" }, { id: "bd786e81-1d87-43be-bb5e-289a3423a1ef", word: "young" }, { id: "987f36f5-2e3a-403f-8e2b-f357ba4c0629", word: "old" }, { id: "baf3892c-ac81-42c3-9af4-5df7923d26ca", word: "beautiful" }, { id: "f4ff8a2b-ae53-41b8-a6b2-4c3b98f1ee0b", word: "handsome" }];
export const metadata: Metadata = { title: "Free Appearance Adjectives Lesson Pack for Beginner ESL", alternates: { canonical: `/free-resources/${slug}` } };
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Appearance Adjectives", topic: "Appearance", words: cards.map((card) => card.word), cards, cardType: "adjective", worksheet: "Classendo Appearance Wordsearch", activity: "Describe and Find", activityCopy: "", lessonCopy: "" }} />; }
