import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "friends-and-communication-verbs-beginner-esl";
const cards = [{ id: "a944398e-ba57-4f02-9766-fe517344db45", word: "introduce" }, { id: "18a6c230-e6b5-47ad-87a8-0cdc64d6f781", word: "meet" }, { id: "fd98b955-e62c-4fed-9f29-f0a273e466ab", word: "make friends" }, { id: "11e3df5c-3f94-48eb-b141-1acbd6244306", word: "call" }, { id: "06394a09-62c1-4e34-8376-b9998693f749", word: "talk" }, { id: "bd8c0048-a01b-4618-ac72-350c938be190", word: "work together" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Friends Actions" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Friends Actions", topic: "Friends Actions", words: cards.map((card) => card.word), cards, cardType: "verb", worksheet: "Classendo Friends Actions Tic-Tac-Toe", activity: "Meet-and-Mingle", activityCopy: "", lessonCopy: "" }} />; }
