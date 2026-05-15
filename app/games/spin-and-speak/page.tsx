"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GameHeader from "@/components/games/GameHeader";
import { GameSettingsDropdown } from "@/components/games/GameSettingsSurface";
import PhaserGameHost from "@/components/games/phaser/PhaserGameHost";
import { trackGameStart } from "@/lib/games/track-game-start";
import {
  createSpinWheelGame,
  type SpinSegment,
  type SpinWheelApi,
  type SpinWheelEvent,
} from "@/lib/games/phaser/spin-wheel";

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

/* Segments: question, act, sentence, read */
const SEGMENTS: SpinSegment[] = [
  { id: "question", label: "Question" },
  { id: "act", label: "Act" },
  { id: "sentence", label: "Make" },
  { id: "read", label: "Read" },
];

export default function SpinAndSpeakPage() {
  const router = useRouter();
  const sceneApiRef = useRef<SpinWheelApi | null>(null);

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
    document.documentElement.requestFullscreen().catch(() => {});
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

  // Lesson tray (read-only)
  const [tray, setTray] = useState<GameCard[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LESSON_TRAY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalized = parsed.map((c: any) => ({
          id: String(c.id ?? c.word ?? Math.random().toString(36).slice(2)),
          word: String(c.word ?? c.text ?? ""),
          image: c.image ?? c.image_id ?? c.img ?? null,
        })) as GameCard[];
        setTray(normalized);
      }
    } catch (e) {
      console.error("Failed to load lesson tray", e);
    }
  }, []);

  // Teams & scoreboard
  const [teams, setTeams] = useState<Team[]>([
    { id: "team-1", name: "Team 1", score: 0 },
    { id: "team-2", name: "Team 2", score: 0 },
  ]);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  function addTeam() {
    if (teams.length >= 6) return;
    const next = teams.length + 1;
    setTeams((s) => [...s, { id: `team-${next}`, name: `Team ${next}`, score: 0 }]);
  }
  function removeTeam() {
    setTeams((s) => {
      if (s.length <= 1) return s;
      const next = s.slice(0, -1);
      setActiveTeamIndex((i) => Math.min(i, next.length - 1));
      return next;
    });
  }
  function resetScores() {
    setTeams((s) => s.map((t) => ({ ...t, score: 0 })));
  }
  function adjustScore(id: string, delta: number) {
    setTeams((s) => s.map((t) => (t.id === id ? { ...t, score: Math.max(0, t.score + delta) } : t)));
  }

  // Local used card tracking (do not mutate lesson tray)
  const [usedIndices, setUsedIndices] = useState<number[]>([]);
  function pickRandomCardIndex(): number | null {
    if (tray.length === 0) return null;
    const all = tray.map((_, i) => i);
    const unused = all.filter((i) => !usedIndices.includes(i));
    if (unused.length === 0) return null;
    return unused[Math.floor(Math.random() * unused.length)];
  }
  const [currentCardIndex, setCurrentCardIndex] = useState<number | null>(null);
  useEffect(() => {
    if (tray.length > 0 && currentCardIndex === null) {
      setCurrentCardIndex(Math.floor(Math.random() * tray.length));
    }
  }, [tray.length, currentCardIndex]);
  function drawNewCard() {
    const pick = pickRandomCardIndex();
    setCurrentCardIndex(pick);
  }

  // Audio helpers
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
  function playTone(freq = 880, dur = 0.06, type: OscillatorType = "sine", gain = 0.06) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    o.start(now);
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.stop(now + dur + 0.02);
  }

  // Music control (resume/suspend)
  const [musicOn, setMusicOn] = useState(false);
  const musicIntervalRef = useRef<number | null>(null);
  const musicStepRef = useRef(0);
  function startMusicLoop() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    ctx.resume().catch(() => {});
    if (musicIntervalRef.current) return;
    const melody = [330, 392, 523, 440, 392, 330];
    musicStepRef.current = 0;
    musicIntervalRef.current = window.setInterval(() => {
      const f = melody[musicStepRef.current % melody.length];
      playTone(f, 0.22, "sawtooth", 0.03);
      musicStepRef.current++;
    }, 420);
  }
  function stopMusicLoop() {
    if (musicIntervalRef.current) {
      window.clearInterval(musicIntervalRef.current);
      musicIntervalRef.current = null;
    }
    const ctx = getAudioCtx();
    if (ctx) {
      ctx.suspend().catch(() => {});
    }
  }
  function toggleMusic() {
    const willOn = !musicOn;
    setMusicOn(willOn);
    if (willOn) startMusicLoop();
    else stopMusicLoop();
  }

  const [spinning, setSpinning] = useState(false);
  const [landedSegment, setLandedSegment] = useState<SpinSegment | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [showCardWord, setShowCardWord] = useState(true);
  const [showPointsPrompt, setShowPointsPrompt] = useState(false);
  const [showPointsSpinner, setShowPointsSpinner] = useState(false);
  const [spinningPoints, setSpinningPoints] = useState(1);
  const [awardedPoints, setAwardedPoints] = useState<number | null>(null);
  const pointsSpinIntervalRef = useRef<number | null>(null);
  const pointsSpinTimeoutRef = useRef<number | null>(null);
  const pointsAwardTimeoutRef = useRef<number | null>(null);

  // Timer
  const TIMER_OPTIONS = [10, 15, 20, 30] as const;
  const [turnLength, setTurnLength] = useState<number>(10);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const timerIdRef = useRef<number | null>(null);
  useEffect(() => {
    setShowCardWord(timerActive && !showPopup && !showPointsPrompt && !showPointsSpinner);
  }, [timerActive, showPopup, showPointsPrompt, showPointsSpinner]);
  useEffect(() => {
    if (!timerActive || timerSeconds === null) return;
    if (timerSeconds <= 0) {
      handleTimerEnd();
      return;
    }
    const id = window.setTimeout(() => setTimerSeconds((s) => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(id);
  }, [timerSeconds, timerActive]);
  function startTimer(seconds: number) {
    setTimerSeconds(seconds);
    setTimerActive(true);
  }
  function clearTimer() {
    setTimerActive(false);
    setTimerSeconds(null);
    if (timerIdRef.current) {
      window.clearTimeout(timerIdRef.current);
      timerIdRef.current = null;
    }
  }
  function handleTimerEnd() {
    clearTimer();
  }

  function clearPointsSpinnerTimers() {
    if (pointsSpinIntervalRef.current) {
      window.clearInterval(pointsSpinIntervalRef.current);
      pointsSpinIntervalRef.current = null;
    }
    if (pointsSpinTimeoutRef.current) {
      window.clearTimeout(pointsSpinTimeoutRef.current);
      pointsSpinTimeoutRef.current = null;
    }
    if (pointsAwardTimeoutRef.current) {
      window.clearTimeout(pointsAwardTimeoutRef.current);
      pointsAwardTimeoutRef.current = null;
    }
  }

  function handleSpinSceneEvent(event: SpinWheelEvent) {
    if (event.type === "spin-start") {
      setSpinning(true);
      playTone(780, 0.06, "triangle", 0.06);
      return;
    }

    if (event.type === "spin-landed") {
      setSpinning(false);
      setLandedSegment(event.segment);
      playTone(520, 0.18, "sine", 0.08);
      setShowPopup(true);
      window.setTimeout(() => {
        setShowPopup(false);
        startTimer(turnLength);
      }, 1500);
    }
  }

  function spinWheel() {
    if (spinning || timerActive || showPopup || showPointsPrompt || showPointsSpinner || tray.length === 0) return;
    trackGameStart("spin-and-speak");
    sceneApiRef.current?.spin();
  }

  // Turn resolution
  function onCorrect() {
    if (showPointsPrompt || showPointsSpinner) return;
    playTone(980, 0.12, "sine", 0.09);
    clearTimer();
    setTimerSeconds(null);
    setShowPointsPrompt(true);
    setShowPointsSpinner(false);
    setAwardedPoints(null);
    clearPointsSpinnerTimers();
  }
  function onPass() {
    resolveTurn();
  }
  function resolveTurn() {
    if (currentCardIndex !== null && !usedIndices.includes(currentCardIndex)) {
      setUsedIndices((u) => [...u, currentCardIndex]);
    }
    clearTimer();
    setActiveTeamIndex((i) => (i + 1) % teams.length);
    setTimeout(() => {
      drawNewCard();
      setLandedSegment(null);
    }, 350);
  }
  function teacherEndTimerEarly() {
    clearTimer();
  }

  function startPointsSpinner() {
    if (!showPointsPrompt || showPointsSpinner) return;
    const scoringTeamIndex = activeTeamIndex;
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
        setTeams((prev) => prev.map((t, idx) => (idx === scoringTeamIndex ? { ...t, score: t.score + finalPoints } : t)));
        playTone(780, 0.16, "triangle", 0.08);

        window.setTimeout(() => {
          setShowPointsSpinner(false);
          setAwardedPoints(null);
          resolveTurn();
        }, 650);
      }, 1500);
    }, 4000);
  }

  // Winner detection
  const allUsed = tray.length > 0 && usedIndices.length >= tray.length;
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);
  const [winnerTeam, setWinnerTeam] = useState<Team | null>(null);
  useEffect(() => {
    if (allUsed) {
      const winner = teams.reduce((best, t) => (t.score > best.score ? t : best), teams[0]);
      setWinnerTeam(winner);
      setWinnerModalOpen(true);
      playTone(720, 0.12, "sine", 0.08);
      setTimeout(() => playTone(900, 0.12, "triangle", 0.09), 140);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allUsed]);

  useEffect(() => {
    return () => {
      clearPointsSpinnerTimers();
    };
  }, []);

  function resetGame(fullResetScores = false) {
    setUsedIndices([]);
    setLandedSegment(null);
    setShowPopup(false);
    setShowCardWord(false);
    setSpinning(false);
    setShowPointsPrompt(false);
    setShowPointsSpinner(false);
    setAwardedPoints(null);
    clearPointsSpinnerTimers();
    clearTimer();
    setWinnerModalOpen(false);
    setWinnerTeam(null);
    drawNewCard();
    if (fullResetScores) resetScores();
  }

  const remainingCount = Math.max(0, tray.length - usedIndices.length);

  // --- SAFE image handling: compute currentCard & imgSrc so we never pass empty string to <img src=...>
  const currentCard = currentCardIndex !== null && tray[currentCardIndex] ? tray[currentCardIndex] : null;
  const imgSrc =
    currentCard && typeof currentCard.image === "string" && currentCard.image.trim().length > 0
      ? currentCard.image.trim()
      : null;

  return (
    <div className="min-h-screen bg-[hsl(140,40%,95%)] text-black antialiased"> {/* pastel green background */}
      <GameHeader
        title="Spin & Speak"
        onExit={() => router.push("/games")}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((s) => !s)}
        trackGameKey="spin-and-speak"
      />

      {/* Main */}
      <main className="pt-[72px] max-w-7xl mx-auto px-4 h-[calc(100vh-72px)]">
        <div className="h-full flex gap-6">
          {/* Wheel */}
          <section className="w-1/3 relative flex flex-col items-center justify-center">
            <div className="w-full h-[320px] md:h-[420px] rounded-2xl overflow-hidden border border-black/5 bg-[hsl(140,40%,95%)]">
              <PhaserGameHost
                className="w-full h-full"
                createGame={(context) => createSpinWheelGame({ ...context, segments: SEGMENTS })}
                onEvent={handleSpinSceneEvent}
                onApiReady={(api) => {
                  sceneApiRef.current = api as SpinWheelApi | null;
                }}
              />
            </div>

            <div className="mt-6">
              <button
                onClick={spinWheel}
                disabled={spinning || timerActive || showPopup || showPointsPrompt || showPointsSpinner || tray.length === 0}
                className={`btn btn-primary px-8 py-4 text-xl md:text-2xl font-extrabold shadow-2xl transition ${
                  spinning || timerActive || showPopup || showPointsPrompt || showPointsSpinner || tray.length === 0 ? "opacity-60 cursor-not-allowed" : "hover:scale-105"
                } ${!spinning && !timerActive && !showPopup && !showPointsPrompt && !showPointsSpinner && tray.length > 0 ? "spin-pulse" : ""}`}
              >
                SPIN
              </button>
            </div>

            <div className="mt-4 text-sm text-gray-700">{remainingCount} cards remaining</div>
          </section>

          {/* Center card */}
          <section className="w-1/3 flex flex-col items-center justify-center">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl h-[22rem] md:h-[30rem] flex items-center justify-center overflow-hidden">
              {currentCard ? (
                imgSrc ? (
                  <img src={imgSrc} alt={currentCard.word ?? ""} className="object-contain w-full h-full p-3 md:p-4" />
                ) : (
                  <div className="text-2xl text-gray-400">No image</div>
                )
              ) : (
                <div className="text-xl text-gray-500">No card</div>
              )}
            </div>

            <div className="text-6xl md:text-7xl font-extrabold text-center mt-5 min-h-[4.5rem] tracking-tight">
              {showCardWord && currentCard ? currentCard.word : " "}
            </div>

            {showPopup && landedSegment && !showPointsPrompt && !showPointsSpinner && (
              <div className="absolute inset-0 z-30 flex items-center justify-center px-4 pointer-events-none">
                <div className="bg-white/95 border border-black/10 rounded-[2rem] shadow-[0_26px_80px_rgba(15,23,42,0.22)] px-8 py-7 text-center animate-zoom-in w-[min(90vw,32rem)]">
                  <div className="text-sm uppercase tracking-[0.3em] text-[var(--color-text-muted)] mb-2">Spin result</div>
                  <div className="text-3xl md:text-4xl font-extrabold">{landedSegment.label}</div>
                </div>
              </div>
            )}

            <div className="mt-7 flex flex-col items-center gap-3">
              <div className={`px-5 py-3 rounded-2xl font-bold text-2xl ${timerActive && timerSeconds !== null && timerSeconds <= 3 ? "bg-red-500 text-white animate-pulse-fast" : "bg-white text-black shadow-sm"}`}>
                {timerActive && timerSeconds !== null ? `${timerSeconds}s` : `Ready`}
              </div>

              {timerActive && (
                <div className="flex items-center gap-4">
                  <button onClick={onCorrect} className="btn btn-primary px-6 py-2 font-bold shadow">✅ Correct</button>
                  <button onClick={onPass} className="btn btn-secondary px-6 py-2 font-semibold shadow">❌ Pass</button>
                </div>
              )}

              {timerActive && (
                <button onClick={teacherEndTimerEarly} className="btn btn-secondary mt-2 px-4 py-2">
                  End Early
                </button>
              )}
            </div>
          </section>

          {/* Right scoreboard */}
          <aside className="w-1/3 flex flex-col gap-4">
            <div className="bg-white rounded-2xl shadow p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">Teams</div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {teams.map((team, idx) => {
                  const isActive = idx === activeTeamIndex;
                  return (
                    <div key={team.id} className={`flex items-center justify-between p-3 rounded-md transition ${isActive ? "scale-105 ring-2 ring-indigo-400 bg-indigo-50" : "bg-white"}`}>
                      <div>
                        <div className="text-sm font-semibold">{team.name}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`${isActive ? "text-3xl font-extrabold active-score" : "text-xl font-bold"}`}>{team.score}</div>
                        <div className="flex gap-1">
                          <button onClick={() => adjustScore(team.id, -1)} className="btn btn-secondary px-2 py-1">−</button>
                          <button onClick={() => adjustScore(team.id, +1)} className="btn btn-secondary px-2 py-1">+</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t mt-2 flex items-center justify-between">
                <button onClick={() => resetGame(false)} className="btn btn-secondary px-3 py-1">
                  Reset Turn
                </button>
                <div className="text-sm text-gray-500">Cards: {tray.length}</div>
              </div>
            </div>

            {winnerModalOpen && winnerTeam && (
              <div className="bg-white rounded-2xl shadow p-4 text-center">
                <div className="text-xl font-extrabold">🏆 {winnerTeam.name} Wins!</div>
                <div className="mt-2 text-sm text-gray-600">Great speaking, everyone!</div>
                <div className="mt-3 flex justify-center gap-2">
                  <button onClick={() => { setWinnerModalOpen(false); resetGame(true); }} className="btn btn-primary px-3 py-1">Play Again</button>
                  <button onClick={() => { setWinnerModalOpen(false); router.push("/games"); }} className="btn btn-secondary px-3 py-1">Exit</button>
                </div>
                <div className="pointer-events-none mt-4 flex justify-center gap-2">
                  <div className="w-3 h-6 bg-pink-400 animate-fall" />
                  <div className="w-3 h-6 bg-yellow-400 animate-fall" />
                  <div className="w-3 h-6 bg-green-400 animate-fall" />
                  <div className="w-3 h-6 bg-blue-400 animate-fall" />
                </div>
              </div>
            )}

            <div className="text-xs text-gray-700">
              Teacher controls on the right. Spin to choose a task; after popup the timer begins.
            </div>
          </aside>
        </div>
      </main>

      {(showPointsPrompt || showPointsSpinner) && (
        <div className="fixed inset-0 z-60 flex items-center justify-center pointer-events-auto">
          {!showPointsSpinner ? (
            <button
              onClick={startPointsSpinner}
              className="w-52 h-52 rounded-full bg-[var(--color-accent)] text-white shadow-2xl border-[10px] border-white/85 flex items-center justify-center text-center px-6 hover:scale-105 hover:shadow-[0_18px_50px_rgba(37,99,235,0.35)] transition-transform"
              title="Get points"
            >
              <span className="text-3xl font-extrabold leading-tight">Get points!</span>
            </button>
          ) : (
            <div className="w-52 h-52 rounded-full bg-white/96 border-[10px] border-[var(--color-accent)] shadow-2xl flex flex-col items-center justify-center animate-zoom-in">
              <div className="text-[10px] uppercase tracking-[0.35em] text-[var(--color-text-muted)] mb-2">
                Points
              </div>
              <div className="text-8xl font-extrabold text-[var(--color-accent)] tabular-nums leading-none">
                {spinningPoints}
              </div>
              <div className="mt-2 text-xs font-semibold text-[var(--color-text-muted)]">
                {awardedPoints !== null ? "Awarded" : "Spinning..."}
              </div>
            </div>
          )}
        </div>
      )}

      {settingsOpen && (
        <div className="fixed top-[72px] right-4 z-[70]">
          <GameSettingsDropdown className="w-[340px]">
            <div className="mb-4">
              <div className="mb-2 font-semibold">Teams</div>
              <div className="flex flex-wrap gap-2">
                <button onClick={addTeam} disabled={teams.length >= 6} className="btn btn-secondary px-3 py-2 text-sm disabled:opacity-50">
                  Add team
                </button>
                <button onClick={removeTeam} disabled={teams.length <= 1} className="btn btn-secondary px-3 py-2 text-sm disabled:opacity-50">
                  Remove team
                </button>
                <button onClick={resetScores} className="btn btn-secondary px-3 py-2 text-sm">
                  Reset scores
                </button>
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 font-semibold">Timer</div>
              <div className="flex gap-2 flex-wrap">
                {TIMER_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTurnLength(t)}
                    className={`px-2 py-2 text-xs rounded-lg border transition-transform hover:-translate-y-0.5 ${
                      turnLength === t ? "bg-[var(--color-accent)] text-white border-transparent" : "bg-white text-black border-black/10"
                    }`}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="mb-2 font-semibold">Music</div>
              <button onClick={toggleMusic} className={`btn btn-secondary w-full px-3 py-2 text-sm ${musicOn ? "ring-2 ring-yellow-300" : ""}`}>
                {musicOn ? "Music: On" : "Music: Off"}
              </button>
            </div>

            <div className="text-right">
              <button onClick={() => setSettingsOpen(false)} className="btn btn-secondary px-3 py-1 text-sm">
                Close
              </button>
            </div>
          </GameSettingsDropdown>
        </div>
      )}

      <style jsx>{`
        .animate-zoom-in {
          animation: zoom-in 420ms cubic-bezier(.2,.9,.3,1) both;
        }
        @keyframes zoom-in {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pulse-fast { animation: pulse 600ms ease-in-out infinite; }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.08); }
          100% { transform: scale(1); }
        }
        .animate-fall { animation: fall 1600ms linear infinite; }
        @keyframes fall { 0% { transform: translateY(-200%); opacity: 1; } 100% { transform: translateY(120vh); opacity: 0; } }
        .active-score { animation: active-pulse 1200ms ease-in-out infinite; }
        @keyframes active-pulse {
          0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(99,102,241,0)); }
          50% { transform: scale(1.08); filter: drop-shadow(0 8px 24px rgba(99,102,241,0.18)); }
          100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(99,102,241,0)); }
        }
        .spin-pulse {
          animation: spin-pulse 900ms ease-in-out infinite;
        }
        @keyframes spin-pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37,99,235,0.35); }
          70% { transform: scale(1.05); box-shadow: 0 0 0 18px rgba(37,99,235,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37,99,235,0); }
        }
      `}</style>
    </div>
  );
}
