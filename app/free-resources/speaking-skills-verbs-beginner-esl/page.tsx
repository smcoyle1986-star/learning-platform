import type { Metadata } from "next";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "speaking-skills-verbs-beginner-esl";
const cards = [{ id: "138f825d-291b-457d-9d38-4e8022097a6e", word: "ask" }, { id: "9ea468c1-c9f2-4e54-9588-0dab683f541a", word: "answer" }, { id: "45cd3577-ec12-4324-9c20-eeb4b3199b08", word: "speak" }, { id: "06394a09-62c1-4e34-8376-b9998693f749", word: "talk" }, { id: "2abf23fa-db38-4c5f-b9e5-68e5a4ebb459", word: "listen" }, { id: "9df09c1f-3162-43e6-bc77-b8b7bca567a3", word: "reply" }];
export const metadata: Metadata = { title: "Free Speaking Skills Verbs Lesson Pack for Beginner ESL", alternates: { canonical: `/free-resources/${slug}` } };
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Speaking Skills Verbs", topic: "Speaking Skills", words: cards.map((card) => card.word), cards, cardType: "verb", worksheet: "Classendo Speaking Skills Tic-Tac-Toe", activity: "Conversation Corners", activityCopy: "", lessonCopy: "" }} />; }
