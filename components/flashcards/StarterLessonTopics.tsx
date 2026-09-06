"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Menu, Presentation, Sparkles, X } from "lucide-react";

import { ResponsiveStorageImage } from "@/components/images/ResponsiveStorageImage";
import { supabase } from "@/lib/supabase/client";
import type { LessonCard } from "@/lib/lessons/types";

type StarterCardDefinition = {
  word: string;
  type: "noun" | "verb" | "adjective";
};

type StarterTopic = {
  id: string;
  title: string;
  description: string;
  cards: StarterCardDefinition[];
};

type VocabularyRow = {
  id: string;
  lemma: string;
  image_id: string | null;
};

const STARTER_TOPICS: StarterTopic[] = [
  {
    id: "food",
    title: "Food",
    description: "Familiar food words for quick naming, likes, and dislikes practice.",
    cards: ["apple", "banana", "bread", "rice", "milk", "egg"].map((word) => ({ word, type: "noun" })),
  },
  {
    id: "classroom-objects",
    title: "Classroom Objects",
    description: "Useful objects learners can point to and use in real classroom instructions.",
    cards: ["pen", "pencil", "eraser", "ruler", "desk", "chair"].map((word) => ({ word, type: "noun" })),
  },
  {
    id: "daily-routine",
    title: "Daily Routine",
    description: "A simple sequence for present-simple speaking, actions, and telling the time.",
    cards: ["wake up", "eat breakfast", "go to school", "study", "play", "sleep"].map((word) => ({ word, type: "verb" })),
  },
  {
    id: "opposites",
    title: "Opposites",
    description: "Three clear adjective pairs for describing and comparing familiar things.",
    cards: ["big", "small", "hot", "cold", "happy", "sad"].map((word) => ({ word, type: "adjective" })),
  },
];

function tableFor(type: StarterCardDefinition["type"]) {
  if (type === "noun") return "nouns";
  if (type === "verb") return "verbs";
  return "adjectives";
}

export default function StarterLessonTopics({
  onUseStarter,
}: {
  onUseStarter: (topic: StarterTopic, cards: LessonCard[]) => void;
}) {
  const [loadedCards, setLoadedCards] = useState<Record<string, LessonCard[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorTopic, setErrorTopic] = useState<string | null>(null);
  const [openPreviewTopic, setOpenPreviewTopic] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadStarters() {
      const definitionsByType = (["noun", "verb", "adjective"] as const).map((type) => ({
        type,
        words: STARTER_TOPICS.flatMap((topic) => topic.cards.filter((card) => card.type === type).map((card) => card.word)),
      }));

      try {
        const responses = await Promise.all(
          definitionsByType.map(async ({ type, words }) => {
            const response = await supabase.from(tableFor(type)).select("id, lemma, image_id").in("lemma", words);
            if (response.error) throw response.error;
            return [type, response.data as VocabularyRow[]] as const;
          })
        );

        const rowsByType = new Map(responses.map(([type, rows]) => [type, new Map(rows.map((row) => [row.lemma.toLowerCase(), row]))]));
        const next: Record<string, LessonCard[]> = {};

        for (const topic of STARTER_TOPICS) {
          const cards = topic.cards.flatMap((definition, position) => {
            const row = rowsByType.get(definition.type)?.get(definition.word.toLowerCase());
            if (!row?.image_id) return [];
            return [{
              id: `starter:${topic.id}:${definition.type}:${row.id}`,
              word: definition.word,
              image: row.image_id,
              back: row.image_id,
              image_id: row.image_id,
              position,
              type: definition.type,
            } satisfies LessonCard];
          });
          next[topic.id] = cards;
        }

        if (mounted) setLoadedCards(next);
      } catch (error) {
        console.error("Could not load starter lessons:", error);
        if (mounted) setErrorTopic("all");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void loadStarters();
    return () => { mounted = false; };
  }, []);

  return (
    <section className="border-b border-[#dce6d5] bg-[linear-gradient(135deg,#f3f8ef_0%,#ffffff_58%,#fdf8e8_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10">
        <div className="max-w-3xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-[#5d7950]"><Sparkles size={14} aria-hidden="true" /> Start with a ready-made lesson</p>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-[#2f3a2f] sm:text-3xl">Choose a topic and start teaching.</h2>
          <p className="mt-3 text-sm leading-6 text-[#5c665c]">Each starter has six visual cards. It is ready for Classroom Mode, then stays available for games, worksheets, and printables.</p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {STARTER_TOPICS.map((topic) => {
            const cards = loadedCards[topic.id] ?? [];
            const isReady = cards.length === topic.cards.length;
            const isPreviewOpen = openPreviewTopic === topic.id;
            return (
              <article key={topic.id} className="flex min-h-[212px] flex-col rounded-3xl border border-[#dce6d5] bg-white p-4 shadow-[0_10px_28px_rgba(54,64,46,0.08)] sm:min-h-[280px]">
                <button
                  type="button"
                  onClick={() => setOpenPreviewTopic(isPreviewOpen ? null : topic.id)}
                  aria-expanded={isPreviewOpen}
                  className="btn btn-secondary mb-3 flex w-full items-center justify-between px-3 py-2 text-xs sm:hidden"
                >
                  <span className="flex items-center gap-2"><Menu size={15} aria-hidden="true" /> Preview six cards</span>
                  {isPreviewOpen ? <X size={15} aria-hidden="true" /> : <span aria-hidden="true">⌄</span>}
                </button>
                <div className={`${isPreviewOpen ? "grid" : "hidden"} grid-cols-3 gap-2 rounded-2xl bg-[#f2f5ee] p-2 sm:grid`}>
                  {topic.cards.slice(0, 6).map((definition, index) => {
                    const card = cards[index];
                    return (
                      <div key={definition.word} className="aspect-square overflow-hidden rounded-xl border border-white/80 bg-white">
                        {card?.image ? <ResponsiveStorageImage src={card.image} alt={definition.word} className="h-full w-full object-contain" sizes="90px" widths={[96, 160]} /> : <div className="h-full w-full animate-pulse bg-[#e4eadf]" />}
                      </div>
                    );
                  })}
                </div>
                <h3 className="mt-4 text-lg font-bold text-[#2f3a2f]">{topic.title}</h3>
                <p className="mt-1 text-sm leading-5 text-[#667066]">{topic.description}</p>
                <button
                  type="button"
                  disabled={isLoading || !isReady}
                  onClick={() => {
                    if (!isReady) {
                      setErrorTopic(topic.id);
                      return;
                    }
                    setErrorTopic(null);
                    onUseStarter(topic, cards);
                  }}
                  className="btn btn-primary mt-auto w-full px-4 py-2.5 text-sm disabled:cursor-wait disabled:opacity-55"
                >
                  <Presentation size={16} aria-hidden="true" />
                  {isLoading ? "Loading cards…" : "Use this 6-card lesson"}
                </button>
                {errorTopic === topic.id ? <p className="mt-2 text-xs font-medium text-[#a0473f]">This starter is not ready yet. Please try again.</p> : null}
              </article>
            );
          })}
        </div>

        <p className="mt-5 flex items-center gap-2 text-xs font-medium text-[#65755f]"><ArrowRight size={14} aria-hidden="true" /> You can change, remove, or add cards at any time.</p>
      </div>
    </section>
  );
}
