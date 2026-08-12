import type { Metadata } from "next";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "feelings-adjectives-beginner-esl";
const cards = [{ id: "2c107414-79f7-4f0d-b844-3a3d194065dc", word: "happy" }, { id: "eba38472-26a3-4ddd-b615-c1ecdd7ae086", word: "sad" }, { id: "ab8957ce-df76-4c81-8fe4-bcea78785ef4", word: "angry" }, { id: "ebefb350-3b7b-4486-82be-73a1c7ab2af5", word: "excited" }, { id: "9f97d9e1-7188-48ac-be74-35cae37c9e79", word: "tired" }, { id: "a64f97cf-45c6-4832-80e0-fe13c2eaee69", word: "scared" }];
export const metadata: Metadata = { title: "Free Feelings Adjectives Lesson Pack for Beginner ESL", alternates: { canonical: `/free-resources/${slug}` } };
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Feelings Adjectives", topic: "Feelings", words: cards.map((card) => card.word), cards, cardType: "adjective", worksheet: "Classendo Feelings Crossword", activity: "Emotion Charades", activityCopy: "", lessonCopy: "" }} />; }
