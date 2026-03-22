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

const LESSON_TRAY_KEY = "classendo-lesson-tray";
const KABOOM_GRID_KEY = "kaboom-grid-count";

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
        if ([4, 6, 8].includes(n)) return n;
      }
    } catch {}
    return 6;
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
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
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

  // flashcard display mode
  const [flashcardMode, setFlashcardMode] = useState<"image+text" | "image" | "text">("image+text");

  // settings dropdown (we'll hide grid/music inside settings per user's instruction)
  const [settingsOpen, setSettingsOpen] = useState(false);

  // spotlight sequence (teacher-started) that can optionally auto-select at end
  const [specialRemoveActive, setSpecialRemoveActive] = useState(false);
  const [glowingIndex, setGlowingIndex] = useState<number | null>(null);
  const sequenceRef = useRef<{ intervalId?: number; timeoutId?: number } | null>(null);
  const lastGlowingRef = useRef<number | null>(null);

  function startRandomHighlightSequence(autoSelect = false) {
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

    const remaining = tilesRemovedRef.current
      .map((r, idx) => (!r ? idx : -1))
      .filter((v) => v !== -1) as number[];
    if (remaining.length === 0) return;

    setSpecialRemoveActive(true);
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
      playHighlight();
    }, 400);

    // after 5s stop. If autoSelect is true select the last glowing tile for the active team.
    sequenceRef.current.timeoutId = window.setTimeout(() => {
      if (sequenceRef.current?.intervalId) {
        clearInterval(sequenceRef.current.intervalId);
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

      // clear visual sequence state
      setSpecialRemoveActive(false);
      setGlowingIndex(null);
      lastGlowingRef.current = null;
      sequenceRef.current = null;

      if (autoSelect && finalPick !== null) {
        // automatically open modal for the chosen tile for the active team
        // small delay to ensure UI updates (not strictly necessary)
        setTimeout(() => {
          handleTileClick(finalPick!);
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

    // keep center reveal visible for 3 seconds
    setTimeout(() => {
      setCenterReveal(null);
    }, 3000);
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
        ? parsed.map((c: any) => ({
            id: String(c.id ?? c.word ?? Math.random().toString(36).slice(2)),
            word: String(c.word ?? c.text ?? ""),
            image: c.image ?? c.image_id ?? c.img ?? null,
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

  // Keep a computed game area height so the grid always has enough room to render all rows.
  const [gameAreaHeight, setGameAreaHeight] = useState<number | null>(null);

  useEffect(() => {
    function update() {
      const vh = window.innerHeight;

      // Measure the controls area if present (works both in normal and fullscreen mode).
      const controlsRect = controlsRef.current?.getBoundingClientRect();
      if (controlsRect) {
        // controlsRect.bottom is the pixel coordinate where the controls end.
        // Leave a small bottom margin so the grid doesn't touch the viewport edge.
        const topOffset = Math.max(8, Math.floor(controlsRect.bottom));
        const available = Math.max(320, Math.floor(vh - topOffset - 16)); // 16px bottom margin
        setGameAreaHeight(available);
        return;
      }

      // If controls aren't available yet, fallback depending on fullscreen or not.
      if (isFullscreen) {
        // In fullscreen, leave a small top margin so exit button and controls have room.
        setGameAreaHeight(Math.max(320, Math.floor(vh - 48)));
        return;
      }

      // Non-fullscreen fallback: use header height + estimated control area
      const header = document.querySelector("header");
      const headerH = header ? Math.floor(header.getBoundingClientRect().height) : 72;
      const fallback = Math.max(320, Math.floor(vh - headerH - 160));
      setGameAreaHeight(fallback);
    }

    update();
    window.addEventListener("resize", update);
    // also recalc when tray length or grid changes (rows/cols) to ensure fit
    return () => {
      window.removeEventListener("resize", update);
    };
  }, [isFullscreen, rows, cols, gameTray.length]);

  // NEW: measure controls height to shift the grid down in fullscreen so it doesn't overlap.
  const [controlsHeight, setControlsHeight] = useState(0);
  useEffect(() => {
    function measureControls() {
      const rect = controlsRef.current?.getBoundingClientRect();
      const h = rect ? Math.ceil(rect.height) : 0;
      // add a small buffer so elements don't touch
      setControlsHeight(h + 12);
    }
    // measure initially and on resize
    measureControls();
    window.addEventListener("resize", measureControls);
    return () => window.removeEventListener("resize", measureControls);
  }, [isFullscreen, gameTray.length, rows, cols]);

  // adjust the computed top space slightly upward so the grid moves up a bit (reducing the gap)
  const adjustedControlsTop = Math.max(8, controlsHeight - 8); // move grid up by 8px while keeping a minimum gap

  // Utility: pick a random card from the tray (returns the card)
  function pickRandomCardFromTray() {
    const tray = gameTrayRef.current ?? [];
    if (!tray || tray.length === 0) return null;
    return tray[Math.floor(Math.random() * tray.length)];
  }

  function handleTileClick(index: number) {
    if (tilesRemoved[index]) return;
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

  if (noTray) {
    return (
      <div className={`min-h-screen ${isFullscreen ? "bg-[hsl(140,40%,95%)] text-black" : "bg-[var(--color-bg-main)] text-[var(--color-text-main)]"}`} ref={containerRef}>
        <header className={`fixed top-0 left-0 right-0 z-50 bg-[var(--color-bg-main)]/95 backdrop-blur-md border-b border-black/5 ${isFullscreen ? "hidden" : ""}`}>
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <a href="/" className="text-3xl font-extrabold text-blue-700">Classendo</a>
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <h1 className="text-2xl font-bold text-black">KaBoom!</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFullscreen}
                className="btn btn-secondary p-2"
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
              {/* Header music toggles built-in 8-bit theme */}
              <button
                onClick={toggleThemeMusic}
                className={`btn btn-secondary px-2 py-1 text-sm ${musicOn ? "ring-2 ring-yellow-300" : ""}`}
              >
                Music
              </button>
              {!isFullscreen && (
                <button onClick={() => router.push("/games")} className="btn btn-secondary px-3 py-1 text-sm flex items-center gap-2">
                  <Play size={14} /> Exit
                </button>
              )}
            </div>
          </div>
        </header>

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
      {/* Header */}
      <header className={`fixed top-0 left-0 right-0 z-50 bg-[var(--color-bg-main)]/95 backdrop-blur-md border-b border-black/5 ${isFullscreen ? "hidden" : ""}`}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="text-3xl font-extrabold text-blue-700">Classendo</a>

          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-2xl font-bold text-black">KaBoom!</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="btn btn-secondary p-2"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>

            {/* Header music toggles built-in 8-bit theme */}
            <button
              onClick={toggleThemeMusic}
              className={`btn btn-secondary px-2 py-1 text-sm ${musicOn ? "ring-2 ring-yellow-300" : ""}`}
            >
              Music
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
              }} className="btn btn-secondary px-3 py-1 text-sm flex items-center gap-2">
                <Play size={14} /> Exit
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Fullscreen exit button (visible only in fullscreen) */}
      {isFullscreen && (
        <button
          onClick={exitFullscreen}
          className="btn btn-secondary fixed top-4 right-4 z-[9999] px-3 py-2 shadow-lg"
          title="Exit fullscreen"
        >
          Exit
        </button>
      )}

      {/* Scoreboard + controls */}
      <div ref={controlsRef} className={isFullscreen ? "fixed top-4 left-0 right-0 z-50" : ""}>
        <div className={isFullscreen ? "max-w-7xl mx-auto px-4" : "pt-[68px] max-w-7xl mx-auto px-4"}>
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Scoreboard</h2>
              <div className="text-sm text-[var(--color-text-muted)]">Teams</div>

              <div className="flex items-center gap-1 ml-2">
                <button onClick={addTeam} disabled={teams.length >= 6} title="Add team" className="btn btn-secondary p-1.5 text-sm disabled:opacity-50">+</button>
                <button onClick={removeLastTeam} disabled={teams.length <= 2} title="Remove last team" className="btn btn-secondary p-1.5 text-sm disabled:opacity-50">−</button>
                <button onClick={() => setTeams((s) => s.map((t) => ({ ...t, score: 0 })))} title="Reset scores" className="btn btn-secondary p-1.5 text-sm">⟲</button>
                {!tilesRemaining && (
                  <button onClick={resetGame} title="Reset game" className="btn btn-secondary p-1.5 text-sm ml-1">Reset Game</button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-2 py-1 rounded-md border bg-white text-sm">
                <div className="text-xs text-[var(--color-text-muted)]">Active</div>
                <div className="font-semibold">{teams[activeTeamIndex]?.name}</div>
                <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse ml-2" />
              </div>

              {/* Grid selector (kept visible here for quick access) */}
              <div className="flex items-center gap-2 px-2 py-1 rounded-md border bg-white text-sm">
                <div className="text-xs text-[var(--color-text-muted)]">Grid</div>
                {[4, 6, 8].map((n) => (
                  <button
                    key={n}
                    onClick={() => setGridCount(n)}
                    className={`px-2 py-0.5 text-xs rounded ${gridCount === n ? "bg-[var(--color-accent)] text-white" : "bg-transparent text-black"}`}
                    title={`${n}x${n}`}
                  >
                    {n}x{n}
                  </button>
                ))}
              </div>

              {/* Settings dropdown - hidden when fullscreen per user request */}
              {!isFullscreen && (
                <div className="relative">
                    <button
                      onClick={() => setSettingsOpen((s) => !s)}
                      className="btn btn-secondary ml-3 px-3 py-1 text-sm"
                      title="Settings"
                    >
                      Settings
                    </button>

                  {settingsOpen && (
                    <div className="absolute right-0 mt-2 w-64 bg-white border rounded-md shadow-lg p-3 z-60 text-sm">
                      {/* Grid size and Music removed from settings as requested */}
                      <div className="mb-2 font-semibold">Kaboom probability</div>
                      <div className="mb-3">
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

                      <div className="mb-2 font-semibold">Flashcard display</div>
                      <div className="flex flex-col gap-1">
                        <label className="text-sm"><input type="radio" name="fc" checked={flashcardMode === "image+text"} onChange={() => setFlashcardMode("image+text")} /> Image + Text</label>
                        <label className="text-sm"><input type="radio" name="fc" checked={flashcardMode === "image"} onChange={() => setFlashcardMode("image")} /> Image only</label>
                        <label className="text-sm"><input type="radio" name="fc" checked={flashcardMode === "text"} onChange={() => setFlashcardMode("text")} /> Text only</label>
                      </div>

                      <div className="mt-3 text-right">
                        <button onClick={() => setSettingsOpen(false)} className="btn btn-secondary px-3 py-1 text-sm">Close</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Team boxes */}
          <div className="mb-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {teams.map((team, idx) => {
              const isActive = idx === activeTeamIndex;
              return (
                <div key={team.id} className={`p-2 rounded-md border flex items-center justify-between transition-transform ${isActive ? "scale-105 ring-2 ring-[var(--color-accent)]" : ""}`}>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">{team.name}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`${isActive ? "text-3xl md:text-4xl font-extrabold active-score" : "text-xl font-bold"} w-16 text-center`}>
                      {team.score}
                    </div>
                    <button onClick={() => adjustScore(team.id, -1)} className="btn btn-secondary px-2 py-1 text-sm">−</button>
                    <button onClick={() => adjustScore(team.id, +1)} className="btn btn-secondary px-2 py-1 text-sm">+</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* In fullscreen, show Random Select above the grid (inside controls) */}
          {isFullscreen && (
            <div className="mt-2 flex justify-center">
              <button
                onClick={() => startRandomHighlightSequence(true)}
                disabled={!tilesRemaining || specialRemoveActive}
                className={`btn btn-primary inline-flex items-center gap-2 md:gap-3 text-center px-3 py-2 text-sm font-semibold shadow-md transition ${
                  !tilesRemaining || specialRemoveActive ? "opacity-60 cursor-not-allowed" : "hover:scale-105"
                }`}
                title="Randomly pick a tile for the active team (5s highlight)"
              >
                <span className="hidden md:inline">Random Select</span>
                <span className="md:hidden">Random</span>
                <span className="text-xs opacity-80">• 5s</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* When NOT fullscreen, render Random Select in its original position (above grid) */}
      {!isFullscreen && (
        <div className="max-w-7xl mx-auto px-4 mt-2 mb-3 flex justify-center">
          <button
            onClick={() => startRandomHighlightSequence(true)}
            disabled={!tilesRemaining || specialRemoveActive}
            className={`btn btn-primary inline-flex items-center gap-2 md:gap-3 text-center px-3 py-2 text-sm font-semibold shadow-md transition ${
              !tilesRemaining || specialRemoveActive ? "opacity-60 cursor-not-allowed" : "hover:scale-105"
            }`}
            title="Randomly pick a tile for the active team (5s highlight)"
          >
            <span className="hidden md:inline">Random Select</span>
            <span className="md:hidden">Random</span>
            <span className="text-xs opacity-80">• 5s</span>
          </button>
        </div>
      )}

      {/* Main grid */}
      <main className="max-w-7xl mx-auto px-4 pb-6">
        <div className="flex justify-center items-start">
          <div
            className={`w-full ${isFullscreen ? "max-w-[1600px]" : "max-w-6xl"} rounded-3xl shadow-2xl overflow-hidden border bg-white`}
            style={
              gameAreaHeight
                ? { height: `${gameAreaHeight}px`, marginTop: isFullscreen ? `${adjustedControlsTop}px` : undefined }
                : { minHeight: "420px", marginTop: isFullscreen ? `${adjustedControlsTop}px` : undefined }
            }
          >
            <div className="relative w-full h-full bg-gray-100">
              {/* Use CSS Grid to ensure all rows and columns fit inside the panel. */}
              <div
                className="w-full h-full"
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gridTemplateRows: `repeat(${rows}, 1fr)`,
                  gap: `${isFullscreen ? 4 : 6}px`,
                  padding: `${isFullscreen ? 4 : 6}px`,
                  boxSizing: "border-box",
                }}
              >
                {Array.from({ length: rows * cols }).map((_, idx) => {
                  const r = Math.floor(idx / cols);
                  const c = idx % cols;
                  const removed = tilesRemoved[idx];
                  const isGlowing = glowingIndex === idx && !removed;
                  const isBomb = tilesBomb[idx];
                  const pts = tilesPoints[idx];
                  const label = `${String.fromCharCode(65 + r)}${c + 1}`;

                  return (
                    <div key={idx} style={{ width: "100%", height: "100%", boxSizing: "border-box" }}>
                      <div
                        onClick={() => (!removed ? handleTileClick(idx) : undefined)}
                        role="button"
                        tabIndex={removed ? -1 : 0}
                        aria-disabled={removed}
                        className="w-full h-full rounded-md flex items-center justify-center text-sm font-semibold select-none cursor-pointer relative overflow-hidden transition-all"
                        style={{
                          width: "100%",
                          height: "100%",
                          background: removed ? "transparent" : "#dff7e6",
                          border: "1px solid rgba(0,0,0,0.06)",
                          boxShadow: isGlowing
                            ? "0 0 60px 26px rgba(255,215,0,0.95) inset"
                            : "inset 0 0 0 1px rgba(0,0,0,0.06)",
                          transform: isGlowing ? "scale(1.05)" : "scale(1)",
                          filter: (!isGlowing && specialRemoveActive) && !removed ? "brightness(0.85)" : undefined,
                          opacity: removed ? 0 : 1,
                          transition: "transform 220ms ease, opacity 360ms ease, box-shadow 220ms ease, filter 220ms ease",
                        }}
                      >
                        {!removed && (
                          <div className="absolute top-2 left-3 text-xs text-[rgba(0,0,0,0.6)]">{label}</div>
                        )}

                        {removed && pts !== null && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-4xl font-extrabold text-green-600 animate-pulse-slow">+{pts}</div>
                          </div>
                        )}

                        {removed && isBomb && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-4xl font-extrabold text-red-700">💣</div>
                          </div>
                        )}

                        {!removed && <div className="text-lg tracking-wide">{label}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* center reveal overlay (bigger, lasts 3s) */}
              {centerReveal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                  {centerReveal.kind === "points" && (
                    <div className="bg-white/0 flex flex-col items-center">
                      <div className="text-6xl md:text-8xl font-extrabold text-green-600 animate-scale-up">{`+${centerReveal.value}`}</div>
                      <div className="mt-4 text-2xl md:text-3xl font-semibold">Great job!</div>
                    </div>
                  )}
                  {centerReveal.kind === "bomb" && (
                    <div className="bg-white/0 flex flex-col items-center">
                      <div className="text-6xl md:text-8xl font-extrabold text-red-700 animate-kaboom">KABOOM!</div>
                      <div className="mt-4 text-2xl md:text-3xl font-semibold">−5 points</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      {modalOpen && (modalImage || modalText) && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-4 max-w-lg w-full max-h-[80vh] overflow-auto flex flex-col items-center">
            <div className="w-full flex-1 flex flex-col items-center justify-center gap-3">
              {modalImage && (
                <img src={modalImage} alt={modalText ?? ""} className="max-h-[60vh] max-w-full object-contain" />
              )}
              {modalText && (
                <div className="text-lg font-semibold text-center">{modalText}</div>
              )}
            </div>

            <div className="mt-4 flex gap-4">
              <button onClick={handleModalIncorrect} className="px-4 py-2 rounded-md bg-white border border-red-200 text-red-600">❌</button>
              <button onClick={handleModalCorrect} className="px-4 py-2 rounded-md bg-green-400 text-green-900">⭕</button>
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
        :root { --kaboom-green: #dff7e6; }

        @keyframes scale-up {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-scale-up { animation: scale-up 700ms cubic-bezier(.2,.9,.3,1) both; }

        @keyframes kaboom {
          0% { transform: scale(0.6); opacity: 0; }
          40% { transform: scale(1.12); opacity: 1; color: #ff3b30; }
          100% { transform: scale(1); opacity: 1; color: #ff1a1a; }
        }
        .animate-kaboom { animation: kaboom 900ms cubic-bezier(.2,.9,.3,1) both; }

        @keyframes pulse-slow {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.06); opacity: 0.95; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pulse-slow { animation: pulse-slow 1500ms ease-in-out infinite; }

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
