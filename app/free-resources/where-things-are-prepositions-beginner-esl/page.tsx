import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "where-things-are-prepositions-beginner-esl";
const cards = [{ id: "40994934-8d87-406e-ba4d-9544544a6533", word: "behind" }, { id: "67cc71fa-bae3-48a1-86d1-ec59e8fe88ae", word: "in front of" }, { id: "a96a1354-d4e2-4f6a-bc67-1e2ed711943e", word: "between" }, { id: "2b2215dc-8169-4205-be92-a3300d0b14b9", word: "near" }, { id: "21f9baba-2666-4e16-b7ce-f3cfa384cb6f", word: "far from" }, { id: "f96f65ac-5f79-48e4-927e-3b6769076341", word: "among" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Where Things Are Prepositions" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Where Things Are Prepositions", topic: "Where Things Are", words: cards.map((card) => card.word), cards, cardType: "preposition", worksheet: "Classendo Where Things Are Tic-Tac-Toe", activity: "Find the Object", activityCopy: "", lessonCopy: "" }} />; }
