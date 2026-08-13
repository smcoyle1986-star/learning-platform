import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "movement-prepositions-beginner-esl";
const cards = [{ id: "83f0967e-6798-4b14-abff-1e38dc4c323b", word: "into" }, { id: "47fba3c6-921a-4f55-8b4b-833b7e51f5c7", word: "onto" }, { id: "9e0c966e-476e-466b-8fe1-8f766abb7898", word: "across" }, { id: "ef3cfbc9-eff1-480c-be2d-8b54fb79f31b", word: "around" }, { id: "a197ee4b-0341-4721-b4b5-a2950b382129", word: "through" }, { id: "114f8bd2-f33d-44f7-b9ab-5772398436a9", word: "over" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Movement Prepositions" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Movement Prepositions", topic: "Movement", words: cards.map((card) => card.word), cards, cardType: "preposition", worksheet: "Classendo Movement Crossword", activity: "Preposition Obstacle Course", activityCopy: "", lessonCopy: "" }} />; }
