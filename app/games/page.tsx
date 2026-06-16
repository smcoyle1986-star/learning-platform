"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import BrandButton from "@/components/BrandButton";
import { useRouter } from "next/navigation";
import { ArrowDown, Gamepad2, HelpCircle, Play, Sparkles, X } from "lucide-react";
import { GameHowToModal } from "@/components/games/GameHowToModal";
import LessonTrayScroller from "@/components/shared/LessonTrayScroller";
import { resolveLessonImageUrl } from "@/lib/lessons/image";
import {
  clearLessonTray,
  readLessonTray,
  subscribeToLessonTray,
  writeLessonTray,
} from "@/lib/lessons/tray";

/**
 * Games Landing Page
 *
 * - A more intentional landing experience for the games area
 * - Keeps the lesson tray visible and gives the cards a more animated, inviting feel
 * - Leaves the actual game routes alone for now
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
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onEnd?: () => void;
}

/* -------------------------
   Minimal reusable components
   ------------------------- */
export function GameLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
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

export function GameEngine({ cards, onExit }: GameEngineProps) {
  useEffect(() => {
    return () => {
      // cleanup placeholder for future game logic
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
  { title: "Image Reveal", id: "image-reveal", subtitle: "Reveal parts of the picture", image: "/games/image-reveal.svg" },
  { title: "KaBoom!", id: "kaboom", subtitle: "Avoid the bombs and score points", image: "/games/kaboom.svg" },
  { title: "Spin and Speak", id: "spin-and-speak", subtitle: "Spin the wheel for quick class practice", image: "/games/spin-and-speak.svg" },
  { title: "Yes or No?", id: "yes-or-no", subtitle: "Quick decision questions", image: "/games/yes-or-no.svg" },
  { title: "Four Corners", id: "four-corners", subtitle: "Move to different corners", image: "/games/four-corners.svg" },
  { title: "Memory Flip", id: "memory-flip", subtitle: "Match pairs", image: "/games/memory-flip.svg" },
  { title: "Connect Four", id: "connect-four", subtitle: "Connect four tokens in a line to win", image: "/games/connect-four.svg" },
  { title: "Conquer", id: "conquer", subtitle: "Claim territory on a giant board", image: "/games/conquer.svg" },
];

type GameInfo = (typeof GAMES)[number];

type GamePopularityEntry = {
  gameKey: string;
  count: number;
};

type GamePopularityPayload = {
  weekly: GamePopularityEntry[];
  allTime: GamePopularityEntry[];
};

export default function GamesLandingPage() {
  const router = useRouter();
  const [lessonTray, setLessonTray] = useState<GameCard[]>([]);
  const [helpGame, setHelpGame] = useState<GameInfo | null>(null);
  const [popularity, setPopularity] = useState<GamePopularityPayload | null>(null);
  const gameGridRef = useRef<HTMLDivElement | null>(null);
  const gameCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    setLessonTray(readLessonTray() as GameCard[]);
    return subscribeToLessonTray((cards) => {
      setLessonTray(cards as GameCard[]);
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch("/api/games/popularity")
      .then(async (response) => {
        if (!response.ok) throw new Error(await response.text());
        return response.json() as Promise<GamePopularityPayload>;
      })
      .then((payload) => {
        if (mounted) setPopularity(payload);
      })
      .catch((error) => {
        console.error("Failed to load game popularity:", error);
        if (mounted) setPopularity(null);
      });

    return () => {
      mounted = false;
    };
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
    router.push(`/games/${gameId}`);
  };

  const scrollToGames = () => {
    gameGridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const statsByGameId = useMemo(() => {
    const weekly = new Map((popularity?.weekly ?? []).map((entry) => [entry.gameKey, entry.count] as const));
    const allTime = new Map((popularity?.allTime ?? []).map((entry) => [entry.gameKey, entry.count] as const));

    return GAMES.map((game) => ({
      ...game,
      weeklyCount: weekly.get(game.id) ?? 0,
      allTimeCount: allTime.get(game.id) ?? 0,
    }));
  }, [popularity]);

  const weeklyPopular = useMemo(() => {
    const sorted = [...statsByGameId].sort((left, right) => right.weeklyCount - left.weeklyCount || GAMES.findIndex((g) => g.id === left.id) - GAMES.findIndex((g) => g.id === right.id));
    return sorted.find((entry) => entry.weeklyCount > 0) ?? null;
  }, [statsByGameId]);

  const topThreeAllTime = useMemo(() => {
    return [...statsByGameId]
      .sort((left, right) => right.allTimeCount - left.allTimeCount || GAMES.findIndex((g) => g.id === left.id) - GAMES.findIndex((g) => g.id === right.id))
      .filter((entry) => entry.allTimeCount > 0)
      .slice(0, 3);
  }, [statsByGameId]);

  function scrollToGameCard(gameId: string) {
    const target = gameCardRefs.current[gameId];
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
      <div
        aria-hidden="true"
        className="pointer-events-none sticky top-0 z-[45] h-px bg-black/20"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg-main)]/96 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <BrandButton className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80" />

          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-4xl font-bold text-black">Games</h1>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => (window.location.href = "/flashcards")} className="btn btn-secondary">
              Flashcards
            </button>

            <button onClick={() => (window.location.href = "/dashboard")} className="btn btn-secondary">
              Dashboard
            </button>
          </div>
        </div>
      </header>

      {/* Lesson Tray */}
      <section className="sticky top-[73px] z-40 border-b border-black/5 bg-[var(--color-bg-main)]/96 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-black/5 bg-white/80 px-4 py-3 shadow-sm">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--color-text-muted)]">
                <Sparkles size={12} className="text-[var(--color-accent)]" />
                Lesson tray
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                Keep your lesson cards ready to launch into the classroom games.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-[var(--color-bg-main)] px-3 py-1.5 text-[var(--color-text-main)]">
                <Gamepad2 size={13} className="text-[var(--color-accent)]" />
                {lessonTray.length} cards ready
              </span>
              <button onClick={() => (window.location.href = "/flashcards")} className="btn btn-secondary px-3 py-2 text-xs">
                Add cards
              </button>
            </div>
          </div>

          <LessonTrayScroller className="mt-3 py-2" contentClassName="gap-3">
            {lessonTray.length === 0 && (
              <div className="px-4 py-2 rounded-lg border border-dashed border-black/20 text-sm text-[var(--color-text-muted)] whitespace-nowrap bg-white/70">
                Click flashcards to add
              </div>
            )}

            {lessonTray.map((card) => (
              <div
                key={card.id}
                className="group relative flex items-center gap-3 px-3 py-2 rounded-xl border bg-white/80 text-sm whitespace-nowrap shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[rgba(30,64,175,0.18)]"
                style={{ minWidth: 140 }}
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center ring-1 ring-black/5">
                  <img
                    src={resolveLessonImageUrl(card.image ?? "/placeholder.png")}
                    alt={card.word}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <span className="text-xs font-semibold text-gray-800">{card.word.replaceAll("_", " ")}</span>

                <button
                  onClick={() => removeFromLessonTray(card.id)}
                  className="absolute -top-0 -right-2 rounded-full border bg-white p-0.5 shadow transition-transform hover:-translate-y-0.5 hover:bg-red-50"
                  aria-label={`Remove ${card.word}`}
                >
                  <X size={12} className="text-red-500" />
                </button>
              </div>
            ))}
          </LessonTrayScroller>
        </div>
      </section>

      {/* Main content */}
      <main className="pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <section className="relative overflow-hidden rounded-[2rem] border border-black/5 bg-white/80 p-8 shadow-sm backdrop-blur-sm animate-fade-up">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(127,163,106,0.12),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(30,64,175,0.08),transparent_28%)]" />
            <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
              <div className="space-y-5">
                <span className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-[var(--color-bg-main)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
                  <Sparkles size={13} className="text-[var(--color-accent)]" />
                  Classroom games
                </span>

                <div className="space-y-3">
                  <h2 className="max-w-2xl text-4xl font-black tracking-tight text-[var(--color-text-main)] md:text-5xl">
                    Interactive Classroom Games
                  </h2>
                  <p className="max-w-2xl text-base text-[var(--color-text-muted)]">
                    Fun learning activities automatically created from the cards you select.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => (window.location.href = "/flashcards")}
                    className="btn btn-primary inline-flex items-center gap-2 px-5 py-3 text-sm shadow-sm"
                  >
                    <Play size={15} />
                    Add cards in Flashcards
                  </button>
                  <button
                    onClick={scrollToGames}
                    className="btn btn-secondary inline-flex items-center gap-2 px-5 py-3 text-sm"
                  >
                    Go to games
                    <ArrowDown size={15} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-black/5 bg-white/90 p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Games</div>
                  <div className="mt-2 text-3xl font-black text-[var(--color-text-main)]">{GAMES.length}</div>
                  <div className="mt-1 text-sm text-[var(--color-text-muted)]">Ready to play now</div>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/90 p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Most popular this week</div>
                  {weeklyPopular ? (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-2xl border border-black/5 bg-[var(--color-bg-main)] shadow-sm">
                        <img
                          src={weeklyPopular.image ?? "/placeholder.png"}
                          alt={weeklyPopular.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-lg font-black text-[var(--color-text-main)]">{weeklyPopular.title}</div>
                        <div className="text-sm text-[var(--color-text-muted)]">
                          {weeklyPopular.weeklyCount} plays this week
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 text-sm text-[var(--color-text-muted)]">Waiting for the first play this week.</div>
                  )}
                </div>
                <div className="col-span-2 rounded-2xl border border-black/5 bg-[linear-gradient(135deg,rgba(127,163,106,0.12),rgba(255,255,255,0.86))] p-4 shadow-sm">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">Top three all time</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    {topThreeAllTime.length > 0 ? (
                      topThreeAllTime.map((game, index) => (
                        <button
                          key={game.id}
                          onClick={() => scrollToGameCard(game.id)}
                          className="group text-left rounded-2xl border border-black/5 bg-white/90 p-3 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-bg-main)] text-sm font-black text-[var(--color-text-main)] shadow-sm">
                              #{index + 1}
                            </div>
                            <div className="h-12 w-12 overflow-hidden rounded-2xl border border-black/5 bg-[var(--color-bg-main)]">
                              <img
                                src={game.image ?? "/placeholder.png"}
                                alt={game.title}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-black text-[var(--color-text-main)]">{game.title}</div>
                              <div className="text-xs text-[var(--color-text-muted)]">{game.allTimeCount} plays</div>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="min-h-[104px] rounded-2xl border border-dashed border-black/10 bg-white/40 md:col-span-3" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-10 mb-6 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold">Choose a game</h3>
              <p className="mt-1 text-sm text-[var(--color-text-muted)]">Each game uses your lesson tray cards and opens in its own play space.</p>
            </div>
          </div>

          <div ref={gameGridRef} id="games-grid" className="scroll-mt-[180px] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {GAMES.map((g, index) => (
              <div
                key={g.id}
                ref={(el) => {
                  gameCardRefs.current[g.id] = el;
                }}
                className="group cursor-pointer scroll-mt-[180px] bg-white/90 rounded-[1.6rem] p-4 shadow-sm border border-black/5 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-[rgba(30,64,175,0.18)] animate-fade-up"
                style={{ animationDelay: `${index * 90}ms` }}
                role="button"
                tabIndex={0}
                onClick={() => enterGame(g.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    enterGame(g.id);
                  }
                }}
                aria-label={`Enter ${g.title}`}
              >
                <div className="space-y-3">
                  <div className="inline-flex max-w-full items-center rounded-2xl border border-black/5 bg-white/95 px-4 py-2 text-xl font-semibold shadow-sm">
                    <span className="truncate">{g.title}</span>
                  </div>

                  {g.subtitle && <p className="text-sm text-[var(--color-text-muted)]">{g.subtitle}</p>}

                  <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(30,64,175,0.10),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(127,163,106,0.10),transparent_30%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <img
                      src={g.image ?? "/placeholder.png"}
                      alt={g.title}
                      className="relative z-10 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        enterGame(g.id);
                      }}
                      className="btn btn-primary px-4 py-2.5 text-sm flex items-center gap-2 shadow-sm transition-transform group-hover:translate-x-0.5"
                    >
                      <Play size={14} />
                      Play
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setHelpGame(g as GameInfo);
                      }}
                      className="btn btn-secondary px-4 py-2.5 text-sm flex items-center gap-2 shadow-sm transition-transform group-hover:translate-x-0.5"
                    >
                      <HelpCircle size={14} />
                      How to play
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <GameHowToModal
        open={!!helpGame}
        game={helpGame as GameInfo | null}
        lessonCards={lessonTray}
        onClose={() => setHelpGame(null)}
      />
    </div>
  );
}
