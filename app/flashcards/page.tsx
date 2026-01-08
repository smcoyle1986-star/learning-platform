"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

type Flashcard = {
  id: string;
  word: string;
};

export default function FlashcardsPage() {
  const router = useRouter();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [activeCard, setActiveCard] = useState<number | null>(null);
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
        const mappedCards = (data || []).map((item: any) => ({
          id: item.id,
          word: item.lemma,
        }));
        setFlashcards(mappedCards);
      }
      setLoading(false);
    };

    fetchWords();
  }, []);

  if (loading) return <p>Loading flashcards...</p>;

  return (
    <main className="min-h-screen bg-gray-50 px-8 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Official Flashcards</h1>
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm text-blue-600"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* Classroom Mode Button */}
      <button
        onClick={() => router.push("/flashcards/classroom")}
        className="mb-8 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm"
      >
        Enter Classroom Mode
      </button>

      {/* Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
        {flashcards.map((card, index) => (
          <div
            key={card.id}
            onClick={() =>
              setActiveCard(activeCard === index ? null : index)
            }
            className={`cursor-pointer bg-white rounded-2xl p-10 border text-center shadow-sm hover:shadow-md transition
              ${activeCard === index ? "ring-2 ring-blue-500" : ""}
            `}
          >
            <p className="text-2xl font-bold tracking-wide">{card.word}</p>
            <p className="text-xs text-gray-400 mt-3">Click to select</p>
          </div>
        ))}
      </div>
    </main>
  );
}
