import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";

const slug = "after-school-verbs-beginner-esl";
const cards = [{ id: "c0a0a0dc-68b4-4d98-9082-4c11af8e9902", word: "come home" }, { id: "d73c1949-faa6-4317-b75e-ccb1971761ca", word: "do homework" }, { id: "bbd1e35d-2dd2-4711-8ae0-27fe56908ea3", word: "meet friends" }, { id: "67d9486e-e116-4ec7-b95e-8817a538f585", word: "play a game" }, { id: "dfa7fc4d-3f29-451f-83a7-a843a30da12d", word: "study" }, { id: "48fb02dd-72bf-4217-950f-5b6c8a7dccb2", word: "sleep" }];
export const metadata = createFreeResourceMetadata({ slug, title: "After School Verbs" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "After School Verbs", topic: "After School", words: cards.map((card) => card.word), cards, cardType: "verb", worksheet: "Classendo After School Tic-Tac-Toe", activity: "Find Your Routine", activityCopy: "", lessonCopy: "" }} />; }
