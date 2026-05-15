"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GameHeader from "@/components/games/GameHeader";
import { GameSettingsDropdown } from "@/components/games/GameSettingsSurface";
import PhaserGameHost from "@/components/games/phaser/PhaserGameHost";
import { trackGameStart } from "@/lib/games/track-game-start";
import {
  createImageRevealGame,
  type ImageRevealApi,
} from "@/lib/games/phaser/image-reveal";

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

function shuffleArray<T>(arr: T[]) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/* ----------------------
   Component: Card Reveal (persistence fix)
   ---------------------- */
export default function CardRevealPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneApiRef = useRef<ImageRevealApi | null>(null);

  // Fullscreen handling
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
        const shuffled = shuffleArray(normalized);
        setGameTray(shuffled);
        gameTrayRef.current = shuffled;
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
  const TOTAL_TILES = 24;

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
    setShowPointsPrompt(false);
    setShowPointsSpinner(false);
    setAwardedPoints(null);
    if (pointsSpinIntervalRef.current) {
      clearInterval(pointsSpinIntervalRef.current);
      pointsSpinIntervalRef.current = null;
    }
    if (pointsSpinTimeoutRef.current) {
      clearTimeout(pointsSpinTimeoutRef.current);
      pointsSpinTimeoutRef.current = null;
    }
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
  const [showPointsPrompt, setShowPointsPrompt] = useState(false);
  const [showPointsSpinner, setShowPointsSpinner] = useState(false);
  const [pointsMode, setPointsMode] = useState<"gain" | "loss" | null>(null);
  const [spinningPoints, setSpinningPoints] = useState(1);
  const [awardedPoints, setAwardedPoints] = useState<number | null>(null);
  const pointsSpinIntervalRef = useRef<number | null>(null);
  const pointsSpinTimeoutRef = useRef<number | null>(null);
  const pointsAwardTimeoutRef = useRef<number | null>(null);

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

  function clearPointsSpinnerTimers() {
    if (pointsSpinIntervalRef.current) {
      clearInterval(pointsSpinIntervalRef.current);
      pointsSpinIntervalRef.current = null;
    }
    if (pointsSpinTimeoutRef.current) {
      clearTimeout(pointsSpinTimeoutRef.current);
      pointsSpinTimeoutRef.current = null;
    }
    if (pointsAwardTimeoutRef.current) {
      clearTimeout(pointsAwardTimeoutRef.current);
      pointsAwardTimeoutRef.current = null;
    }
  }

  // Music for Card Reveal (different theme than KaBoom)
  const [musicOn, setMusicOn] = useState(false);
  const musicIntervalRef = useRef<number | null>(null);
  const musicStepRef = useRef(0);
  const musicGainRef = useRef(0.035);

  function startRevealMusic() {
    if (musicIntervalRef.current) return;
    const melody = [523, 587, 659, 784, 659, 587]; // simple upbeat loop (C5..)
    musicStepRef.current = 0;
    musicIntervalRef.current = window.setInterval(() => {
      const f = melody[musicStepRef.current % melody.length];
      playTone(f, 0.22, "sawtooth", musicGainRef.current);
      musicStepRef.current++;
    }, 300);
  }
  function stopRevealMusic() {
    if (musicIntervalRef.current) {
      clearInterval(musicIntervalRef.current);
      musicIntervalRef.current = null;
    }
  }
  function toggleRevealMusic() {
    // user gesture required; create context if needed
    getAudioCtx();
    setMusicOn((on) => {
      const willOn = !on;
      if (willOn) startRevealMusic();
      else stopRevealMusic();
      return willOn;
    });
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
    if (isAwaitingDecision || showPointsPrompt || showPointsSpinner) return;
    trackGameStart("image-reveal");
    removeRandomTile();
    setIsAwaitingDecision(true);
    setTimerSeconds(turnTimerSeconds);
  }

  // When correct, remove all tiles to reveal image fully and stop any active sequence
  function handleCorrect() {
    if (showPointsPrompt || showPointsSpinner) return;
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
    setSpecialRemoveActive(false);
    // reveal the full image, then let the teacher choose points
    setTilesRemoved((prev) => prev.map(() => true));
    setImageRevealed(true);
    setShowPointsPrompt(true);
    setShowPointsSpinner(false);
    setPointsMode(null);
    setAwardedPoints(null);
    // play final reveal tone
    playFinalTone();
    clearTimer();
    setIsAwaitingDecision(false);
  }

  function startPointsSpinner(mode: "gain" | "loss") {
    if (!showPointsPrompt || showPointsSpinner) return;
    const scoringTeamIndex = activeTeamIndex;
    setPointsMode(mode);
    setShowPointsPrompt(false);
    setShowPointsSpinner(true);
    setAwardedPoints(null);
    clearPointsSpinnerTimers();

    pointsSpinIntervalRef.current = window.setInterval(() => {
      setSpinningPoints(1 + Math.floor(Math.random() * 10));
    }, 90);

    pointsSpinTimeoutRef.current = window.setTimeout(() => {
      clearPointsSpinnerTimers();
      const finalPoints = 1 + Math.floor(Math.random() * 10);
      setSpinningPoints(finalPoints);
      setAwardedPoints(finalPoints);
      pointsAwardTimeoutRef.current = window.setTimeout(() => {
        setTeams((prev) =>
          prev.map((t, idx) =>
            idx === scoringTeamIndex
              ? { ...t, score: t.score + (mode === "loss" ? -finalPoints : finalPoints) }
              : t,
          ),
        );
        playTone(780, 0.16, "triangle", 0.08);

        window.setTimeout(() => {
          const nextIndex = currentIndex + 1;
          setActiveTeamIndex((i) => (i + 1) % teams.length);
          if (nextIndex >= gameTray.length) {
            setShowWinner(true);
          } else {
            setCurrentIndex(nextIndex);
          }
          setShowPointsSpinner(false);
          setPointsMode(null);
          setAwardedPoints(null);
        }, 650);
      }, 1500);
    }, 4000);
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

  // Reset game (restore original tray) — shown when all cards used / winner shown
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
      setCurrentIndex(0);
      setShowWinner(false);
      setTilesRemoved(Array.from({ length: TOTAL_TILES }).map(() => false));
      setImageRevealed(false);
    } catch (e) {
      console.error("Failed to reset game tray:", e);
    }
  }

  // winner computation
  const winner = showWinner ? teams.reduce((best, t) => (t.score > best.score ? t : best), teams[0]) : null;
  const urgent = isAwaitingDecision && timerSeconds !== null && timerSeconds <= 3;
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

  useEffect(() => {
    sceneApiRef.current?.sync({
      imageUrl: currentCard?.image ?? null,
      tilesRemoved,
      glowingIndex,
      specialRemoveActive,
      urgent,
      imageRevealed,
      showRemoveButton: !isAwaitingDecision && !specialRemoveActive && tilesRemoved.filter(Boolean).length < TOTAL_TILES,
      removedCount: tilesRemoved.filter(Boolean).length,
      totalTiles: TOTAL_TILES,
    });
  }, [
    currentCard?.image,
    tilesRemoved,
    glowingIndex,
    specialRemoveActive,
    urgent,
    imageRevealed,
    isAwaitingDecision,
    TOTAL_TILES,
  ]);

  function startRandomRemoveSequence() {
    if (isAwaitingDecision || showPointsPrompt || showPointsSpinner) return;
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
      clearPointsSpinnerTimers();
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
        <GameHeader
          title="Card Reveal"
          onExit={() => router.push("/games")}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          trackGameKey="image-reveal"
        />

        <main className="pt-[72px] max-w-4xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl p-6 shadow">
            <h2 className="text-lg font-semibold mb-2">No cards selected</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">Add cards from Flashcards or choose a saved set in Dashboard then open Games → Card Reveal.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => router.push("/flashcards")} className="btn btn-primary px-3 py-1 text-sm">Go to Flashcards</button>
              <button onClick={() => router.push("/dashboard")} className="btn btn-secondary px-3 py-1 text-sm">Return to Dashboard</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ----------------------
     Main playable layout with scoreboard changes
     ---------------------- */
  return (
    <div ref={containerRef} className={`min-h-screen ${isFullscreen ? "bg-[hsl(140,40%,95%)] text-black" : "bg-[var(--color-bg-main)] text-[var(--color-text-main)]"}`}>
      <GameHeader
        title="Card Reveal"
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
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((s) => !s)}
        trackGameKey="image-reveal"
      />

      {settingsOpen && (
        <div className="fixed top-[72px] right-4 z-[70]">
          <GameSettingsDropdown className="w-[340px]">
            <div className="mb-4">
              <div className="text-sm font-semibold mb-2">Teams</div>
          <div className="flex items-center gap-2 translate-y-4">
                <button
                  onClick={addTeam}
                  disabled={teams.length >= 6}
                  title="Add team"
                  className="btn btn-secondary px-3 py-2 text-sm disabled:opacity-50"
                >
                  Add team
                </button>
                <button
                  onClick={removeLastTeam}
                  disabled={teams.length <= 2}
                  title="Remove last team"
                  className="btn btn-secondary px-3 py-2 text-sm disabled:opacity-50"
                >
                  Remove team
                </button>
              </div>
              <button
                onClick={() => setTeams((s) => s.map((t) => ({ ...t, score: 0 })))}
                title="Reset scores"
                className="btn btn-secondary mt-2 px-3 py-2 text-sm"
              >
                Reset scores
              </button>
            </div>

            <div className="mb-4">
              <div className="text-sm font-semibold mb-2">Timer</div>
              <div className="grid grid-cols-4 gap-2">
                {TIMER_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setTurnTimerSeconds(opt);
                      setTimerSeconds((prev) => (prev !== null ? opt : prev));
                    }}
                    className={`px-2 py-2 text-xs rounded-lg border transition-transform hover:-translate-y-0.5 ${
                      turnTimerSeconds === opt ? "bg-[var(--color-accent)] text-white border-transparent" : "bg-white text-black border-black/10"
                    }`}
                    title={`${opt}s`}
                  >
                    {opt}s
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm font-semibold mb-2">Music</div>
              <button onClick={toggleRevealMusic} className="btn btn-secondary w-full px-3 py-2 text-sm">
                {musicOn ? "Music: On" : "Music: Off"}
              </button>
            </div>

            <div className="text-right">
              <button onClick={() => setSettingsOpen(false)} className="btn btn-secondary px-3 py-2 text-sm">
                Close
              </button>
            </div>
          </GameSettingsDropdown>
        </div>
      )}

      {/* Compact scoreboard */}
      <div className={`pt-[36px] max-w-7xl mx-auto px-4`}>
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Scoreboard</h2>
            <div className="text-sm text-[var(--color-text-muted)]">Teams</div>
            {(showWinner || gameTray.length === 0) && (
              <button onClick={resetGame} title="Reset game" className="btn btn-secondary px-3 py-1.5 text-sm ml-2">
                Reset Game
              </button>
            )}
          </div>

          {/* Controls: active, dramatic timer, timer selector, counter */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2 py-1 rounded-md border bg-white text-sm">
                <div className="text-xs text-[var(--color-text-muted)]">Active</div>
                <div className="font-semibold">{teams[activeTeamIndex]?.name}</div>
                <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse ml-2" />
              </div>

            {/* Dramatic countdown timer (bigger / animated) */}
            <div className="flex items-center gap-1">
              {isAwaitingDecision ? (
                <div className={`countdown-big ${urgent ? "urgent" : ""}`}>
                  {timerSeconds !== null ? `${timerSeconds}s` : `${turnTimerSeconds}s`}
                </div>
              ) : null}
            </div>

            <div className="text-sm text-[var(--color-text-muted)] ml-3">Card {currentIndex + 1}/{gameTray.length}</div>
          </div>
        </div>

        {/* Team boxes: up to 6 per row; show full "Team 1" label and move score next to it */}
        <div className="mb-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {teams.map((team, idx) => {
            const isActive = idx === activeTeamIndex;
            return (
              <div key={team.id} className={`p-2 rounded-md border flex items-center justify-between ${isActive ? "ring-2 ring-[var(--color-accent)]" : ""}`}>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{team.name}</div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Active team's score is larger and pulses */}
                  <div className={`${isActive ? "text-3xl md:text-4xl font-extrabold active-score" : "text-xl font-bold"} w-12 text-center`}>
                    {team.score}
                  </div>
                  <button onClick={() => adjustScore(team.id, -1)} className="btn btn-secondary px-2 py-1 text-sm">−</button>
                  <button onClick={() => adjustScore(team.id, +1)} className="btn btn-secondary px-2 py-1 text-sm">+</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main game grid */}
      <main className="max-w-7xl mx-auto px-4 pb-2" style={{ minHeight: "calc(100vh - 160px)" }}>
        <div className="flex justify-center items-start h-full">
          <div className={`w-full ${isFullscreen ? "max-w-[1600px]" : "max-w-6xl"} rounded-3xl shadow-2xl overflow-hidden border`} style={{ aspectRatio: isFullscreen ? "16/9" : "16/9" }}>
            <div className="relative w-full h-full bg-gray-100">
              <PhaserGameHost
                className="absolute inset-0"
                createGame={createImageRevealGame}
                onApiReady={(api) => {
                  sceneApiRef.current = api as ImageRevealApi | null;
                }}
              />

              {/* X/O buttons moved to bottom center of the game grid */}
              {isAwaitingDecision && (
                <div className="absolute bottom-16 left-0 right-0 flex items-center justify-center gap-6 z-60 pointer-events-auto">
                  <button
                    onClick={handlePass}
                    className="btn btn-secondary w-20 h-20 rounded-full text-3xl shadow-xl border border-black/10 bg-white hover:-translate-y-0.5 transition-transform"
                    title="Pass (X)"
                  >
                    ❌
                  </button>
                  <button
                    onClick={handleCorrect}
                    className="btn btn-primary w-20 h-20 rounded-full text-3xl shadow-xl border border-transparent bg-[linear-gradient(180deg,#60a5fa,#2563eb)] hover:-translate-y-0.5 transition-transform"
                    title="Correct (O)"
                  >
                    ⭕
                  </button>
                </div>
              )}

              {!isAwaitingDecision &&
                !specialRemoveActive &&
                !showPointsPrompt &&
                !showPointsSpinner &&
                tilesRemoved.filter(Boolean).length < TOTAL_TILES && (
                  <div className="absolute inset-0 z-60 flex items-center justify-center pointer-events-auto">
                    <button
                      onClick={startRandomRemoveSequence}
                      className="w-48 h-48 rounded-full bg-[var(--color-accent)] text-white shadow-2xl border-[10px] border-white/85 flex items-center justify-center text-center px-6 hover:scale-105 hover:shadow-[0_18px_50px_rgba(37,99,235,0.35)] transition-transform"
                      title="Remove tile"
                    >
                      <span className="text-3xl font-extrabold leading-tight">Remove tile</span>
                    </button>
                  </div>
                )}

                {(showPointsPrompt || showPointsSpinner) && (
                  <div className="absolute inset-0 z-70 flex items-center justify-center pointer-events-auto">
                    {!showPointsSpinner ? (
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => startPointsSpinner("gain")}
                          className="w-52 h-52 rounded-full bg-[var(--color-accent)] text-white shadow-2xl border-[10px] border-white/85 flex items-center justify-center text-center px-6 hover:scale-105 hover:shadow-[0_18px_50px_rgba(37,99,235,0.35)] transition-transform"
                          title="Get points"
                        >
                          <span className="text-3xl font-extrabold leading-tight">Get points!</span>
                        </button>
                        <button
                          onClick={() => startPointsSpinner("loss")}
                          className="w-36 h-36 rounded-full bg-[#ef4444] text-white shadow-2xl border-[8px] border-white/90 flex flex-col items-center justify-center text-center px-4 hover:scale-105 hover:shadow-[0_18px_40px_rgba(239,68,68,0.28)] transition-transform"
                          title="Lose points"
                        >
                          <span className="text-xl font-extrabold leading-tight">Lose</span>
                          <span className="text-xl font-extrabold leading-tight">points!</span>
                        </button>
                      </div>
                    ) : (
                      <div
                        className={`w-52 h-52 rounded-full shadow-2xl flex flex-col items-center justify-center border-[10px] ${
                          pointsMode === "loss"
                            ? "bg-[color:rgba(255,255,255,0.97)] border-[#ef4444]"
                            : "bg-white/96 border-[var(--color-accent)]"
                        }`}
                      >
                        <div
                          className={`text-[10px] uppercase tracking-[0.35em] mb-2 ${
                            pointsMode === "loss" ? "text-[#ef4444]" : "text-[var(--color-text-muted)]"
                          }`}
                        >
                          {pointsMode === "loss" ? "Minus points" : "Points"}
                        </div>
                        <div
                          className={`text-8xl font-extrabold tabular-nums leading-none ${
                            pointsMode === "loss" ? "text-[#ef4444]" : "text-[var(--color-accent)]"
                          }`}
                        >
                          {pointsMode === "loss" ? "-" : ""}
                          {spinningPoints}
                        </div>
                        <div className="mt-2 text-xs font-semibold text-[var(--color-text-muted)]">
                          {awardedPoints !== null ? "Awarded" : "Spinning..."}
                        </div>
                      </div>
                    )}
                  </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style>{`
        body { --color-primary: #2563eb; }
        .bg-[var(--Color-bg-main)] { background-color: #f8fafc; }
        .bg-[var(--color-bg-soft)] { background-color: #f3f4f6; }

        /* Dramatic countdown style */
        .countdown-big {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 118px;
          padding: 16px 22px;
          border-radius: 16px;
          background: linear-gradient(90deg,#ff7a18,#ff2d55);
          color: white;
          font-weight: 800;
          font-size: 34px;
          box-shadow: 0 10px 28px rgba(255,45,85,0.32);
          transform-origin: center;
          animation: countdown-pulse 900ms ease-in-out infinite;
        }
        .countdown-big.urgent {
          background: linear-gradient(90deg,#ff2d55,#ff0000);
          font-size: 44px;
          padding: 18px 26px;
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

        /* active score pulse */
        @keyframes active-pulse {
          0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(37,99,235,0)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 8px 24px rgba(37,99,235,0.18)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(37,99,235,0)); }
        }
        .active-score { animation: active-pulse 1200ms ease-in-out infinite; }

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
