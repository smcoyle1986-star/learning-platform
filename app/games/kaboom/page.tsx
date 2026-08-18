"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GameHeader from "@/components/games/GameHeader";
import { GameSettingsDropdown } from "@/components/games/GameSettingsSurface";
import { trackGameStart } from "@/lib/games/track-game-start";

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

const LESSON_TRAY_KEY = "classendo-lesson-tray";
const KABOOM_GRID_KEY = "kaboom-grid-count";
const KABOOM_SELECTION_MODE_KEY = "kaboom-selection-mode";

type SelectionMode = "random" | "manual";

function shuffleArray<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function generateLetters(count: number) {
  const letters: string[] = [];
  for (let i = 0; i < count; i++) {
    letters.push(String.fromCharCode(65 + i));
  }
  return letters;
}

export default function KaBoomPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controlsRef = useRef<HTMLDivElement | null>(null);

  // fullscreen handling
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
     Lesson tray persistence (same approach as Card Reveal)
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
          ? parsed.map((c: Record<string, unknown>) => ({
              id: String(c.id ?? c.word ?? Math.random().toString(36).slice(2)),
              word: String(c.word ?? c.text ?? ""),
              image: typeof c.image === "string" ? c.image
                : typeof c.image_id === "string" ? c.image_id
                  : typeof c.img === "string" ? c.img : null,
            }))
          : [];
        setGameTray(shuffleArray(normalized));
        gameTrayRef.current = shuffleArray(normalized);
      } else {
        setGameTray([]);
        gameTrayRef.current = [];
      }
    } catch (e) {
      console.error("Failed to load lesson tray for KaBoom:", e);
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
        console.error("Failed to persist lesson tray on exit (KaBoom):", e);
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
        console.error("Failed to persist lesson tray on unmount (KaBoom):", e);
      } finally {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    gameTrayRef.current = gameTray;
  }, [gameTray]);

  /* ----------------------
     Game state
  ---------------------- */

  // load persisted grid if present
  const persistedGrid = (() => {
    try {
      const v = localStorage.getItem(KABOOM_GRID_KEY);
      if (v) {
        const n = parseInt(v, 10);
        if ([4, 5, 6].includes(n)) return n;
      }
    } catch {}
    return 5;
  })();
  const [gridCount, setGridCount] = useState<number>(persistedGrid);
  const [cols, setCols] = useState<number>(gridCount);
  const [rows, setRows] = useState<number>(gridCount);

  useEffect(() => {
    setCols(gridCount);
    setRows(gridCount);
    try {
      localStorage.setItem(KABOOM_GRID_KEY, String(gridCount));
    } catch {}
  }, [gridCount]);

  // tiles
  const [tilesRemoved, setTilesRemoved] = useState<boolean[]>(() =>
    Array.from({ length: cols * rows }).map(() => false)
  );
  const tilesRemovedRef = useRef<boolean[]>(tilesRemoved);
  useEffect(() => {
    tilesRemovedRef.current = tilesRemoved;
  }, [tilesRemoved]);

  const [tilesPoints, setTilesPoints] = useState<(number | null)[]>(() =>
    Array.from({ length: cols * rows }).map(() => null)
  );
  const [tilesBomb, setTilesBomb] = useState<boolean[]>(() =>
    Array.from({ length: cols * rows }).map(() => false)
  );

  // keep arrays in sync when grid changes
  useEffect(() => {
    const total = rows * cols;
    setTilesPoints((prev) => Array.from({ length: total }).map((_, i) => prev[i] ?? null));
    setTilesBomb((prev) => Array.from({ length: total }).map((_, i) => prev[i] ?? false));
    setTilesRemoved((prev) => Array.from({ length: total }).map((_, i) => prev[i] ?? false));
  }, [rows, cols]);

  // scoreboard & teams
  const [teams, setTeams] = useState<Team[]>(() => [
    { id: "team-1", name: "Team 1", score: 0 },
    { id: "team-2", name: "Team 2", score: 0 },
  ]);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
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
  function adjustScore(id: string, delta: number) {
    setTeams((s) => s.map((t) => (t.id === id ? { ...t, score: Math.max(0, t.score + delta) } : t)));
  }

  // modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [modalText, setModalText] = useState<string | null>(null);
  const [modalTileIndex, setModalTileIndex] = useState<number | null>(null);

  // center reveal
  const [centerReveal, setCenterReveal] = useState<{ kind: "points" | "bomb"; value?: number } | null>(null);

  // winner modal
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);
  const [winnerTeam, setWinnerTeam] = useState<Team | null>(null);
  const winnerTimerRef = useRef<number | null>(null);

  // audio helpers (music file + toggle)
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [musicOn, setMusicOn] = useState(false);
  const [musicSrc, setMusicSrc] = useState<string | null>(null);

  function handleMusicFile(file?: File | null) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMusicSrc(url);
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.loop = true;
    } else {
      audioRef.current.src = url;
      audioRef.current.loop = true;
    }
    if (musicOn) {
      audioRef.current.play().catch(() => {});
    }
  }

  // --- Reintroduced WebAudio helpers (fixes missing playHighlight/playReveal/playKaboom/playWinner) ---
  const audioCtxRef = useRef<AudioContext | null>(null);
  function getAudioCtx() {
    if (!audioCtxRef.current) {
      try {
        const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
        const AudioContextConstructor = window.AudioContext || audioWindow.webkitAudioContext;
        audioCtxRef.current = AudioContextConstructor ? new AudioContextConstructor() : null;
      } catch {
        audioCtxRef.current = null;
      }
    }
    return audioCtxRef.current;
  }
  function playTone(frequency = 880, duration = 0.08, type: OscillatorType = "sine", gain = 0.06) {
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
  function playHighlight() { playTone(1200, 0.05, "sine", 0.05); }
  function playReveal() {
    playTone(520, 0.14, "sine", 0.09);
    setTimeout(() => playTone(920, 0.10, "triangle", 0.06), 60);
  }
  function playKaboom() {
    playTone(260, 0.25, "sine", 0.12);
    setTimeout(() => playTone(420, 0.18, "triangle", 0.08), 90);
  }
  function playWinner() {
    playTone(880, 0.14, "sine", 0.08);
    setTimeout(() => playTone(660, 0.12, "sine", 0.08), 160);
    setTimeout(() => playTone(1040, 0.12, "triangle", 0.09), 320);
  }
  // --- end WebAudio helpers ---

  // 8-bit theme scheduler
  const themeIntervalRef = useRef<number | null>(null);
  const themeStepRef = useRef(0);
  // simple chiptune-ish melody (frequencies in Hz)
  const themeNotes = [
    880, 880, 0, 660, 880, 0, 660, 0,
    880, 880, 0, 660, 880, 0, 660, 0,
    1046, 0, 880, 0, 784, 0, 698, 0
  ];

  function start8bitTheme() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    // resume context on user gesture if suspended
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    // avoid double-start
    if (themeIntervalRef.current != null) return;
    themeStepRef.current = 0;
    themeIntervalRef.current = window.setInterval(() => {
      const step = themeStepRef.current % themeNotes.length;
      const freq = themeNotes[step];
      if (freq > 0) {
        playTone(freq, 0.18, "square", 0.08);
      }
      themeStepRef.current += 1;
    }, 220);
  }

  function stop8bitTheme() {
    if (themeIntervalRef.current != null) {
      clearInterval(themeIntervalRef.current);
      themeIntervalRef.current = null;
    }
  }

  // toggle header music to play built-in 8-bit theme (per user request)
  function toggleThemeMusic() {
    setMusicOn((v) => {
      const next = !v;
      if (next) {
        start8bitTheme();
      } else {
        stop8bitTheme();
      }
      return next;
    });
  }

  // kaboom probability state (default same as before)
  const [kaboomProbability, setKaboomProbability] = useState<number>(0.22);
  const [selectionMode, setSelectionMode] = useState<SelectionMode>(() => {
    try {
      const stored = localStorage.getItem(KABOOM_SELECTION_MODE_KEY);
      if (stored === "random" || stored === "manual") return stored;
    } catch {}
    return "random";
  });

  // flashcard display mode
  const [flashcardMode, setFlashcardMode] = useState<"image+text" | "image" | "text">("image+text");
  const [hoveredTileIndex, setHoveredTileIndex] = useState<number | null>(null);

  // settings dropdown (we'll hide grid/music inside settings per user's instruction)
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(KABOOM_SELECTION_MODE_KEY, selectionMode);
    } catch {}
  }, [selectionMode]);

  // spotlight sequence (teacher-started) that can optionally auto-select at end
  const [specialRemoveActive, setSpecialRemoveActive] = useState(false);
  const [glowingIndex, setGlowingIndex] = useState<number | null>(null);
  const sequenceRef = useRef<{ intervalId?: number; timeoutId?: number } | null>(null);
  const lastGlowingRef = useRef<number | null>(null);
  const lastFinalPickRef = useRef<number | null>(null);

  function getRemainingTileIndexes(excludeIndex: number | null = null) {
    const remaining = tilesRemovedRef.current
      .map((r, idx) => (!r ? idx : -1))
      .filter((v) => v !== -1) as number[];
    if (excludeIndex === null || remaining.length <= 1) return remaining;
    const filtered = remaining.filter((idx) => idx !== excludeIndex);
    return filtered.length > 0 ? filtered : remaining;
  }

  function startRandomHighlightSequence(autoSelect = false) {
    trackGameStart("kaboom");
    // stop any existing sequence first
    if (sequenceRef.current?.intervalId) {
      clearInterval(sequenceRef.current.intervalId);
    }
    if (sequenceRef.current?.timeoutId) {
      clearTimeout(sequenceRef.current.timeoutId);
    }
    sequenceRef.current = null;
    setGlowingIndex(null);
    lastGlowingRef.current = null;

    const remaining = getRemainingTileIndexes(lastFinalPickRef.current);
    if (remaining.length === 0) return;

    setSpecialRemoveActive(true);
    sequenceRef.current = {};
    const shuffled = shuffleArray(remaining);
    let step = 0;

    sequenceRef.current.intervalId = window.setInterval(() => {
      const rem = getRemainingTileIndexes(lastFinalPickRef.current);
      if (rem.length === 0) {
        setGlowingIndex(null);
        lastGlowingRef.current = null;
        return;
      }
      const pick = shuffled[step % shuffled.length];
      step += 1;
      lastGlowingRef.current = pick;
      setGlowingIndex(pick);
      playHighlight();
    }, 400);

    // after 5s stop. If autoSelect is true select the last glowing tile for the active team.
    sequenceRef.current.timeoutId = window.setTimeout(() => {
      if (sequenceRef.current?.intervalId) {
        clearInterval(sequenceRef.current.intervalId);
      }
      const remFinal = getRemainingTileIndexes(lastFinalPickRef.current);

      let finalPick: number | null = null;
      if (remFinal.length > 0) {
        finalPick = remFinal[Math.floor(Math.random() * remFinal.length)];
      }

      // clear visual sequence state
      setSpecialRemoveActive(false);
      setGlowingIndex(null);
      lastGlowingRef.current = null;
      sequenceRef.current = null;

      if (autoSelect && finalPick !== null) {
        lastFinalPickRef.current = finalPick;
        // automatically open modal for the chosen tile for the active team
        // small delay to ensure UI updates (not strictly necessary)
        setTimeout(() => {
          handleTileClick(finalPick!, "auto");
        }, 150);
      }
    }, 5000);
  }

  useEffect(() => {
    return () => {
      if (sequenceRef.current?.intervalId) window.clearInterval(sequenceRef.current.intervalId);
      if (sequenceRef.current?.timeoutId) window.clearTimeout(sequenceRef.current.timeoutId);
      sequenceRef.current = null;
      // stop theme on unmount
      stop8bitTheme();
    };
  }, []);

  // modal actions
  function handleModalIncorrect() {
    setModalOpen(false);
    setModalImage(null);
    setModalText(null);
    setModalTileIndex(null);
  }

  function nextTeamIndex() {
    return (activeTeamIndex + 1) % teams.length;
  }

  function handleModalCorrect() {
    const idx = modalTileIndex;
    if (idx === null) return;

    const isBomb = Math.random() < kaboomProbability;
    if (isBomb) {
      setTilesBomb((prev) => prev.map((v, i) => (i === idx ? true : v)));
      setTilesRemoved((prev) => prev.map((v, i) => (i === idx ? true : v)));
      setTeams((prev) => prev.map((t, i) => (i === activeTeamIndex ? { ...t, score: Math.max(0, t.score - 5) } : t)));
      setCenterReveal({ kind: "bomb" });
      playKaboom();
    } else {
      const points = Math.floor(Math.random() * 5) + 1;
      setTilesPoints((prev) => prev.map((v, i) => (i === idx ? points : v)));
      setTilesRemoved((prev) => prev.map((v, i) => (i === idx ? true : v)));
      setTeams((prev) => prev.map((t, i) => (i === activeTeamIndex ? { ...t, score: t.score + points } : t)));
      setCenterReveal({ kind: "points", value: points });
      playReveal();
    }

    setModalOpen(false);
    setModalImage(null);
    setModalText(null);
    setModalTileIndex(null);

    // advance to next team after a reveal
    setActiveTeamIndex(nextTeamIndex());

    // keep center reveal visible for a few seconds so the reward animation can finish
    setTimeout(() => {
      setCenterReveal(null);
    }, 3600);
  }

  function handlePass() {
    if (sequenceRef.current?.intervalId) {
      clearInterval(sequenceRef.current.intervalId);
    }
    if (sequenceRef.current?.timeoutId) {
      clearTimeout(sequenceRef.current.timeoutId);
    }
    sequenceRef.current = null;
    lastGlowingRef.current = null;
    setGlowingIndex(null);

    setModalOpen(false);
    setModalImage(null);
    setModalText(null);
    setModalTileIndex(null);

    setActiveTeamIndex(nextTeamIndex());
  }

  function removeCardFromGame(cardId: string) {
    setGameTray((prev) => prev.filter((c) => String(c.id) !== String(cardId)));
  }

  // Reset game function (restore tray, reset tiles & metadata but keep teams)
  function resetGame() {
    try {
      const raw = originalTrayRawRef.current;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const normalized: GameCard[] = Array.isArray(parsed)
        ? parsed.map((c: Record<string, unknown>) => ({
            id: String(c.id ?? c.word ?? Math.random().toString(36).slice(2)),
            word: String(c.word ?? c.text ?? ""),
            image: typeof c.image === "string" ? c.image
              : typeof c.image_id === "string" ? c.image_id
                : typeof c.img === "string" ? c.img : null,
          }))
        : [];
      const shuffled = shuffleArray(normalized);
      setGameTray(shuffled);
      gameTrayRef.current = shuffled;
      // reset tiles state
      const total = rows * cols;
      setTilesRemoved(Array.from({ length: total }).map(() => false));
      setTilesPoints(Array.from({ length: total }).map(() => null));
      setTilesBomb(Array.from({ length: total }).map(() => false));
      setCenterReveal(null);
      setWinnerModalOpen(false);
      setWinnerTeam(null);
      setModalOpen(false);
      setModalImage(null);
      setModalText(null);
      setModalTileIndex(null);
      lastFinalPickRef.current = null;
    } catch (e) {
      console.error("Failed to reset game tray:", e);
    }
  }

  // winner detection: when all tiles removed, show winner modal after reveals finish
  useEffect(() => {
    const total = rows * cols;
    const removedCount = tilesRemoved.filter(Boolean).length;
    if (removedCount > 0 && removedCount === total) {
      // delay winner modal until center reveal clears (max 3s). show after 3.1s
      if (winnerTimerRef.current) {
        window.clearTimeout(winnerTimerRef.current);
      }
      winnerTimerRef.current = window.setTimeout(() => {
        const winner = teams.reduce((best, t) => (t.score > best.score ? t : best), teams[0]);
        setWinnerTeam(winner);
        setWinnerModalOpen(true);
        playWinner();
      }, 3100);
    }
    return () => {
      if (winnerTimerRef.current) {
        window.clearTimeout(winnerTimerRef.current);
        winnerTimerRef.current = null;
      }
    };
  }, [tilesRemoved, rows, cols, teams]);

  // helper label
  function labelForIndex(index: number) {
    const r = Math.floor(index / cols);
    const c = index % cols;
    const rowChar = String.fromCharCode(65 + r);
    return `${rowChar}${c + 1}`;
  }

  // Utility: pick a random card from the tray (returns the card)
  function pickRandomCardFromTray() {
    const tray = gameTrayRef.current ?? [];
    if (!tray || tray.length === 0) return null;
    return tray[Math.floor(Math.random() * tray.length)];
  }

  function handleTileClick(index: number, source: "manual" | "auto" = "manual") {
    if (tilesRemoved[index]) return;
    if (selectionMode !== "manual" && source === "manual") return;
    trackGameStart("kaboom");
    const card = pickRandomCardFromTray();
    if (!card) {
      alert("No cards in lesson tray — add cards first.");
      return;
    }

    // set modal contents depending on flashcardMode
    if (flashcardMode === "text") {
      if (!card.word) {
        alert("No text available for selected card.");
        return;
      }
      setModalText(card.word);
      setModalImage(null);
    } else if (flashcardMode === "image") {
      if (!card.image) {
        alert("No images in lesson tray — add image cards first.");
        return;
      }
      setModalImage(card.image);
      setModalText(null);
    } else {
      // image+text: prefer image if available, but still show text
      setModalImage(card.image ?? null);
      setModalText(card.word ?? null);
    }

    setModalTileIndex(index);
    setModalOpen(true);
    playHighlight();
  }

  // no-tray UI flag
  const noTray = !gameTray || gameTray.length === 0;
  const boardTiles = Array.from({ length: rows * cols }, (_, index) => {
    const removed = tilesRemoved[index];
    const points = tilesPoints[index];
    const isBomb = tilesBomb[index];
    const isGlowing = glowingIndex === index && !removed;
    const wasSpecial = specialRemoveActive && !removed && !isGlowing;
    const baseColor = removed ? "#e5e7eb" : "#dff7e6";
    const accentColor = removed && isBomb ? "#fee2e2" : removed && points !== null ? "#dcfce7" : baseColor;
    return {
      index,
      label: labelForIndex(index),
      removed,
      points,
      isBomb,
      isGlowing,
      wasSpecial,
      accentColor,
    };
  });

  if (noTray) {
    return (
      <div className={`min-h-screen ${isFullscreen ? "bg-[hsl(140,40%,95%)] text-black" : "bg-[var(--color-bg-main)] text-[var(--color-text-main)]"}`} ref={containerRef}>
        <GameHeader
          title="KaBoom!"
        onExit={() => router.push("/games")}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        trackGameKey="kaboom"
      />

        <main className="pt-[72px] max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl p-6 shadow">
            <h2 className="text-lg font-semibold mb-2">No cards selected</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">Add cards from Flashcards or choose a saved set in Dashboard then open Games → KaBoom!.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => router.push("/flashcards")} className="btn btn-primary px-3 py-1 text-sm">Go to Flashcards</button>
              <button onClick={() => router.push("/dashboard")} className="btn btn-secondary px-3 py-1 text-sm">Return to Dashboard</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Are any tiles remaining? (for internal usage)
  const tilesRemaining = tilesRemoved.some((t) => !t);

  return (
    <div ref={containerRef} className={`min-h-screen ${isFullscreen ? "bg-[hsl(140,40%,95%)] text-black" : "bg-[var(--color-bg-main)] text-[var(--color-text-main)]"}`}>
      <GameHeader
        title="KaBoom!"
        onExit={() => {
          try {
            const toWrite = gameTrayRef.current;
            if (Array.isArray(toWrite) && toWrite.length > 0) {
              localStorage.setItem(LESSON_TRAY_KEY, JSON.stringify(toWrite));
            }
          } catch {}
          router.push("/games");
        }}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        trackGameKey="kaboom"
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((s) => !s)}
      />

      {settingsOpen && (
        <div className="fixed top-[72px] right-4 z-[70]">
          <GameSettingsDropdown className="w-[340px]">
            <div className="mb-4">
              <div className="mb-2 font-semibold">Teams</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={addTeam} disabled={teams.length >= 6} className="btn btn-secondary px-3 py-2 text-sm disabled:opacity-50">
                  Add team
                </button>
                <button onClick={removeLastTeam} disabled={teams.length <= 2} className="btn btn-secondary px-3 py-2 text-sm disabled:opacity-50">
                  Remove team
                </button>
                <button onClick={() => setTeams((s) => s.map((t) => ({ ...t, score: 0 })))} className="btn btn-secondary px-3 py-2 text-sm">
                  Reset scores
                </button>
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 font-semibold">Grid size</div>
              <div className="grid grid-cols-3 gap-2">
                {[4, 5, 6].map((n) => (
                  <button
                    key={n}
                    onClick={() => setGridCount(n)}
                    className={`px-2 py-2 text-xs rounded-lg border transition-transform hover:-translate-y-0.5 ${
                      gridCount === n ? "bg-[var(--color-accent)] text-white border-transparent" : "bg-white text-black border-black/10"
                    }`}
                    title={`${n}x${n}`}
                  >
                    {n}x{n}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 font-semibold">Kaboom probability</div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={kaboomProbability}
                onChange={(e) => setKaboomProbability(parseFloat(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-[var(--color-text-muted)] mt-1">Current: {(kaboomProbability * 100).toFixed(0)}%</div>
            </div>

            <div className="mb-4">
              <div className="mb-2 font-semibold">Flashcard display</div>
              <div className="flex flex-col gap-1">
                <label className="text-sm"><input type="radio" name="fc" checked={flashcardMode === "image+text"} onChange={() => setFlashcardMode("image+text")} /> Image + Text</label>
                <label className="text-sm"><input type="radio" name="fc" checked={flashcardMode === "image"} onChange={() => setFlashcardMode("image")} /> Image only</label>
                <label className="text-sm"><input type="radio" name="fc" checked={flashcardMode === "text"} onChange={() => setFlashcardMode("text")} /> Text only</label>
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 font-semibold">Tile selection</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectionMode("random")}
                  className={`btn px-3 py-2 text-sm ${
                    selectionMode === "random"
                      ? "bg-[var(--color-accent)] text-white border-transparent"
                      : "btn-secondary"
                  }`}
                >
                  Random
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMode("manual")}
                  className={`btn px-3 py-2 text-sm ${
                    selectionMode === "manual"
                      ? "bg-[var(--color-accent)] text-white border-transparent"
                      : "btn-secondary"
                  }`}
                >
                  Manual
                </button>
              </div>
              <div className="text-xs text-[var(--color-text-muted)] mt-2">
                Random picks a tile for the active team. Manual lets the teacher choose a tile directly.
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 font-semibold">Music</div>
              <button onClick={toggleThemeMusic} className={`btn btn-secondary w-full px-3 py-2 text-sm ${musicOn ? "ring-2 ring-yellow-300" : ""}`}>
                {musicOn ? "Music: On" : "Music: Off"}
              </button>
              <div className="mt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={(e) => handleMusicFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-[var(--color-text-muted)]"
                />
              </div>
            </div>

            <div className="text-right">
              <button onClick={() => setSettingsOpen(false)} className="btn btn-secondary px-3 py-1 text-sm">
                Close
              </button>
            </div>
          </GameSettingsDropdown>
        </div>
      )}

      {/* Scoreboard + controls */}
      <div ref={controlsRef} className="">
        <div className={isFullscreen ? "game-mobile-chrome pt-[28px] max-w-7xl mx-auto px-4" : "game-mobile-chrome pt-[36px] max-w-7xl mx-auto px-4"}>
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Scoreboard</h2>
              <div className="text-sm text-[var(--color-text-muted)]">Teams</div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white text-sm shadow-sm">
                <div className="text-xs text-[var(--color-text-muted)]">Active</div>
                <div className="font-semibold">{teams[activeTeamIndex]?.name}</div>
                <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse ml-1" />
              </div>
              {!tilesRemaining && (
                <button onClick={resetGame} title="Reset game" className="btn btn-secondary px-3 py-1.5 text-sm">
                  Reset Game
                </button>
              )}
            </div>
          </div>

          {/* Team boxes */}
          <div className="mb-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {teams.map((team, idx) => {
              const isActive = idx === activeTeamIndex;
              return (
                <div
                  key={team.id}
                  className={`min-h-[58px] px-3 py-2 rounded-2xl border flex items-center justify-between gap-3 transition-transform ${
                    isActive ? "scale-[1.02] ring-2 ring-[var(--color-accent)]" : ""
                  }`}
                  style={{
                    background: isActive ? "#111827" : "#f7f7f3",
                    color: isActive ? "white" : "#111827",
                    boxShadow: isActive ? "0 12px 30px rgba(2,6,23,0.12)" : "0 6px 12px rgba(2,6,23,0.06)",
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-tight">{team.name}</div>
                    {isActive && <div className="text-[11px] opacity-70 mt-0.5">Active team</div>}
                  </div>

                  <div className={`${isActive ? "text-3xl md:text-4xl font-extrabold active-score" : "text-2xl font-bold"} w-14 text-center tabular-nums`}>
                    {team.score}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main grid */}
      <main data-game-stage className="max-w-7xl mx-auto px-4 pb-2">
        <div className="flex justify-center items-start">
          <div
            className={`game-mobile-aspect-stage w-full ${isFullscreen ? "max-w-[1600px]" : "max-w-6xl"} rounded-3xl shadow-2xl overflow-hidden border bg-white`}
            style={{ aspectRatio: "16 / 9", marginTop: isFullscreen ? "0px" : undefined }}
          >
            <div className="relative w-full h-full bg-[#f3f4f6]">
              {!tilesRemaining && !specialRemoveActive && !centerReveal ? null : (
                !specialRemoveActive && !centerReveal && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                    {selectionMode === "random" && (
                      <button
                        onClick={() => startRandomHighlightSequence(true)}
                        disabled={!tilesRemaining || specialRemoveActive || !!centerReveal}
                        className="pointer-events-auto w-48 h-48 rounded-full bg-[linear-gradient(180deg,#60a5fa,#2563eb)] text-white shadow-2xl border-[10px] border-white/85 flex items-center justify-center text-center px-6 hover:scale-105 hover:shadow-[0_18px_50px_rgba(37,99,235,0.35)] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Randomly pick a tile for the active team"
                      >
                        <span className="text-3xl font-extrabold leading-tight">Random Select</span>
                      </button>
                    )}
                  </div>
                )
              )}

              <div className="absolute inset-0 p-4 md:p-5">
                <div className="relative w-full h-full rounded-[28px] border border-slate-200 bg-white shadow-inner overflow-hidden">
                  <div
                    className="grid h-full w-full gap-2 p-2 md:p-3"
                    style={{
                      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                      gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                    }}
                  >
                    {boardTiles.map((tile) => {
                      const isActiveTile = !tile.removed && tile.isGlowing;
                      const isHoveredTile = !tile.removed && hoveredTileIndex === tile.index;
                      const showReveal = tile.removed && (tile.points !== null || tile.isBomb);
                      return (
                        <button
                          key={tile.index}
                          type="button"
                          onClick={() => {
                            if (!tile.removed && !specialRemoveActive && !centerReveal) {
                              handleTileClick(tile.index, "manual");
                            }
                          }}
                          onMouseEnter={() => setHoveredTileIndex(tile.index)}
                          onMouseMove={() => setHoveredTileIndex(tile.index)}
                          onMouseLeave={() => setHoveredTileIndex((current) => (current === tile.index ? null : current))}
                          disabled={tile.removed || specialRemoveActive || !!centerReveal}
                          className={`relative min-w-0 min-h-0 rounded-2xl border-2 transition-all duration-300 overflow-hidden text-left ${
                            isActiveTile
                              ? "scale-[1.04] border-yellow-300 shadow-[0_0_0_6px_rgba(250,204,21,0.28)]"
                              : isHoveredTile && selectionMode === "manual"
                                ? "scale-[1.03] border-sky-300 shadow-[0_0_0_6px_rgba(56,189,248,0.22)]"
                              : tile.removed
                                ? "border-slate-200"
                                : "border-[#9bd3ab] shadow-sm hover:shadow-md"
                          } ${tile.wasSpecial ? "brightness-95" : ""}`}
                          style={{
                            backgroundColor: tile.removed
                              ? tile.isBomb
                                ? "#fee2e2"
                                : tile.points !== null
                                  ? "#dcfce7"
                                  : "#edf2f7"
                              : tile.accentColor,
                            transform:
                              isHoveredTile && selectionMode === "manual"
                                ? "translateY(-2px)"
                                : undefined,
                          }}
                        >
                          <div className={`absolute inset-0 transition-opacity duration-300 ${isActiveTile || (isHoveredTile && selectionMode === "manual") ? "opacity-100" : "opacity-0"}`}>
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.32),transparent_60%)]" />
                            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.24),transparent_34%,rgba(255,255,255,0.06)_64%,transparent)] animate-pulse" />
                            {isHoveredTile && selectionMode === "manual" && (
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.28),transparent_58%)] animate-ping" />
                            )}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            {!tile.removed && (
                              <div className="text-center px-3">
                                <div className={`text-xl md:text-2xl font-extrabold text-[#1f2937] tracking-tight transition-transform duration-200 ${isHoveredTile && selectionMode === "manual" ? "scale-110" : ""}`}>{tile.label}</div>
                              </div>
                            )}
                            {showReveal && tile.isBomb && (
                              <div className="text-5xl md:text-6xl font-extrabold text-red-700">💣</div>
                            )}
                            {showReveal && tile.points !== null && (
                              <div className="text-4xl md:text-5xl font-extrabold text-emerald-600">+{tile.points}</div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {centerReveal && (
                    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                      <div
                        className={`rounded-full border-[10px] shadow-2xl flex flex-col items-center justify-center text-center ${
                          centerReveal.kind === "bomb"
                            ? "w-64 h-64 md:w-72 md:h-72 bg-[linear-gradient(180deg,#fb923c,#ef4444)] border-white text-white"
                            : "w-64 h-64 md:w-72 md:h-72 bg-white border-[var(--color-accent)] text-[var(--color-accent)]"
                        }`}
                      >
                        {centerReveal.kind === "bomb" ? (
                          <>
                            <div className="text-5xl md:text-6xl font-extrabold">BOOM!</div>
                            <div className="mt-2 text-sm md:text-base font-semibold">-5 points</div>
                          </>
                        ) : (
                          <>
                            <div className="text-[10px] uppercase tracking-[0.35em] text-[var(--color-text-muted)] mb-2">Points</div>
                            <div className="text-7xl md:text-8xl font-extrabold tabular-nums leading-none">+{centerReveal.value ?? 0}</div>
                            <div className="mt-2 text-sm md:text-base font-semibold text-[var(--color-text-muted)]">Great job!</div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      {modalOpen && (modalImage || modalText) && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-[2rem] px-6 py-7 sm:px-8 sm:py-8 w-[min(92vw,64rem)] max-h-[90vh] min-h-[36rem] overflow-hidden flex flex-col items-center justify-center gap-8 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
            <div className="w-full min-h-0 flex-1 flex flex-col items-center justify-center gap-6 overflow-hidden pb-2">
              {modalImage && (
                <img
                  src={modalImage}
                  alt={modalText ?? ""}
                  className="max-h-[56vh] max-w-[82vw] object-contain rounded-2xl"
                />
              )}
              {modalText && (
                <div className="max-w-[90%] text-5xl md:text-6xl font-extrabold text-center leading-none tracking-tight">
                  {modalText}
                </div>
              )}
            </div>

            <div className="flex gap-5 shrink-0 pb-1">
              <button onClick={handleModalIncorrect} className="px-6 py-3 rounded-full bg-white border border-red-200 text-red-600 text-lg font-semibold shadow-sm hover:-translate-y-0.5 transition-transform">
                ❌
              </button>
              <button onClick={handleModalCorrect} className="px-6 py-3 rounded-full bg-green-400 text-green-900 text-lg font-semibold shadow-sm hover:-translate-y-0.5 transition-transform">
                ⭕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Winner modal */}
      {winnerModalOpen && winnerTeam && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
            <h2 className="text-3xl font-extrabold mb-2">🎉 Winner!</h2>
            <p className="text-xl mb-4">{winnerTeam.name} wins with {winnerTeam.score} points</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => {
                setWinnerModalOpen(false);
                router.push("/games");
              }} className="px-4 py-2 rounded-md bg-[var(--color-primary)] text-white">Back to Games</button>
              <button onClick={() => setWinnerModalOpen(false)} className="px-4 py-2 rounded-md bg-white border">Close</button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        /* active score pulse */
        @keyframes active-pulse {
          0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(37,99,235,0)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 8px 24px rgba(37,99,235,0.18)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(37,99,235,0)); }
        }
        .active-score { animation: active-pulse 1200ms ease-in-out infinite; }

        @media (max-width: 640px) {
          .countdown-big { min-width: 48px; font-size: 16px; padding: 8px 10px; }
        }
      `}</style>
    </div>
  );
}
