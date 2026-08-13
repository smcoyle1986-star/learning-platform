import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "places-adjectives-beginner-esl";
const cards = [{ id: "01f11fbc-cad2-46a1-a45a-96f92d7e66b9", word: "noisy" }, { id: "4555ec93-08c2-4d89-b9d8-7cb3cae842b9", word: "quiet" }, { id: "59be79e3-46d8-4cf6-9480-56651baa21f7", word: "crowded" }, { id: "0434ba1a-5082-4e81-81b3-856a8643a1d2", word: "empty" }, { id: "a39222a1-d7d1-469b-adeb-a4730c0d62c8", word: "bright" }, { id: "a94d10a6-d15e-455f-8a9d-a468c74bd724", word: "dark" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Places Adjectives" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Places Adjectives", topic: "Places", words: cards.map((card) => card.word), cards, cardType: "adjective", worksheet: "Classendo Places Bullseye", activity: "Adjective Stations", activityCopy: "", lessonCopy: "" }} />; }
