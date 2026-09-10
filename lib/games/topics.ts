import data from "./topics.json";
import type { LessonCard, LessonContentType } from "@/lib/lessons/types";

export type GameTopic = { id: string; title: string; category: LessonContentType; cards: (LessonCard & { partOfSpeech: string })[] };
// Curated from Classendo's public catalog. Stable IDs keep phonics and noun homonyms distinct.
export const GAME_TOPICS = data as GameTopic[];
export const TOPICS_PAGE_SIZE = 8;
export const TOPIC_FILTERS = [
  { id: "all", label: "All topics" }, { id: "noun", label: "Nouns" },
  { id: "verb", label: "Verbs" }, { id: "adjective", label: "Adjectives" },
  { id: "phonics", label: "Phonics" }, { id: "preposition", label: "Prepositions" },
] as const;
export function getGameTopic(id?: string | null) { return GAME_TOPICS.find((topic) => topic.id === id); }
export const GAME_NAMES: Record<string, string> = {
  "image-reveal": "Image Reveal", kaboom: "KaBoom!", "spin-and-speak": "Spin and Speak",
  "yes-or-no": "Yes or No?", "choose-your-side": "Choose Your Side", "four-corners": "Four Corners",
  "memory-flip": "Memory Flip", "connect-four": "Connect Four", conquer: "Conquer", "whack-a-word": "Whack-a-Word",
};
export function gameUrl(game: string, topic?: string | null) {
  return `/games/${game}${topic ? `?topic=${encodeURIComponent(topic)}` : ""}`;
}
export function topicsUrl(game: string, topic?: string | null) {
  return `/games/topics?game=${encodeURIComponent(game)}${topic ? `&topic=${encodeURIComponent(topic)}` : ""}`;
}
export function customGameUrl(game: string, topic?: string | null) {
  return `/games/custom?game=${encodeURIComponent(game)}${topic ? `&topic=${encodeURIComponent(topic)}` : ""}`;
}

export function findTopicForCards(cards: LessonCard[]) {
  return GAME_TOPICS.find((topic) => cards.length === topic.cards.length &&
    topic.cards.every((expected) => cards.some((card) => card.id === expected.id && card.word === expected.word && card.image === expected.image && card.type === expected.type)));
}
