import type { Metadata } from "next";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "size-and-shape-adjectives-beginner-esl";
const cards = [{ id: "c12795a4-b0ed-47d1-8790-77d42a4fa743", word: "big" }, { id: "0853882a-af45-4e42-936e-c47841882c7e", word: "small" }, { id: "df6f494b-f79a-4c04-9a9f-85d52d2411da", word: "huge" }, { id: "2b138ddb-a54c-4008-81e9-32056e3d7c2f", word: "tiny" }, { id: "b78de0f6-4134-4eea-abcf-67f9e2f8d1a4", word: "long" }, { id: "7e2c37e7-7275-495f-8e51-085a52a0d354", word: "short" }];
export const metadata: Metadata = { title: "Free Size and Shape Adjectives Lesson Pack for Beginner ESL", alternates: { canonical: `/free-resources/${slug}` } };
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Size and Shape Adjectives", topic: "Size and Shape", words: cards.map((card) => card.word), cards, cardType: "adjective", worksheet: "Classendo Size and Shape Wordsearch", activity: "Size Hunt", activityCopy: "", lessonCopy: "" }} />; }
