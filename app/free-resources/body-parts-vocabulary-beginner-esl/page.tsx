import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "body-parts-vocabulary-beginner-esl";
const cards = [{ id: "58be1dae-a2d2-408f-bced-e22f51dda069", word: "head" }, { id: "0d5b5f56-b20c-41e1-bdb5-f833a17455c3", word: "eyes" }, { id: "74b83d18-0485-4ff4-bf82-eaf22e4e9f4e", word: "ears" }, { id: "aa4e08ad-2a60-47bf-ab37-42ccef87ef07", word: "nose" }, { id: "9af4bfb0-3d19-433e-a2a7-eb223274ae28", word: "mouth" }, { id: "902225ee-29d8-44d7-8b15-45e7fb8d504f", word: "hand" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Body Parts Vocabulary" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Body Parts Vocabulary", topic: "Body Parts", words: cards.map(card => card.word), cards, worksheet: "Label and match body parts", activity: "Simon Says listening game", activityCopy: "Listen carefully and touch the named body part.", lessonCopy: "How to set up and play Simon Says." }} />; }
