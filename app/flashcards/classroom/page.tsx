"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Shuffle,
  Maximize,
  X,
} from "lucide-react";

type Card = {
  id: string;   // ✅ must match Flashcards
  word: string;
  image: string;
  type: string;
};


export default function ClassroomMode() {
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
const [autoPlay, setAutoPlay] = useState(false);
const [intervalMs, setIntervalMs] = useState(4000);
const [fade, setFade] = useState(true);
const [direction, setDirection] = useState<"next" | "prev">("next");
const [touchStartX, setTouchStartX] = useState<number | null>(null);
const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);

  useEffect(() => {
   const stored = localStorage.getItem("classbloom-lesson-tray");
    if (stored) {
      setCards(JSON.parse(stored));
    }
  }, []);
 useEffect(() => {
  if (!autoPlay || cards.length === 0) return;

  const timer = setInterval(() => {
    nextCard();
  }, intervalMs);

  return () => clearInterval(timer);
}, [autoPlay, intervalMs, cards.length]);

  useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      nextCard();
    }
    if (e.key === "ArrowLeft") {
      prevCard();
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [cards.length]);


  const nextCard = () => {
  setFade(false);
  setTimeout(() => {
  setDirection("next");
    setIndex((prev) => (prev + 1) % cards.length);
    setFade(true);
  }, 200);
};

const prevCard = () => {
  setFade(false);
  setTimeout(() => {
  setDirection("prev");
    setIndex((prev) => (prev - 1 + cards.length) % cards.length);
    setFade(true);
  }, 200);
};

  const shuffleCards = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setIndex(0);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };
  const handleTouchStart = (e: React.TouchEvent) => {
  setTouchStartX(e.touches[0].clientX);
};

const handleTouchMove = (e: React.TouchEvent) => {
  setTouchCurrentX(e.touches[0].clientX);
};

const handleTouchEnd = () => {
  if (touchStartX === null || touchCurrentX === null) return;

  const diff = touchStartX - touchCurrentX;
  const threshold = 60; // swipe sensitivity

  if (diff > threshold) {
    // swipe left → next
    nextCard();
  } else if (diff < -threshold) {
    // swipe right → previous
    prevCard();
  }

  setTouchStartX(null);
  setTouchCurrentX(null);
};

  if (cards.length === 0) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] flex flex-col items-center justify-center gap-6">
      <p className="text-xl text-[var(--color-text-muted)]">
        No lesson loaded
      </p>

      <button
        onClick={() => (window.location.href = "/flashcards")}
        className="px-6 py-3 rounded-lg bg-[var(--color-primary)] text-white text-base font-semibold
                   hover:opacity-90 hover:scale-[1.03] transition-all"
      >
        ← Back to Flashcards
      </button>
    </div>
  );
}

  const card = cards[index];

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] flex flex-col justify-between p-6">

      {/* Header controls */}
      <div className="sticky top-0 z-50
                w-full flex justify-between items-center px-6 py-3">
        <div className="flex gap-3">
          <button
            onClick={toggleFullscreen}
            className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 shadow-md hover:shadow-lg
 flex items-center gap-2"
          >
            <Maximize size={18} />
            Full Screen
          </button>

          <button
            onClick={shuffleCards}
            className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 shadow-md hover:shadow-lg
 flex items-center gap-2"
          >
            <Shuffle size={18} />
            Shuffle
          </button>
          <button
  onClick={() => setAutoPlay((prev) => !prev)}
  className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm
             hover:opacity-90 shadow-md hover:shadow-lg
 hover:scale-[1.03] transition-all"
>
  {autoPlay ? "Pause Auto-Play" : "Auto-Play"}
</button>

<button
  onClick={() =>
    setIntervalMs((prev) =>
      prev === 4000 ? 2500 : prev === 2500 ? 6000 : 4000
    )
  }
  className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm
             hover:opacity-90 shadow-md hover:shadow-lg
 hover:scale-[1.03] transition-all"
>
  Speed: {intervalMs === 2500 ? "Fast" : intervalMs === 6000 ? "Slow" : "Normal"}
</button>

        </div>

        <button
  onClick={() => {
    localStorage.setItem("classbloom-lesson-tray",
      JSON.stringify(cards));
    window.location.href = "/flashcards";
  }}
  className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm"
>
  <X size={18} />
  Exit
</button>
      </div>

      {/* Flashcard */}
   <div
  onClick={nextCard}
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
  key={index}
  className={`cursor-pointer mx-auto my-8 bg-white rounded-3xl shadow-2xl
    border-[10px] border-gray-300 w-full max-w-5xl aspect-[16/9]
    flex flex-col justify-center items-center p-10
    transition-all duration-300 ease-out
    ${
      direction === "next"
        ? "animate-slide-left"
        : "animate-slide-right"
    }`}
>
        {/* Image area */}
        <div className="w-full flex-1 bg-gray-100 rounded-2xl mb-8 flex items-center justify-center text-gray-400 text-xl">
          image
        </div>

        {/* Vocabulary word */}
        <div className="text-7xl md:text-8xl font-extrabold tracking-wide capitalize">
          {card.word}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="w-full flex flex-col items-center gap-6 mt-8">
        <div className="flex items-center gap-10">
          <button
            onClick={prevCard}
            className="p-5 rounded-full bg-[var(--color-primary)] text-white hover:opacity-90"
          >
            <ArrowLeft size={36} />
          </button>

          <button
            onClick={nextCard}
            className="p-5 rounded-full bg-[var(--color-primary)] text-white hover:opacity-90"
          >
            <ArrowRight size={36} />
          </button>
        </div>

        <div className="text-2xl font-semibold text-gray-700">
          {index + 1} / {cards.length}
        </div>
      </div>
    </div>
  );
}
