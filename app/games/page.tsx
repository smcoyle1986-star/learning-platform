"use client";

import React, { useEffect, useState } from "react";
import BrandButton from "@/components/BrandButton";
import { useRouter } from "next/navigation";
import { X, Play } from "lucide-react";
import {
  clearLessonTray,
  readLessonTray,
  subscribeToLessonTray,
  writeLessonTray,
} from "@/lib/lessons/tray";

/**
 * Games Landing Page
 *
 * - Header matches site style (left brand, center title, right two buttons)
 * - Lesson tray (persistent) rendered below header; uses the same localStorage keys as the rest of the app
 * - Responsive grid with 10 game cards linking to /games/[gameId]
 * - Shared Game engine types + minimal GameLayout/GameEngine abstractions included here for later use
 *
 * Changes in this file:
 * - Robust sync on mount: immediate read, delayed re-read, and a short polling window to catch races
 * - Listens for storage/focus/visibility/custom event updates (as before)
 * - Only minimal additions; UI and existing behavior retained
 */

/* -------------------------
   Shared game engine types
   ------------------------- */
export interface GameCard {
  id: string;
  word: string;
  image?: string;
}

export interface GameEngineProps {
  cards: GameCard[];
  onExit: () => void;
  // Hooks & lifecycle stubs for future use
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onEnd?: () => void;
}

/* -------------------------
   Minimal reusable components
   ------------------------- */

/**
 * GameLayout - shared wrapper used by individual games
 * - Provides consistent padding, header/controls area and a main content region
 */
export function GameLayout({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="max-w-7xl mx-auto px-6 pb-12">
      <div className="bg-white rounded-2xl p-6 shadow-sm border mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            {subtitle && <p className="text-sm text-[var(--color-text-muted)] mt-1">{subtitle}</p>}
          </div>
        </div>
      </div>

      <div>{children}</div>
    </div>
  );
}

/**
 * GameEngine - minimal architecture stub
 * - Accepts cards and lifecycle props, renders a placeholder area
 * - Real game implementations will plug into this API later
 */
export function GameEngine({ cards, onExit }: GameEngineProps) {
  useEffect(() => {
    // Lifecycle placeholder (future hooks: start, timers, etc.)
    // Intentionally no gameplay logic here.
    return () => {
      // cleanup placeholder (on unmount)
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border">
      <div className="text-center text-sm text-[var(--color-text-muted)] mb-4">
        Game engine stub — no gameplay implemented yet.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.id} className="rounded-lg border p-3 flex flex-col items-center gap-2">
            <div className="w-full aspect-video rounded-md overflow-hidden bg-gray-100 mb-1">
              <img src={c.image ?? "/placeholder.png"} alt={c.word} className="w-full h-full object-cover" />
            </div>
            <div className="text-sm font-medium text-center">{c.word.replaceAll("_", " ")}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 text-right">
        <button onClick={onExit} className="btn btn-secondary px-3 py-1 text-sm">
          Exit Game
        </button>
      </div>
    </div>
  );
}

/* -------------------------
   Games list + mapping
   ------------------------- */
const GAMES: { title: string; id: string; subtitle?: string; image?: string }[] = [
  { title: "Image Reveal", id: "image-reveal", subtitle: "Reveal parts of the picture", image: "/games/placeholders/image-reveal.png" },
  { title: "KaBoom!", id: "kaboom", subtitle: "Avoid the bombs and score points", image: "/games/placeholders/kaboom.png" },
  { title: "Spin and Speak", id: "spin-and-speak", subtitle: "Spin the Wheel for fun", image: "/games/placeholders/word-race.png" },
  { title: "Yes or No?", id: "yes-or-no", subtitle: "Quick decision questions", image: "/games/placeholders/yes-or-no.png" },
  { title: "Four Corners", id: "four-corners", subtitle: "Move to different corners", image: "/games/placeholders/four-corners.png" },
  { title: "Memory Flip", id: "memory-flip", subtitle: "Match pairs", image: "/games/placeholders/memory-flip.png" },
  { title: "Connect Four", id: "connect-four", subtitle: "Connect for tokens in a line to win!", image: "/games/placeholders/connect-four.png" },
];

/* -------------------------
   Component
   ------------------------- */
export default function GamesLandingPage() {
  const router = useRouter();
  const [lessonTray, setLessonTray] = useState<GameCard[]>([]);

  useEffect(() => {
    setLessonTray(readLessonTray() as GameCard[]);
    return subscribeToLessonTray((cards) => {
      setLessonTray(cards as GameCard[]);
    });
  }, []);

  const removeFromLessonTray = (id: string) => {
    setLessonTray((prev) => {
      const next = prev.filter((c) => String(c.id) !== String(id));
      if (next.length > 0) writeLessonTray(next);
      else clearLessonTray();
      return next;
    });
  };

  const enterGame = (gameId: string) => {
    // navigate to game page
    router.push(`/games/${gameId}`);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-bg-main)]/95 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandButton className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80" />

          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-4xl font-bold text-black">Games</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.location.href = "/flashcards")}
              className="btn btn-secondary"
            >
              Flashcards
            </button>

            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="btn btn-secondary"
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Lesson Tray (sticky below header) */}
      <section className="sticky top-[72px] z-40 bg-white border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-3 overflow-x-auto py-2">
            {lessonTray.length === 0 && (
              <div className="px-4 py-2 rounded-lg border border-dashed border-black/20 text-sm text-[var(--color-text-muted)] whitespace-nowrap">
                Click flashcards to add
              </div>
            )}

            {lessonTray.map((card) => (
              <div
                key={card.id}
                className="relative flex items-center gap-3 px-3 py-2 rounded-lg border bg-[var(--color-bg-soft)] text-sm whitespace-nowrap"
                style={{ minWidth: 140 }}
              >
                <div className="w-10 h-10 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center">
                  <img src={card.image ?? "/placeholder.png"} alt={card.word} className="w-full h-full object-cover" />
                </div>

                <span className="text-xs font-semibold text-gray-800">{card.word.replaceAll("_", " ")}</span>

                <button
                  onClick={() => removeFromLessonTray(card.id)}
                  className="absolute -top-0 -right-2 bg-white rounded-full border shadow p-0.5 hover:bg-red-50"
                  aria-label={`Remove ${card.word}`}
                >
                  <X size={12} className="text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="pt-[176px] pb-32"> {/* pad top so content sits below header + tray */}
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-xl font-semibold mb-6">Games</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {GAMES.map((g) => (
              <div key={g.id} className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition flex flex-col">
                <div className="aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 mb-4 flex items-center justify-center">
                  {/* Illustration placeholder */}
                  <img src={g.image ?? "/placeholder.png"} alt={g.title} className="w-full h-full object-cover" />
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold">{g.title}</h3>
                    {g.subtitle && <p className="text-sm text-[var(--color-text-muted)] mt-1">{g.subtitle}</p>}
                  </div>

                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() => enterGame(g.id)}
                      className="btn btn-primary px-3 py-2 text-sm flex items-center gap-2"
                    >
                      <Play size={14} />
                      Enter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
