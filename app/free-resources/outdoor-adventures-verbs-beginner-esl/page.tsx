import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "outdoor-adventures-verbs-beginner-esl";
const cards = [{ id: "351e9b76-5e52-4146-91bc-e7250c5cbbd9", word: "go hiking" }, { id: "da175178-b9c8-4c39-8fd1-198e458866e4", word: "go camping" }, { id: "3ac575aa-0b90-483d-9572-ec533dacc9aa", word: "go fishing" }, { id: "23fbd5d0-136a-42c7-b0bd-a0d4f558a1d6", word: "climb" }, { id: "d0911dbf-4369-4da3-a7c4-c62e8eacd643", word: "dig" }, { id: "7eee5821-0c44-45d7-8ffb-df6cf1c2dc67", word: "travel" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Outdoor Adventures Verbs" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Outdoor Adventures Verbs", topic: "Outdoor Adventures", words: cards.map((card) => card.word), cards, cardType: "verb", worksheet: "Classendo Outdoor Adventures Bullseye", activity: "Adventure Trail", activityCopy: "", lessonCopy: "" }} />; }
