import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import BeginnerPackPage from "@/components/free-resources/BeginnerPackPage";
const slug = "weather-adjectives-beginner-esl";
const cards = [{ id: "fee72921-5687-4a76-91d4-84d2572afdca", word: "sunny" }, { id: "e7a09389-4a47-4c51-9a76-8118c61663b2", word: "cloudy" }, { id: "25fa8ba2-e9c5-4520-b333-bd79aa9baac3", word: "raining" }, { id: "c9ae1586-60de-4cf5-af16-4b82e057c623", word: "snowing" }, { id: "9d6cca3c-a418-4e17-99db-d520974df84e", word: "windy" }, { id: "ce6ac99f-16c0-40da-8d77-2c151b3f3664", word: "stormy" }];
export const metadata = createFreeResourceMetadata({ slug, title: "Weather Adjectives" });
export default function Page() { return <BeginnerPackPage pack={{ slug, title: "Weather Adjectives", topic: "Weather", words: cards.map((card) => card.word), cards, cardType: "noun", worksheet: "Classendo Weather Crossword", activity: "Weather Walk", activityCopy: "", lessonCopy: "" }} />; }
