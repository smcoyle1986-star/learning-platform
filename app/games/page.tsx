"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X, Play } from "lucide-react";

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
        <button
          onClick={onExit}
          className="px-4 py-2 rounded-lg bg-green-400 text-green-900 text-sm hover:bg-green-600 hover:shadow-md transition"
        >
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
  { title: "Yes or No?", id: "yes-or-no", subtitle: "Quick decision questions", image: "/games/placeholders/yes-or-no.png" },
  { title: "Four Corners", id: "four-corners", subtitle: "Move to different corners", image: "/games/placeholders/four-corners.png" },
  { title: "Memory Flip", id: "memory-flip", subtitle: "Match pairs", image: "/games/placeholders/memory-flip.png" },
  { title: "What’s Missing?", id: "whats-missing", subtitle: "Spot the missing item", image: "/games/placeholders/whats-missing.png" },
  { title: "Word Race", id: "word-race", subtitle: "Fast-paced vocabulary race", image: "/games/placeholders/word-race.png" },
  { title: "Freeze & Guess", id: "freeze-and-guess", subtitle: "Freeze frames and guess", image: "/games/placeholders/freeze-and-guess.png" },
  { title: "Odd One Out", id: "odd-one-out", subtitle: "Find the odd card", image: "/games/placeholders/odd-one-out.png" },
  { title: "Build the Set", id: "build-the-set", subtitle: "Assemble a set of cards", image: "/games/placeholders/build-the-set.png" },
];

/* -------------------------
   Lesson tray persistence keys
   ------------------------- */
const LESSON_TRAY_KEY = "classbloom-lesson-tray";

/* -------------------------
   Component
   ------------------------- */
export default function GamesLandingPage() {
  const router = useRouter();
  const [lessonTray, setLessonTray] = useState<GameCard[]>([]);
  const lessonTrayRef = useRef<GameCard[]>([]);

  // keep ref in sync with state for comparisons inside timers/intervals
  useEffect(() => {
    lessonTrayRef.current = lessonTray;
  }, [lessonTray]);

  // safe parser for the stored tray
  const readTray = (): GameCard[] => {
    try {
      const raw = localStorage.getItem(LESSON_TRAY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  // update state only when different (simple JSON compare is fine for these small arrays)
  const syncFromLocalStorage = () => {
    const next = readTray();
    const currentJson = JSON.stringify(lessonTrayRef.current || []);
    const nextJson = JSON.stringify(next || []);
    if (currentJson !== nextJson) {
      setLessonTray(next);
    }
  };

  useEffect(() => {
    // immediate read
    syncFromLocalStorage();

    // small delayed re-read to catch very fast writes that happen right before navigation
    const t = window.setTimeout(() => {
      syncFromLocalStorage();
    }, 50);

    // short polling window (e.g. 10 attempts over 500ms) to catch races where writer updates localStorage
    // just around navigation time. This avoids changing UI or persistence, only improves detection.
    let attempts = 0;
    const maxAttempts = 10;
    const interval = window.setInterval(() => {
      attempts++;
      syncFromLocalStorage();
      if (attempts >= maxAttempts) {
        window.clearInterval(interval);
      }
    }, 50);

    return () => {
      window.clearTimeout(t);
      window.clearInterval(interval);
    };
    // we intentionally do not include syncFromLocalStorage / lessonTray in deps to run only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for other pages/tabs updating the shared tray:
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LESSON_TRAY_KEY) syncFromLocalStorage();
    };
    const onVisibility = () => {
      if (!document.hidden) syncFromLocalStorage();
    };
    const onFocus = () => syncFromLocalStorage();
    const onCustom = () => syncFromLocalStorage();

    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("lesson-tray-updated", onCustom as EventListener);

    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("lesson-tray-updated", onCustom as EventListener);
    };
  }, []);

  // Persist only on explicit user removal and notify listeners.
  // Avoid writing an empty array back (so other pages' trays aren't clobbered by an accidental empty write).
  const removeFromLessonTray = (id: string) => {
    setLessonTray((prev) => {
      const next = prev.filter((c) => String(c.id) !== String(id));
      try {
        if (Array.isArray(next) && next.length > 0) {
          localStorage.setItem(LESSON_TRAY_KEY, JSON.stringify(next));
          try {
            window.dispatchEvent(new Event("lesson-tray-updated"));
          } catch (err) {
            /* ignore environments that restrict dispatch */
          }
        } else {
          // Do not write an empty array back to localStorage.
          // If you want to clear the shared tray globally, do that from Flashcards/Dashboard explicitly.
        }
      } catch (e) {
        console.warn("Failed to persist lesson tray removal:", e);
      }
      return next;
    });
    // Note: this only removes from the active lesson tray and does NOT touch saved lessons
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
          <Link href="/" className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80">
            ClassBloom
          </Link>

          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-4xl font-bold text-black">Games</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.location.href = "/flashcards")}
              className="px-4 py-2 rounded-lg bg-green-200 text-green-900 text-sm hover:bg-green-300 hover:shadow-md transition"
            >
              Flashcards
            </button>

            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="px-4 py-2 rounded-lg bg-white text-green-900 text-sm border border-green-200 hover:bg-green-50 hover:shadow-md transition"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {GAMES.map((g) => (
              <div key={g.id} className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition">
                <div className="h-40 rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 mb-4 flex items-center justify-center">
                  {/* Illustration placeholder */}
                  <img src={g.image ?? "/placeholder.png"} alt={g.title} className="w-full h-full object-cover" />
                </div>

                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{g.title}</h3>
                    {g.subtitle && <p className="text-sm text-[var(--color-text-muted)] mt-1">{g.subtitle}</p>}
                  </div>

                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() => enterGame(g.id)}
                      className="px-3 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 transition flex items-center gap-2"
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