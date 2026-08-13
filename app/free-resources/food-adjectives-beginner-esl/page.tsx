import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "food-adjectives-beginner-esl";
const cards = [{ id: "955ac4e3-a03d-4277-a3f5-fbca0c34b1e8", word: "sweet" }, { id: "97c9ee8c-7fbf-4926-8273-9b8165797154", word: "salty" }, { id: "68aeee35-9730-4fa9-a12c-9019febc4ec3", word: "sour" }, { id: "4dc014b2-286c-4b9f-946d-6f77f8f4364c", word: "bitter" }, { id: "b9031dc6-8b90-4dcb-b5e8-44ad367eadfb", word: "spicy" }, { id: "b577fd65-9a90-4eb0-982a-67b018d3facb", word: "delicious" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Food Adjectives" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Food Adjectives", topic: "Food", words: cards.map((card) => card.word), cards, cardType: "adjective", worksheet: "Classendo Food Bullseye", activity: "Taste Corners", activityCopy: "", lessonCopy: "" }} />; }
