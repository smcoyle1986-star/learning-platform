import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "speed-and-difficulty-adjectives-beginner-esl";
const cards = [{ id: "9e27c123-ff9c-4545-9099-38e23c3a6369", word: "fast" }, { id: "2be477b5-5f5f-4232-9dd5-39ce23214035", word: "slow" }, { id: "98c6534b-7327-4654-89fa-2b9f7ae17e62", word: "easy" }, { id: "569f638f-d65d-4d5a-8b3a-a8f7d2c54733", word: "difficult" }, { id: "72186ff6-c66c-4100-addb-9a8728acf142", word: "strong" }, { id: "ba7a81c9-44c0-4aaa-9454-411137098f47", word: "weak" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Speed and Difficulty Adjectives" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Speed and Difficulty Adjectives", topic: "Speed and Difficulty", words: cards.map((card) => card.word), cards, cardType: "adjective", worksheet: "Classendo Speed and Difficulty Tic-Tac-Toe", activity: "Action Relay", activityCopy: "", lessonCopy: "" }} />; }
