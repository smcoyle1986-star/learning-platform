import { LessonCard } from "@/lib/lessons/types";

export const ANIMALS_DEMO_QUERY = "demo=animals";

const imageBase =
  "https://tsccyjrniiamnwgrtvpw.supabase.co/storage/v1/object/public/vocab-images/nouns";

const animalWords = ["dog", "cat", "bird", "fish", "rabbit", "elephant", "lion", "monkey"] as const;

export const ANIMALS_DEMO_CARDS: LessonCard[] = animalWords.map((word, position) => ({
  id: `animals-demo-${word}`,
  word,
  image: `${imageBase}/${word}/${word}_1.png`,
  type: "noun",
  position,
}));

export function isAnimalsDemoSearch(search: string) {
  return new URLSearchParams(search).get("demo") === "animals";
}

export function withAnimalsDemo(pathname: string) {
  return `${pathname}${pathname.includes("?") ? "&" : "?"}${ANIMALS_DEMO_QUERY}`;
}
