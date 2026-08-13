import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "classroom-objects-vocabulary-beginner-esl";
const cards = [{ id: "b7695675-aad2-44db-81ee-f3cc6d99ab6d", word: "pencil" }, { id: "38de4262-fc21-4507-9c9f-e21c12ba90bc", word: "pen" }, { id: "25c4c82d-fd2c-4532-8469-c71bf666582f", word: "notebook" }, { id: "02566060-8ba7-4954-adc5-b123e2f7f5f9", word: "textbook" }, { id: "f3246551-a2d6-4647-9b9c-81060b441d71", word: "ruler" }, { id: "23fa7fe4-f272-499f-ba88-4a183235f7e2", word: "eraser" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Classroom Objects Vocabulary" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Classroom Objects Vocabulary", topic: "Classroom Objects", words: cards.map(card => card.word), cards, worksheet: "Picture matching and word search", activity: "Classroom Hunt speaking activity", activityCopy: "Find and name classroom objects with a partner.", lessonCopy: "How to set up and play Classroom Hunt." }} />; }
