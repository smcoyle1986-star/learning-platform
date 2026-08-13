import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "active-verbs-beginner-esl";
const cards = [{ id: "7f943693-c26f-407e-b6ec-deb89865a3f4", word: "run" }, { id: "d3280859-2c52-45fb-8431-98d2f3484a97", word: "swim" }, { id: "8353d40a-bbd3-4df9-b5a8-a90d81bb0371", word: "exercise" }, { id: "23fbd5d0-136a-42c7-b0bd-a0d4f558a1d6", word: "climb" }, { id: "c75de1c7-9a13-4754-a5f2-713ab632fb77", word: "dance" }, { id: "b2fde9e7-3eeb-4ca8-9338-2af6c3e6195e", word: "catch a ball" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Active Verbs" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Active Verbs", topic: "Active Verbs", words: cards.map((card) => card.word), cards, cardType: "verb", worksheet: "Classendo Active Verbs Tic-Tac-Toe", activity: "Action Relay", activityCopy: "", lessonCopy: "" }} />; }
