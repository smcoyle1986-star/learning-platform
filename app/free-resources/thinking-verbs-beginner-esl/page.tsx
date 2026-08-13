import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "thinking-verbs-beginner-esl";
const cards = [{ id: "f935d472-1498-4c20-a417-046477e1a0a0", word: "guess" }, { id: "eb3b4ce2-6744-41f7-8994-206f359503a4", word: "think" }, { id: "d195e9bb-65ae-4afb-b0bf-1442572a34aa", word: "know" }, { id: "9c7443e2-45ee-4ddd-be84-17bb6fc47427", word: "learn" }, { id: "e13eb781-3f8b-4723-9931-7626fbdc075b", word: "remember" }, { id: "c6949de5-c526-4d74-8aca-2a78f209a3c7", word: "forget" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Thinking Verbs" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Thinking Verbs", topic: "Thinking Verbs", words: cards.map((card) => card.word), cards, cardType: "verb", worksheet: "Classendo Thinking Verbs Bullseye", activity: "Thinking Mime", activityCopy: "", lessonCopy: "" }} />; }
