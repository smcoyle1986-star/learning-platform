import type { Metadata } from "next";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";

const slug = "home-chores-verbs-beginner-esl";
const cards = [{ id: "61a3ffef-4c48-4511-aef7-e52f40e42971", word: "clean" }, { id: "096d18fa-cf92-4721-a2f3-6e0f15e5dda1", word: "cook" }, { id: "c36ad696-493c-4437-90c4-74f8b4a13a60", word: "do laundry" }, { id: "36927cca-9228-4eba-b0ca-89952fefc00a", word: "carry" }, { id: "2afd6e20-44fd-4420-a729-56d77de86559", word: "bring" }, { id: "dfa4227c-f6ba-421f-ba9b-efc585810dfb", word: "finish" }];
export const metadata: Metadata = { title: "Free Home Chores Verbs Lesson Pack for Beginner ESL", alternates: { canonical: `/free-resources/${slug}` } };
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Home Chores Verbs", topic: "Home Chores", words: cards.map((card) => card.word), cards, cardType: "verb", worksheet: "Classendo Home Chores Crossword", activity: "Chore Charades", activityCopy: "", lessonCopy: "" }} />; }
