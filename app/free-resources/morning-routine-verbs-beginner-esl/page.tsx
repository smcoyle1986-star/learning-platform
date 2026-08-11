import type { Metadata } from "next";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";

const slug = "morning-routine-verbs-beginner-esl";
const cards = [{ id: "9dadc73b-81ff-4575-9eea-94c1248702d8", word: "wake up" }, { id: "615ad0ce-7013-4aa9-aa33-a10ee857bd92", word: "brush your teeth" }, { id: "d099adfb-5857-4040-94d3-344157ba8c18", word: "eat breakfast" }, { id: "60120e69-2b57-41cd-aeae-70b757a72c36", word: "get dressed" }, { id: "b20c1c38-5616-46a5-87a4-2f87cd6e5267", word: "go to school" }, { id: "36927cca-9228-4eba-b0ca-89952fefc00a", word: "carry" }];
export const metadata: Metadata = { title: "Free Morning Routine Verbs Lesson Pack for Beginner ESL", alternates: { canonical: `/free-resources/${slug}` } };
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Morning Routine Verbs", topic: "Morning Routine", words: cards.map((card) => card.word), cards, cardType: "verb", worksheet: "Classendo Morning Routine Wordsearch", activity: "Morning Routine Relay", activityCopy: "", lessonCopy: "" }} />; }
