import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "travel-actions-verbs-beginner-esl";
const cards = [{ id: "bb453f77-1565-43d5-b091-6a97a48a7397", word: "walk" }, { id: "15331ada-761e-45e3-9b1a-b40de85099a3", word: "ride" }, { id: "c2f3295e-4335-4f0a-9934-49ac0b3b8435", word: "drive" }, { id: "1d3c98ef-8a50-47a4-a256-9286d4613fbc", word: "take the bus" }, { id: "f838fa69-a4ca-4112-9ef2-8894c4268a4d", word: "take the train" }, { id: "7eee5821-0c44-45d7-8ffb-df6cf1c2dc67", word: "travel" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Travel Actions Verbs" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Travel Actions Verbs", topic: "Travel Actions", words: cards.map((card) => card.word), cards, cardType: "verb", worksheet: "Classendo Travel Actions Wordsearch", activity: "Travel Stations", activityCopy: "", lessonCopy: "" }} />; }
