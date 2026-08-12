import type { Metadata } from "next";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "personality-adjectives-beginner-esl";
const cards = [{ id: "337be4ef-33eb-4325-a61e-6d7cc5368d7d", word: "kind" }, { id: "7a04612f-ec27-4a27-8739-091d37507df3", word: "friendly" }, { id: "99a6f34c-b2f6-4a2e-9fd2-f9458afa35dd", word: "helpful" }, { id: "cc453845-bbb2-460d-89b6-ea1a4f3ab5dd", word: "brave" }, { id: "675af7f8-0d47-4c11-807e-613fe689b5b9", word: "polite" }, { id: "7dcc31b5-5b0a-4f65-b6e6-f332b7efa82b", word: "smart" }];
export const metadata: Metadata = { title: "Free Personality Adjectives Lesson Pack for Beginner ESL", alternates: { canonical: `/free-resources/${slug}` } };
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Personality Adjectives", topic: "Personality", words: cards.map((card) => card.word), cards, cardType: "adjective", worksheet: "Classendo Personality Wordsearch", activity: "Kindness Walk", activityCopy: "", lessonCopy: "" }} />; }
