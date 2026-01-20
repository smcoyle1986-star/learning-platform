"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Maximize, Minimize } from "lucide-react";

type GameCard = {
  id: string;
  word: string;
  image?: string | null;
};

type Team = {
  id: string;
  name: string;
  score: number;
};

const LESSON_TRAY_KEY = "classbloom-lesson-tray";

/* ----------------------
   Utilities (unchanged logic)
   ---------------------- */
function shuffleArray<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateClipPaths(count: number) {
  const shapes = [
    "polygon(10% 0%, 100% 0%, 85% 45%, 100% 100%, 0% 100%, 0% 10%)",
    "polygon(0% 0%, 100% 0%, 100% 70%, 70% 100%, 0% 100%, 0% 30%)",
    "polygon(0% 8%, 40% 0%, 100% 6%, 100% 60%, 60% 100%, 0% 100%)",
    "polygon(8% 0%, 100% 0%, 100% 100%, 30% 100%, 0% 80%, 0% 20%)",
    "polygon(0% 0%, 100% 0%, 92% 40%, 100% 100%, 0% 88%)",
    "polygon(10% 0%, 100% 10%, 88% 50%, 100% 100%, 0% 100%, 0% 50%)",
  ];
  return Array.from({ length: count }).map((_, i) => shapes[i % shapes.length]);
}

/* ----------------------
   Component: Card Reveal (persistence fix)
   ---------------------- */
export default function CardRevealPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Fullscreen handling
  const [isFullscreen, setIsFullscreen] = useState(false);
  useEffect(() => {
    function onFullChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
    document.addEventListener("fullscreenchange", onFullChange);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("fullscreenchange", onFullChange);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function enterFullscreen() {
    if (!containerRef.current) return;
    containerRef.current.requestFullscreen().catch(() => {});
  }
  function exitFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }
  function toggleFullscreen() {
    if (document.fullscreenElement) exitFullscreen();
    else enterFullscreen();
  }

  /* ----------------------
     PERSISTENCE FIX DETAILS (key change here)
     ---------------------- */
  const originalTrayRawRef = useRef<string | null>(null);
  const gameTrayRef = useRef<GameCard[]>([]);
  const [gameTray, setGameTray] = useState<GameCard[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LESSON_TRAY_KEY);
      originalTrayRawRef.current = raw;
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized: GameCard[] = Array.isArray(parsed)
          ? parsed.map((c: any) => ({
              id: String(c.id ?? c.word ?? Math.random().toString(36).slice(2)),
              word: String(c.word ?? c.text ?? ""),
              image: c.image ?? c.image_id ?? c.img ?? null,
            }))
          : [];
        setGameTray(shuffleArray(normalized));
        gameTrayRef.current = shuffleArray(normalized);
      } else {
        setGameTray([]);
        gameTrayRef.current = [];
      }
    } catch (e) {
      console.error("Failed to load lesson tray for Card Reveal:", e);
      originalTrayRawRef.current = null;
      setGameTray([]);
      gameTrayRef.current = [];
    }

    const handleBeforeUnload = () => {
      try {
        const toWrite = gameTrayRef.current;
        if (Array.isArray(toWrite) && toWrite.length > 0) {
          localStorage.setItem(LESSON_TRAY_KEY, JSON.stringify(toWrite));
        }
      } catch (e) {
        console.error("Failed to persist lesson tray on exit:", e);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      try {
        const toWrite = gameTrayRef.current;
        if (Array.isArray(toWrite) && toWrite.length > 0) {
          localStorage.setItem(LESSON_TRAY_KEY, JSON.stringify(toWrite));
        }
      } catch (e) {
        console.error("Failed to persist lesson tray on component unmount:", e);
      } finally {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      }
    };
    // run only on mount/unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep ref updated whenever local gameTray changes
  useEffect(() => {
    gameTrayRef.current = gameTray;
  }, [gameTray]);

  /* ----------------------
     Core game state (all gameplay logic preserved)
     ---------------------- */
  const [currentIndex, setCurrentIndex] = useState(0);
  const TILES_COLS = 6;
  const TILES_ROWS = 4;
  const TOTAL_TILES = TILES_COLS * TILES_ROWS;
  const CLIP_PATHS = generateClipPaths(TOTAL_TILES);

  const [tilesRemoved, setTilesRemoved] = useState<boolean[]>(() =>
    Array.from({ length: TOTAL_TILES }).map(() => false)
  );

  // keep a ref for latest tilesRemoved to avoid stale closures in intervals/timeouts
  const tilesRemovedRef = useRef<boolean[]>(tilesRemoved);
  useEffect(() => {
    tilesRemovedRef.current = tilesRemoved;
    // when all tiles removed, fire reveal state (handled via imageRevealTrigger below)
    const allRemoved = tilesRemoved.every(Boolean);
    if (allRemoved) {
      setImageRevealed(true);
    } else {
      setImageRevealed(false);
    }
  }, [tilesRemoved]);

  useEffect(() => {
    setTilesRemoved(Array.from({ length: TOTAL_TILES }).map(() => false));
    setIsAwaitingDecision(false);
    clearTimer();
    setTimerSeconds(null);
    setImageRevealed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  // Teams & turns
  const [teams, setTeams] = useState<Team[]>(() => [
    { id: "team-1", name: "Team 1", score: 0 },
    { id: "team-2", name: "Team 2", score: 0 },
  ]);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);

  // Awaiting decision & timer
  const [isAwaitingDecision, setIsAwaitingDecision] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Default turn timer and dynamic options (teacher-editable)
  const [turnTimerSeconds, setTurnTimerSeconds] = useState<number>(10);
  const TIMER_OPTIONS = [10, 15, 20, 30];

  // Winner state
  const [showWinner, setShowWinner] = useState(false);

  // small state to control image reveal animation
  const [imageRevealed, setImageRevealed] = useState(false);

  // Timer effect (preserve behavior)
  useEffect(() => {
    if (timerSeconds === null) return;
    if (timerSeconds <= 0) {
      handleTimerExpired();
      return;
    }
    timerRef.current = setTimeout(() => {
      setTimerSeconds((s) => (s !== null ? s - 1 : null));
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerSeconds]);

  function clearTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setTimerSeconds(null);
  }

  // Helper functions (preserve)
  function nextTeamIndex() {
    return (activeTeamIndex + 1) % teams.length;
  }
  function advanceToNextTeam() {
    setActiveTeamIndex((i) => (i + 1) % teams.length);
  }

  // Audio: brief tones using Web Audio API
  const audioCtxRef = useRef<AudioContext | null>(null);
  function getAudioCtx() {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch {
        audioCtxRef.current = null;
      }
    }
    return audioCtxRef.current;
  }

  function playTone(frequency = 880, duration = 0.08, type: OscillatorType = "sine", gain = 0.08) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = frequency;
    g.gain.value = gain;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    o.start(now);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    o.stop(now + duration + 0.02);
  }

  function playHighlightTone() {
    // bright short ping
    playTone(1200, 0.06, "sine", 0.06);
  }
  function playFinalTone() {
    // deeper short chord-like hit
    playTone(420, 0.18, "sine", 0.09);
    // small higher accent
    setTimeout(() => playTone(980, 0.12, "triangle", 0.06), 60);
  }

  // Modified removeRandomTile uses ref already
  function removeRandomTile() {
    const remainingIndexes = tilesRemovedRef.current
      .map((r, idx) => (!r ? idx : -1))
      .filter((v) => v !== -1) as number[];
    if (remainingIndexes.length === 0) return;
    const pick = remainingIndexes[Math.floor(Math.random() * remainingIndexes.length)];
    setTilesRemoved((prev) => prev.map((v, idx) => (idx === pick ? true : v)));
  }

  function handleRemoveTile() {
    if (isAwaitingDecision) return;
    removeRandomTile();
    setIsAwaitingDecision(true);
    setTimerSeconds(turnTimerSeconds);
  }

  // When correct, remove all tiles to reveal image fully and stop any active sequence
  function handleCorrect() {
    // stop any active random-remove sequence
    if (sequenceRef.current?.intervalId) {
      clearInterval(sequenceRef.current.intervalId);
    }
    if (sequenceRef.current?.timeoutId) {
      clearTimeout(sequenceRef.current.timeoutId);
    }
    sequenceRef.current = null;
    lastGlowingRef.current = null;
    setGlowingIndex(null);
    // award points and reveal full image
    const remaining = tilesRemoved.filter((t) => !t).length;
    const points = remaining;
    setTeams((prev) => prev.map((t, idx) => (idx === activeTeamIndex ? { ...t, score: t.score + points } : t)));
    // remove all tiles (this will trigger imageRevealed via tilesRemovedRef effect)
    setTilesRemoved((prev) => prev.map(() => true));
    // play final reveal tone
    playFinalTone();
    clearTimer();
    setIsAwaitingDecision(false);

    setTimeout(() => {
      const nextIndex = currentIndex + 1;
      if (nextIndex >= gameTray.length) {
        setShowWinner(true);
      } else {
        setCurrentIndex(nextIndex);
      }
      setActiveTeamIndex(nextTeamIndex());
    }, 900);
  }

  function handlePass() {
    // stop any active sequence as well
    if (sequenceRef.current?.intervalId) {
      clearInterval(sequenceRef.current.intervalId);
    }
    if (sequenceRef.current?.timeoutId) {
      clearTimeout(sequenceRef.current.timeoutId);
    }
    sequenceRef.current = null;
    lastGlowingRef.current = null;
    setGlowingIndex(null);

    clearTimer();
    setIsAwaitingDecision(false);
    advanceToNextTeam();
  }

  function handleTimerExpired() {
    clearTimer();
    setIsAwaitingDecision(false);
    advanceToNextTeam();
  }

  // Remove card from local game tray only — do not touch localStorage or external trays here
  function removeCardFromGame(cardId: string) {
    setGameTray((prev) => {
      const filtered = prev.filter((c) => String(c.id) !== String(cardId));
      if (filtered.length === 0) {
        setShowWinner(true);
        return filtered;
      }
      if (currentIndex >= filtered.length) {
        setCurrentIndex(Math.max(0, filtered.length - 1));
      }
      return filtered;
    });
  }

  // Team management helpers (preserve)
  function addTeam() {
    if (teams.length >= 6) return;
    const next = teams.length + 1;
    setTeams((s) => [...s, { id: `team-${next}`, name: `Team ${next}`, score: 0 }]);
  }
  function removeLastTeam() {
    setTeams((s) => {
      if (s.length <= 2) return s;
      const next = s.slice(0, -1);
      setActiveTeamIndex((i) => Math.max(0, Math.min(i, next.length - 1)));
      return next;
    });
  }
  function removeTeam(id: string) {
    if (teams.length <= 2) return;
    setTeams((s) => s.filter((t) => t.id !== id));
    setActiveTeamIndex((i) => Math.max(0, Math.min(i, teams.length - 2)));
  }
  function setTeamName(id: string, name: string) {
    setTeams((s) => s.map((t) => (t.id === id ? { ...t, name } : t)));
  }
  function adjustScore(id: string, delta: number) {
    setTeams((s) => s.map((t) => (t.id === id ? { ...t, score: Math.max(0, t.score + delta) } : t)));
  }

  // winner computation
  const winner = showWinner ? teams.reduce((best, t) => (t.score > best.score ? t : best), teams[0]) : null;
  const currentCard = gameTray[currentIndex];

  /* ----------------------
     New: central remove sequence state & logic
     - lastGlowingRef ensures final pick prefers last glowing tile
     - interval/timeout use tilesRemovedRef to avoid stale closure bugs
     - plays highlight sounds and final sound; spotlight dimming reduced & scale adjusted
     - image reveal fades in when all tiles removed
     ---------------------- */
  const [specialRemoveActive, setSpecialRemoveActive] = useState(false);
  const [glowingIndex, setGlowingIndex] = useState<number | null>(null);
  const sequenceRef = useRef<{ intervalId?: number; timeoutId?: number } | null>(null);
  const lastGlowingRef = useRef<number | null>(null);

  function startRandomRemoveSequence() {
    if (isAwaitingDecision) return;
    const remaining = tilesRemovedRef.current
      .map((r, idx) => (!r ? idx : -1))
      .filter((v) => v !== -1) as number[];
    if (remaining.length === 0) return;

    setSpecialRemoveActive(true);
    const intervalMs = 400;
    sequenceRef.current = {};

    sequenceRef.current.intervalId = window.setInterval(() => {
      const rem = tilesRemovedRef.current
        .map((r, idx) => (!r ? idx : -1))
        .filter((v) => v !== -1) as number[];
      if (rem.length === 0) {
        setGlowingIndex(null);
        lastGlowingRef.current = null;
        return;
      }
      const pick = rem[Math.floor(Math.random() * rem.length)];
      lastGlowingRef.current = pick;
      setGlowingIndex(pick);
      // play small highlight ping
      playHighlightTone();
    }, intervalMs);

    sequenceRef.current.timeoutId = window.setTimeout(() => {
      if (sequenceRef.current?.intervalId) {
        window.clearInterval(sequenceRef.current.intervalId);
      }

      const remFinal = tilesRemovedRef.current
        .map((r, idx) => (!r ? idx : -1))
        .filter((v) => v !== -1) as number[];

      let finalPick: number | null = null;
      if (lastGlowingRef.current !== null && remFinal.includes(lastGlowingRef.current)) {
        finalPick = lastGlowingRef.current;
      } else if (remFinal.length > 0) {
        finalPick = remFinal[Math.floor(Math.random() * remFinal.length)];
      }

      if (finalPick !== null) {
        setTilesRemoved((prev) => prev.map((v, idx) => (idx === finalPick ? true : v)));
      }

      // play final tone
      playFinalTone();

      lastGlowingRef.current = null;
      setGlowingIndex(null);
      setSpecialRemoveActive(false);

      // show decision buttons and start timer
      setIsAwaitingDecision(true);
      setTimerSeconds(turnTimerSeconds);

      if (sequenceRef.current?.timeoutId) {
        window.clearTimeout(sequenceRef.current.timeoutId);
      }
      sequenceRef.current = null;
    }, 5000);
  }

  useEffect(() => {
    return () => {
      if (sequenceRef.current?.intervalId) window.clearInterval(sequenceRef.current.intervalId);
      if (sequenceRef.current?.timeoutId) window.clearTimeout(sequenceRef.current.timeoutId);
      sequenceRef.current = null;
    };
  }, []);

  /* ----------------------
     UI tweaks already implemented earlier:
     - spotlight scale increased to be more visible
     - dimming reduced for non-selected tiles (brightness ~0.85)
     - pastel green tiles present
     - pressing O removes all tiles (reveals image) and triggers final sound + fade-in
     - Added image fade-in animation by toggling imageRevealed
     ---------------------- */

  // Empty state when no cards:
  if (!currentCard && !showWinner) {
    return (
      <div className={`min-h-screen ${isFullscreen ? "bg-[hsl(140,40%,95%)] text-black" : "bg-[var(--color-bg-main)] text-[var(--color-text-main)]"}`} ref={containerRef}>
        <header className={`fixed top-0 left-0 right-0 z-50 bg-[var(--color-bg-main)]/95 backdrop-blur-md border-b border-black/5 ${isFullscreen ? "hidden" : ""}`}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="text-3xl font-extrabold text-blue-700">ClassBloom</a>
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <h1 className="text-2xl font-bold text-black">Card Reveal</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleFullscreen} className="p-2 rounded-md bg-white text-green-900 border border-black/10" title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
              {!isFullscreen && (
                <button onClick={() => router.push("/games")} className="px-3 py-1 rounded-md bg-[var(--color-primary)] text-white text-sm flex items-center gap-2">
                  <Play size={14} /> Exit
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="pt-[72px] max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl p-6 shadow">
            <h2 className="text-lg font-semibold mb-2">No cards selected</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">Add cards from Flashcards or choose a saved set in Dashboard then open Games → Card Reveal.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => router.push("/flashcards")} className="px-4 py-2 rounded-lg bg-green-200 text-green-900 text-sm hover:bg-green-300">Go to Flashcards</button>
              <button onClick={() => router.push("/dashboard")} className="px-4 py-2 rounded-lg bg-white text-gray-800 border border-black/10 text-sm hover:shadow-md">Return to Dashboard</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ----------------------
     Main playable layout with scoreboard changes
     ---------------------- */
  const urgent = isAwaitingDecision && timerSeconds !== null && timerSeconds <= 3;

  // helper: are any tiles remaining?
  const tilesRemaining = tilesRemoved.some((t) => !t);

  return (
    <div ref={containerRef} className={`min-h-screen ${isFullscreen ? "bg-[hsl(140,40%,95%)] text-black" : "bg-[var(--color-bg-main)] text-[var(--color-text-main)]"}`}>
      {/* Header unchanged */}
      <header className={`fixed top-0 left-0 right-0 z-50 bg-[var(--color-bg-main)]/95 backdrop-blur-md border-b border-black/5 ${isFullscreen ? "hidden" : ""}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="text-3xl font-extrabold text-blue-700">ClassBloom</a>

          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-2xl font-bold text-black">Card Reveal</h1>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={toggleFullscreen} className="p-2 rounded-md bg-white text-green-900 border border-black/10" title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}>
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>

            {!isFullscreen && (
              <button onClick={() => {
                try {
                  const toWrite = gameTrayRef.current;
                  if (Array.isArray(toWrite) && toWrite.length > 0) {
                    localStorage.setItem(LESSON_TRAY_KEY, JSON.stringify(toWrite));
                  }
                } catch {}
                router.push("/games");
              }} className="px-3 py-1 rounded-md bg-[var(--color-primary)] text-white text-sm flex items-center gap-2">
                <Play size={14} /> Exit
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Compact scoreboard */}
      <div className={`pt-[68px] max-w-7xl mx-auto px-4`}>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Scoreboard</h2>
            <div className="text-sm text-[var(--color-text-muted)]">Teams</div>

            {/* Add / Remove last / Reset */}
            <div className="flex items-center gap-1 ml-2">
              <button onClick={addTeam} disabled={teams.length >= 6} title="Add team" className="p-1.5 rounded-md bg-white border border-black/10 text-sm disabled:opacity-50">+</button>
              <button onClick={removeLastTeam} disabled={teams.length <= 2} title="Remove last team" className="p-1.5 rounded-md bg-white border border-black/10 text-sm disabled:opacity-50">−</button>
              <button onClick={() => setTeams((s) => s.map((t) => ({ ...t, score: 0 })))} title="Reset scores" className="p-1.5 rounded-md bg-white border border-black/10 text-sm">⟲</button>
            </div>
          </div>

          {/* Controls: active, dramatic timer, timer selector, counter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2 py-1 rounded-md border bg-white text-sm">
              <div className="text-xs text-[var(--color-text-muted)]">Active</div>
              <div className="font-semibold">{teams[activeTeamIndex]?.name}</div>
              <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse ml-2" />
            </div>

            {/* Dramatic countdown timer (bigger / animated) */}
            <div className="flex items-center gap-1">
              {isAwaitingDecision ? (
                <div className={`countdown-big ${urgent ? "urgent" : ""}`}>
                  {timerSeconds !== null ? `${timerSeconds}s` : `${turnTimerSeconds}s`}
                </div>
              ) : null}
            </div>

            {/* Timer selector */}
            <div className="flex items-center gap-1 ml-2">
              <div className="text-xs text-[var(--color-text-muted)] mr-1">Timer</div>
              <div className="flex items-center gap-1 bg-white border border-black/10 rounded-md p-1">
                {TIMER_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setTurnTimerSeconds(opt);
                      setTimerSeconds((prev) => (prev !== null ? opt : prev));
                    }}
                    className={`px-2 py-0.5 text-xs rounded ${turnTimerSeconds === opt ? "bg-[var(--color-primary)] text-white" : "bg-transparent text-black"}`}
                    title={`${opt}s`}
                  >
                    {opt}s
                  </button>
                ))}
              </div>
            </div>

            <div className="text-sm text-[var(--color-text-muted)] ml-3">Card {currentIndex + 1}/{gameTray.length}</div>
          </div>
        </div>

        {/* Team boxes: up to 6 per row; show full "Team 1" label and move score next to it */}
        <div className="mb-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {teams.map((team, idx) => (
            <div key={team.id} className={`p-2 rounded-md border flex items-center justify-between ${activeTeamIndex === idx ? "ring-2 ring-[var(--color-primary)]" : ""}`}>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{team.name}</div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-xl font-bold w-10 text-center">{team.score}</div>
                <button onClick={() => adjustScore(team.id, -1)} className="px-2 py-1 rounded-md bg-white border border-black/10 text-sm">−</button>
                <button onClick={() => adjustScore(team.id, +1)} className="px-2 py-1 rounded-md bg-white border border-black/10 text-sm">+</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main game grid */}
      <main className="max-w-7xl mx-auto px-4 pb-6" style={{ minHeight: "calc(100vh - 220px)" }}>
        <div className="flex justify-center items-start h-full">
          <div className={`w-full ${isFullscreen ? "max-w-[1600px]" : "max-w-6xl"} rounded-3xl shadow-2xl overflow-hidden border`} style={{ aspectRatio: isFullscreen ? "16/9" : "16/9" }}>
            <div className="relative w-full h-full bg-gray-100">
              {/* image (if present) - opacity controlled for fade-in reveal */}
              <img
                src={currentCard?.image ?? ""}
                alt={currentCard?.word ?? ""}
                className={`w-full h-full object-cover ${imageRevealed ? "image-revealed" : "image-covered"}`}
                style={{ display: currentCard?.image ? undefined : "none" }}
              />

              {/* tiles overlay */}
              <div className="absolute inset-0">
                {Array.from({ length: TOTAL_TILES }).map((_, i) => {
                  const isGlowing = i === glowingIndex && !tilesRemoved[i];
                  const isUrgentTile = urgent && !tilesRemoved[i];
                  const hasImage = !!currentCard?.image;
                  // pastel green for site
                  const pastelGreen = "#dff7e6"; // light pastel green
                  return (
                    <div
                      key={i}
                      className="absolute"
                      style={{
                        width: `${100 / TILES_COLS}%`,
                        height: `${100 / TILES_ROWS}%`,
                        left: `${(i % TILES_COLS) * (100 / TILES_COLS)}%`,
                        top: `${Math.floor(i / TILES_COLS) * (100 / TILES_ROWS)}%`,
                        overflow: "hidden",
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          clipPath: CLIP_PATHS[i],
                          width: "100%",
                          height: "100%",
                          backgroundImage: hasImage ? `url("${currentCard?.image}")` : undefined,
                          backgroundColor: hasImage ? "rgba(215,247,225,0.10)" : (tilesRemoved[i] ? "transparent" : pastelGreen),
                          backgroundBlendMode: hasImage ? "overlay" : undefined,
                          backgroundSize: hasImage ? `${TILES_COLS * 100}% ${TILES_ROWS * 100}%` : undefined,
                          backgroundPosition: hasImage ? `${((i % TILES_COLS) / Math.max(1, TILES_COLS - 1)) * 100}% ${(Math.floor(i / TILES_COLS) / Math.max(1, TILES_ROWS - 1)) * 100}%` : undefined,
                          transition: "opacity 350ms ease, box-shadow 260ms ease, transform 220ms ease, filter 220ms ease",
                          opacity: tilesRemoved[i] ? 0 : 1,
                          backgroundRepeat: "no-repeat",
                          // Spotlight effect for selection: brighten selected tile and dim others slightly
                          boxShadow: isGlowing
                            ? "0 0 60px 26px rgba(255,215,0,0.95), inset 0 0 0 1px rgba(255,255,255,0.7)"
                            : isUrgentTile
                              ? "0 0 36px 14px rgba(255,45,85,0.75)"
                              : "inset 0 0 0 1px rgba(0,0,0,0.06)",
                          // increased spotlight scale for better visibility
                          transform: isGlowing ? "scale(1.12)" : isUrgentTile ? "scale(1.03)" : "scale(1)",
                          zIndex: isGlowing ? 55 : undefined,
                          // reduced dimming: brightness 0.85 instead of 0.72
                          filter: (!isGlowing && (specialRemoveActive || urgent)) && !tilesRemoved[i] ? "brightness(0.85) saturate(0.95)" : undefined,
                          animation: isUrgentTile ? "tile-urgent 900ms ease-in-out infinite" : isGlowing ? "glow-spot 600ms ease-in-out infinite" : undefined,
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* central large Remove button (in front of tiles) */}
              {!isAwaitingDecision && !specialRemoveActive && tilesRemoved.filter(Boolean).length < TOTAL_TILES && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startRandomRemoveSequence();
                    }}
                    className="pointer-events-auto px-8 py-5 rounded-full bg-red-600 text-white text-2xl font-bold shadow-2xl transform hover:scale-105 transition"
                    title="Remove a tile (random)"
                  >
                    Remove Tile
                  </button>
                </div>
              )}

              {/* X/O buttons moved to bottom center of the game grid */}
              {isAwaitingDecision && (
                <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4 z-60 pointer-events-auto">
                  <button
                    onClick={handlePass}
                    className="px-4 py-2 rounded-md bg-white text-red-600 border border-red-200 text-lg shadow-sm"
                    title="Pass (X)"
                  >
                    ❌
                  </button>
                  <button
                    onClick={handleCorrect}
                    className="px-4 py-2 rounded-md bg-green-400 text-green-900 text-lg shadow-sm"
                    title="Correct (O)"
                  >
                    ⭕
                  </button>
                </div>
              )}

              {/* bottom info overlay (compact) */}
              <div className="absolute bottom-3 right-3 text-sm">
                <div className="bg-white/90 text-black rounded-full px-2 py-1 text-xs shadow-sm">{tilesRemoved.filter(Boolean).length}/{TOTAL_TILES} tiles removed</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        body { --color-primary: #2563eb; }
        .bg-[var(--Color-bg-main)] { background-color: #f8fafc; }
        .bg-[var(--Color-bg-soft)] { background-color: #f3f4f6; }

        /* Dramatic countdown style */
        .countdown-big {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 64px;
          padding: 10px 14px;
          border-radius: 10px;
          background: linear-gradient(90deg,#ff7a18,#ff2d55);
          color: white;
          font-weight: 800;
          font-size: 20px;
          box-shadow: 0 6px 18px rgba(255,45,85,0.28);
          transform-origin: center;
          animation: countdown-pulse 900ms ease-in-out infinite;
        }
        .countdown-big.urgent {
          background: linear-gradient(90deg,#ff2d55,#ff0000);
          font-size: 26px;
          padding: 12px 18px;
          animation: countdown-urgent 500ms ease-in-out infinite;
          box-shadow: 0 10px 30px rgba(255,0,0,0.35);
        }
        @keyframes countdown-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
        @keyframes countdown-urgent {
          0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(255,0,0,0)); }
          50% { transform: scale(1.12); filter: drop-shadow(0 8px 26px rgba(255,0,0,0.45)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(255,0,0,0)); }
        }

        /* New stronger glowing "spotlight" */
        @keyframes glow-spot {
          0% { transform: scale(1.00); box-shadow: 0 0 38px 18px rgba(255,215,0,0.85); }
          50% { transform: scale(1.12); box-shadow: 0 0 64px 28px rgba(255,215,0,0.98); }
          100% { transform: scale(1.00); box-shadow: 0 0 38px 18px rgba(255,215,0,0.85); }
        }

        /* Urgent tile pulse animation (applies when countdown <= 3s) */
        @keyframes tile-urgent {
          0% { transform: scale(1); box-shadow: 0 0 10px 4px rgba(255,45,85,0.45); }
          50% { transform: scale(1.04); box-shadow: 0 0 36px 14px rgba(255,45,85,0.85); }
          100% { transform: scale(1); box-shadow: 0 0 10px 4px rgba(255,45,85,0.45); }
        }

        /* image reveal fade */
        .image-covered { opacity: 0.94; transition: opacity 450ms ease-in; }
        .image-revealed { opacity: 1; transition: opacity 600ms ease-in; }

        @media (min-width: 768px) {
          .grid-cols-6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }
        }

        @keyframes fall { 0% { transform: translateY(-120%) rotate(0deg); opacity: 1; } 100% { transform: translateY(120vh) rotate(360deg); opacity: 0; } }
        .animate-fall { animation: fall 2200ms linear infinite; }
        :fullscreen { color-scheme: light; }
      `}</style>
    </div>
  );
}