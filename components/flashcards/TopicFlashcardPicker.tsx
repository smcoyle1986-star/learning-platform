"use client";

import Link from "next/link";
import { Presentation } from "lucide-react";
import { useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { readLessonTray, writeLessonTray } from "@/lib/lessons/tray";
import type { LessonCard } from "@/lib/lessons/types";
import type { Topic } from "@/lib/seo/topics";

type VocabularyRow = {
  id: string;
  lemma: string;
  image_id?: string | null;
};

type TopicFlashcardPickerProps = {
  topics: Topic[];
};

const TOPIC_WORD_ALIASES: Record<string, string> = {
  rainy: "raining",
  snowy: "snowing",
  book: "textbook",
  bag: "school bag",
  "have dinner": "eat dinner",
  bicycle: "bike",
  plane: "airplane",
  motorcycle: "motorbike",
  hands: "hand",
  legs: "leg",
};

export default function TopicFlashcardPicker({ topics }: TopicFlashcardPickerProps) {
  const { user, loading } = useAuth();
  const [loadingTopic, setLoadingTopic] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function loadTopic(topic: Topic) {
    if (!user || loadingTopic) return;

    const existingCards = readLessonTray("account");
    if (existingCards.length > 0 && !window.confirm(`Replace the ${existingCards.length} cards in your tray with the ${topic.shortTitle} topic set?`)) {
      return;
    }

    setLoadingTopic(topic.slug);
    setMessage(null);

    try {
      const sourceWords = topic.vocabulary.map((word) => TOPIC_WORD_ALIASES[word] ?? word);
      const [nounResponse, verbResponse, adjectiveResponse] = await Promise.all([
        supabase.from("nouns").select("id, lemma, image_id").in("lemma", sourceWords),
        supabase.from("verbs").select("id, lemma, image_id").in("lemma", sourceWords),
        supabase.from("adjectives").select("id, lemma, image_id").in("lemma", sourceWords),
      ]);

      if (nounResponse.error) throw nounResponse.error;
      if (verbResponse.error) throw verbResponse.error;
      if (adjectiveResponse.error) throw adjectiveResponse.error;

      const matches = new Map<string, { row: VocabularyRow; type: LessonCard["type"] }>();
      const addMatches = (rows: VocabularyRow[] | null, type: LessonCard["type"]) => {
        for (const row of rows ?? []) {
          const key = row.lemma.toLowerCase();
          if (!matches.has(key)) matches.set(key, { row, type });
        }
      };

      addMatches(nounResponse.data, "noun");
      addMatches(verbResponse.data, "verb");
      addMatches(adjectiveResponse.data, "adjective");

      const cards: LessonCard[] = topic.vocabulary.flatMap((word, position) => {
        const sourceWord = TOPIC_WORD_ALIASES[word] ?? word;
        const match = matches.get(sourceWord.toLowerCase());
        if (!match) return [];

        return [{
          id: `topic:${topic.slug}:${match.type}:${match.row.id}`,
          word,
          image: match.row.image_id ?? "/placeholder.png",
          back: match.row.image_id ?? "/placeholder.png",
          position,
          type: match.type,
        }];
      });

      if (cards.length !== topic.vocabulary.length) throw new Error("This topic is not complete yet.");

      writeLessonTray(cards, "account");
      setMessage(`${cards.length} ${topic.shortTitle.toLowerCase()} cards are ready in your tray. Open Interactive Classroom when you are ready to teach.`);
    } catch (error) {
      console.error("Could not load topic cards:", error);
      setMessage("We could not load this topic right now. Please try again.");
    } finally {
      setLoadingTopic(null);
    }
  }

  if (loading) {
    return <p className="mt-4 text-sm leading-6 text-[#5c665c]">Checking your account…</p>;
  }

  return (
    <>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-[#5c665c]">
        {user
          ? "Choose a topic to replace your tray with its complete eight-card set, ready for Interactive Classroom."
          : "Guest teachers can choose up to 6 cards for a temporary lesson in this browser. Create a free account to load a complete eight-card topic set and use it in Interactive Classroom."}
      </p>

      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {topics.map((topic) => (
          <li key={topic.slug}>
            {user ? (
              <button
                type="button"
                onClick={() => void loadTopic(topic)}
                disabled={Boolean(loadingTopic)}
                className="group block w-full rounded-2xl border border-[#e2e6da] bg-white px-5 py-4 text-left transition hover:border-[#9fbc91] hover:shadow-sm disabled:cursor-wait disabled:opacity-70"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="font-semibold">{topic.shortTitle} flashcards</span>
                  <Presentation className="shrink-0 text-[#6f9560]" size={18} aria-hidden="true" />
                </span>
                <span className="mt-1 block text-sm leading-6 text-[#5c665c]">{topic.vocabulary.join(", ")}</span>
                <span className="mt-3 block text-sm font-semibold text-[#506a47]">
                  {loadingTopic === topic.slug ? "Loading cards…" : "Load all 8 cards into my tray"}
                </span>
              </button>
            ) : (
              <Link
                href={`/signup?next=${encodeURIComponent("/flashcards")}`}
                className="group block rounded-2xl border border-[#e2e6da] bg-white px-5 py-4 transition hover:border-[#9fbc91] hover:shadow-sm"
              >
                <h3 className="font-semibold">{topic.shortTitle} flashcards</h3>
                <p className="mt-1 text-sm leading-6 text-[#5c665c]">{topic.vocabulary.join(", ")}</p>
                <p className="mt-3 text-sm font-semibold text-[#506a47]">Sign up free to load all 8 cards</p>
              </Link>
            )}
          </li>
        ))}
      </ul>

      {message ? <p role="status" className="mt-5 max-w-3xl rounded-2xl border border-[#c8dbbd] bg-[#f2f7ee] px-4 py-3 text-sm font-medium leading-6 text-[#40533b]">{message}</p> : null}
    </>
  );
}
