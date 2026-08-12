import type { Metadata } from "next";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "opposites-adjectives-beginner-esl";
const cards = [{ id: "eabb5ab1-9d88-4e93-9fc3-2569b8a9d47c", word: "clean" }, { id: "c956cdd2-1312-4372-ac86-e0198af4dfbd", word: "dirty" }, { id: "8f4d887b-0e5c-4b02-be0e-4bcec4054d04", word: "open" }, { id: "4e185e75-f1c9-4e84-9a1b-f5e84f6f2b8b", word: "closed" }, { id: "aceb2c44-aa88-4179-a445-2fa6c5621b00", word: "full" }, { id: "0434ba1a-5082-4e81-81b3-856a8643a1d2", word: "empty" }];
export const metadata: Metadata = { title: "Free Opposites Adjectives Lesson Pack for Beginner ESL", alternates: { canonical: `/free-resources/${slug}` } };
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Opposites Adjectives", topic: "Opposites", words: cards.map((card) => card.word), cards, cardType: "adjective", worksheet: "Classendo Opposites Tic-Tac-Toe", activity: "Opposites Relay", activityCopy: "", lessonCopy: "" }} />; }
