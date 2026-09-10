"use client";
import { useGameFlow } from "@/components/games/GameFlowContext";

import { readGameTrayRaw, writeGameTrayRaw } from "@/lib/games/session";

import React, { useEffect, useMemo, useState } from "react";
import BrandButton from "@/components/BrandButton";
import LessonTrayScroller from "@/components/shared/LessonTrayScroller";
import { resolveLessonImageUrl } from "@/lib/lessons/image";
import { useParams, useRouter } from "next/navigation";
import { X } from "lucide-react";

/**
 * Individual Game Page Template (stub)
 *
 * - Loads cards from the same lesson tray localStorage key as other pages
 * - Displays the game title
 * - Exit Game button returns to /games
 * - Uses the shared GameLayout and GameEngine abstractions (stubbed)
 * - No gameplay implemented
 */

/* Shared types (same as landing page) */
interface GameCard {
  id: string;
  word: string;
  image?: string;
}

interface GameEngineProps {
  cards: GameCard[];
  onExit: () => void;
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onEnd?: () => void;
}

/* Minimal shared components (same API as landing page) */
function GameLayout({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
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
    </div>
  );
}

function GameEngine({ cards, onExit }: GameEngineProps) {
  useEffect(() => {
    // Lifecycle placeholder
    return () => {
      // cleanup placeholder
    };
  }, []);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border">
      <div className="text-center text-sm text-[var(--color-text-muted)] mb-4">
        Game engine placeholder — no gameplay implemented yet.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.id} className="rounded-lg border p-3 flex flex-col items-center gap-2">
            <div className="w-full aspect-video rounded-md overflow-hidden mb-1 bg-gray-100">
              <img src={resolveLessonImageUrl(c.image ?? "/placeholder.png")} alt={c.word} className="w-full h-full object-cover" />
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

/* Games mapping (must match landing page) */
const GAMES: { title: string; id: string; subtitle?: string }[] = [
  { title: "Image Reveal", id: "image-reveal", subtitle: "Reveal parts of the picture" },
  { title: "KaBoom!", id: "kaboom", subtitle: "Avoid the bombs and score points" },
  { title: "Yes or No?", id: "yes-or-no", subtitle: "Quick decision questions" },
  { title: "Choose Your Side", id: "choose-your-side", subtitle: "Move to the side you choose" },
  { title: "Four Corners", id: "four-corners", subtitle: "Move to different corners" },
  { title: "Memory Flip", id: "memory-flip", subtitle: "Match pairs" },
  { title: "What’s Missing?", id: "whats-missing", subtitle: "Spot the missing item" },
  { title: "Word Race", id: "word-race", subtitle: "Fast-paced vocabulary race" },
  { title: "Freeze & Guess", id: "freeze-and-guess", subtitle: "Freeze frames and guess" },
  { title: "Odd One Out", id: "odd-one-out", subtitle: "Find the odd card" },
  { title: "Build the Set", id: "build-the-set", subtitle: "Assemble a set of cards" },
  { title: "Conquer", id: "conquer", subtitle: "Claim territory on a giant board" },
];

const LESSON_TRAY_KEY = "classendo-lesson-tray";

export default function GamePage() {
  const flow = useGameFlow();
  const params = useParams();
  const router = useRouter();
  const gameId = params?.gameId ?? "";
  const [lessonTray, setLessonTray] = useState<GameCard[]>([]);

  // centralized sync function used on mount, focus, visibilitychange and custom events
  const syncFromLocalStorage = () => {
    try {
      const raw = readGameTrayRaw();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setLessonTray(parsed);
          return;
        }
      }
      setLessonTray([]);
    } catch (e) {
      console.error("Failed to load lesson tray:", e);
      setLessonTray([]);
    }
  };

  // Load once on mount (initial read)
  useEffect(() => {
    syncFromLocalStorage();
  }, []);

  // Also listen for storage changes (other tabs), visibility/focus, and a custom event
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
    // sync listeners for the lifetime of the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist only on explicit user removal, and avoid writing an empty array which can clobber other pages' tray
  const removeFromLessonTray = (id: string) => {
    setLessonTray((prev) => {
      const next = prev.filter((c) => String(c.id) !== String(id));
      try {
        if (Array.isArray(next) && next.length > 0) {
          writeGameTrayRaw(JSON.stringify(next), flow?.topic?.id);
          // notify other windows/pages
          try {
            window.dispatchEvent(new Event("lesson-tray-updated"));
          } catch (err) {
            /* ignore environments that restrict dispatch */
          }
        } else {
          // If next is empty, do not overwrite the external tray with [].
          // Instead, remove only if you intend to clear globally (we avoid that here).
        }
      } catch (e) {
        console.warn("Failed to persist lesson tray removal:", e);
      }
      return next;
    });
  };

  const gameMeta = useMemo(() => GAMES.find((g) => g.id === gameId), [gameId]);

  if (!gameMeta) {
    return (
      <div className="min-h-screen">
        <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-bg-main)]/80 backdrop-blur-md border-b border-black/5">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <BrandButton className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80" />

            <div className="absolute left-1/2 transform -translate-x-1/2">
              <h1 className="text-4xl font-bold text-black">Games</h1>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => (window.location.href = "/flashcards")}
                className="btn btn-secondary px-3 py-1"
              >
                Return to Flashcards
              </button>
              <button
                onClick={() => (window.location.href = "/dashboard")}
                className="btn btn-secondary px-3 py-1"
              >
                Return to My Lessons
              </button>
            </div>
          </div>
        </header>

        <main className="pt-[140px] max-w-7xl mx-auto px-6 pb-32">
          <div className="bg-white rounded-2xl p-6 shadow-sm border">
            <h2 className="text-lg font-semibold">Game not found</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-2">This game ID is not recognized. Return to the games list.</p>

            <div className="mt-4">
              <button onClick={() => router.push("/games")} className="btn btn-primary px-3 py-2 text-sm">
                Back to Games
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div>
      {/* Header (matches site) */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-bg-main)]/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandButton className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80" />

          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-4xl font-bold text-black">Games</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.location.href = "/flashcards")}
              className="btn btn-secondary px-3 py-1"
            >
              Return to Flashcards
            </button>
            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="btn btn-secondary px-3 py-1"
            >
              Return to My Lessons
            </button>
          </div>
        </div>
      </header>

      {/* Lesson Tray (sticky below header) */}
      <section className="sticky top-[72px] z-40 bg-white border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <LessonTrayScroller className="py-2" contentClassName="gap-3">
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
                  <img src={resolveLessonImageUrl(card.image ?? "/placeholder.png")} alt={card.word} className="w-full h-full object-cover" />
                </div>

                <span className="text-xs">{card.word.replaceAll("_", " ")}</span>

                <button
                  onClick={() => removeFromLessonTray(card.id)}
                  className="absolute -top-0 -right-2 bg-white rounded-full border shadow p-0.5 hover:bg-red-50"
                  aria-label={`Remove ${card.word}`}
                >
                  <X size={12} className="text-red-500" />
                </button>
              </div>
            ))}
          </LessonTrayScroller>
        </div>
      </section>

      {/* Game content */}
      <main className="pt-[176px] pb-32">
        <GameLayout title={gameMeta.title} subtitle={gameMeta.subtitle}>
          <GameEngine
            cards={lessonTray}
            onExit={() => {
              // navigate back to games landing
              router.push("/games");
            }}
          />
        </GameLayout>
      </main>
    </div>
  );
}
