import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "creative-activities-verbs-beginner-esl";
const cards = [{ id: "be717c9b-a728-4d51-be66-c084816fde86", word: "draw" }, { id: "77b21512-c6f5-4bda-b6b7-5c25aa2295da", word: "color" }, { id: "a6bfd37e-fc23-4553-88b9-77df1baebe70", word: "paint" }, { id: "515e3480-33de-45e4-8ae5-a575b027cc1f", word: "build" }, { id: "e8bbf690-d3f1-4335-9911-607be9f22383", word: "collect" }, { id: "dbfaee0e-4155-4049-b224-e35adb09855d", word: "make a snowman" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Creative Activities Verbs" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Creative Activities Verbs", topic: "Creative Activities", words: cards.map((card) => card.word), cards, cardType: "verb", worksheet: "Classendo Creative Activities Crossword", activity: "Creative Corners", activityCopy: "", lessonCopy: "" }} />; }
