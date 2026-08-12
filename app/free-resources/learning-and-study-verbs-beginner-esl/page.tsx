import type { Metadata } from "next";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "learning-and-study-verbs-beginner-esl";
const cards = [{ id: "dfa7fc4d-3f29-451f-83a7-a843a30da12d", word: "study" }, { id: "b0315311-e2ec-4b76-b7d0-cea85431ac12", word: "teach" }, { id: "f8e8b8b3-1098-4f94-a1db-65a046cc0689", word: "explain" }, { id: "23d38651-a80d-4a9e-849d-074b34def0b7", word: "plan" }, { id: "96290050-ce27-4b95-b340-d86c94822ed1", word: "understand" }, { id: "e13eb781-3f8b-4723-9931-7626fbdc075b", word: "remember" }];
export const metadata: Metadata = { title: "Free Learning and Study Verbs Lesson Pack for Beginner ESL", alternates: { canonical: `/free-resources/${slug}` } };
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Learning and Study Verbs", topic: "Learning and Study", words: cards.map((card) => card.word), cards, cardType: "verb", worksheet: "Classendo Learning and Study Crossword", activity: "Learning Walk", activityCopy: "", lessonCopy: "" }} />; }
