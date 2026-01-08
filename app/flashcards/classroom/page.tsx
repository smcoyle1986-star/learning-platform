"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

export default function ClassroomFlashcards() {
  const router = useRouter();
  const [cards, setCards] = useState<{ id: string; lemma: string }[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWords = async () => {
      const { data, error } = await supabase
        .from("nouns")
        .select("id, lemma")
        .order("lemma", { ascending: true });

      if (error) {
        console.error("Error fetching words:", JSON.stringify(error, null, 2));
      } else {
        setCards(data || []);
      }
      setLoading(false);
    };

    fetchWords();
  }, []);

  const nextCard = () => {
    setIndex((prev) => (prev + 1) % cards.length);
  };

  const enterFullscreen = () => {
    if (document.fullscreenElement) return;
    document.documentElement.requestFullscreen();
  };

  if (loading) return <p>Loading classroom flashcards...</p>;

  return (
    <main
      onClick={nextCard}
      className="min-h-screen bg-white flex flex-col items-center justify-center cursor-pointer select-none relative"
    >
      {/* Top Controls */}
      <div className="absolute top-6 right-6 flex gap-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            enterFullscreen();
          }}
          className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
        >
          Fullscreen
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setCards((prev) => [...prev].sort(() => Math.random() - 0.5));
            setIndex(0);
          }}
          className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
        >
          Shuffle
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push("/flashcards");
          }}
          className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
        >
          Exit
        </button>
      </div>

      {/* Card */}
      <div className="text-center">
        <p className="text-6xl sm:text-7xl lg:text-8xl font-bold tracking-wide">
          {cards[index]?.lemma}
        </p>
        <p className="text-sm text-gray-400 mt-6">Tap anywhere to continue</p>
      </div>
    </main>
  );
}
