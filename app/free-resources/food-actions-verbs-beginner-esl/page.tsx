import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";

const slug = "food-actions-verbs-beginner-esl";
const cards = [{ id: "f89e2dc5-6560-48ec-915c-45c969be41f9", word: "buy" }, { id: "096d18fa-cf92-4721-a2f3-6e0f15e5dda1", word: "cook" }, { id: "c51e38a9-82b1-4444-8c9d-02135d70cbdf", word: "cut" }, { id: "16f2c47b-7e85-4359-8fe5-afa753b07f1b", word: "eat" }, { id: "d1aa97cd-00f0-449a-aac9-b69db6529267", word: "drink" }, { id: "61a3ffef-4c48-4511-aef7-e52f40e42971", word: "clean" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Food Actions Verbs" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Food Actions Verbs", topic: "Food Actions", words: cards.map((card) => card.word), cards, cardType: "verb", worksheet: "Classendo Food Actions Bullseye", activity: "Kitchen Action Corners", activityCopy: "", lessonCopy: "" }} />; }
