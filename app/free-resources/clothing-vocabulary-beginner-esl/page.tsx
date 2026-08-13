import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "clothing-vocabulary-beginner-esl";
const cards = [{ id: "0fb7d109-e3a0-4933-b27c-62dba1da4c7b", word: "t-shirt" }, { id: "b5f50646-2429-43a2-b25b-6f47e36b9668", word: "hat" }, { id: "e790cffa-2ade-497e-9660-b5d43f799645", word: "shoes" }, { id: "5c701855-f6f5-42aa-b66e-d6f260faf3c1", word: "socks" }, { id: "08fbc138-591b-4c63-9ba8-fe3edf8cdd65", word: "jacket" }, { id: "87337b2c-2896-4f10-9ef1-a115abd17d90", word: "jeans" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Clothing Vocabulary" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Clothing Vocabulary", topic: "Clothing", words: cards.map(card => card.word), cards, worksheet: "Clothing wordsearch and writing", activity: "Fashion Show speaking activity", activityCopy: "Use picture cards to say what you are wearing.", lessonCopy: "How to set up and play the Fashion Show." }} />; }
