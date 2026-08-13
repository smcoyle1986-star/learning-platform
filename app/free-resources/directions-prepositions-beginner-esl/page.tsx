import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "directions-prepositions-beginner-esl";
const cards = [{ id: "7895835b-fe27-4bff-b786-82f45f8edd17", word: "go straight" }, { id: "c78f29b5-df43-421e-aff0-37a45bb33a1c", word: "turn left" }, { id: "ed308ad4-d1c2-4d6c-81d9-e08d5f00fb46", word: "turn right" }, { id: "f674604f-d3d3-4435-840c-ee5c3f1a3a0f", word: "go past" }, { id: "c1ca2e17-4ab3-49d5-b57d-83c9f83967a6", word: "go through" }, { id: "fc153ff4-0b37-4f70-9c1f-af61eb621cb5", word: "go around" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Directions Prepositions" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Directions Prepositions", topic: "Directions", words: cards.map((card) => card.word), cards, cardType: "preposition", worksheet: "Classendo Directions Bullseye", activity: "Direction Trail", activityCopy: "", lessonCopy: "" }} />; }
