import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "games-and-play-verbs-beginner-esl";
const cards = [{ id: "e273f0bd-0606-47e2-8a8b-4dd6cd9f1830", word: "play a computer game" }, { id: "866528be-f4f9-4354-a77f-fe8039583fab", word: "play hopscotch" }, { id: "ab60746d-490d-4146-88ac-6b14c876b7fc", word: "jump rope" }, { id: "5fd56a9a-5978-4c3a-9889-31f809c1e39e", word: "skateboard" }, { id: "9892030d-682a-4e76-bb3a-c754f76b39bd", word: "fly a kite" }, { id: "b2fde9e7-3eeb-4ca8-9338-2af6c3e6195e", word: "catch a ball" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Games and Play Verbs" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Games and Play Verbs", topic: "Games and Play", words: cards.map((card) => card.word), cards, cardType: "verb", worksheet: "Classendo Games and Play Wordsearch", activity: "Playground Charades", activityCopy: "", lessonCopy: "" }} />; }
