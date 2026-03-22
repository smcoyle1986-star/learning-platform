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

/* Segments: question, act, sentence, read (emoji used as picture) */
const SEGMENTS = [
  { id: "question", emoji: "❓", label: "Answer a Question" },
  { id: "act", emoji: "🎭", label: "Act or Describe" },
  { id: "sentence", emoji: "✏️", label: "Make a Sentence" },
  { id: "read", emoji: "🗣️", label: "Read Aloud" },
] as const;

export default function SpinAndSpeakPage() {
  const router = useRouter();

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
  function addTeam() {
    if (teams.length >= 6) return;
    const next = teams.length + 1;
    setTeams((s) => [...s, { id: `team-${next}`, name: `Team ${next}`, score: 0 }]);
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

  // Wheel animation via RAF
  const [spinRotation, setSpinRotation] = useState(0); // degrees
  const spinningRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const animStartRef = useRef(0);
  const animDurationRef = useRef(0);
  const animStartRotRef = useRef(0);
  const animTargetRotRef = useRef(0);

  const notchCount = 36;
  const lastNotchRef = useRef<number | null>(null);

  const [spinning, setSpinning] = useState(false);
  const [landedSegment, setLandedSegment] = useState<typeof SEGMENTS[number] | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  // compute notch positions client-side to avoid hydration mismatch
  const [notchPositions, setNotchPositions] = useState<{ x1: number; y1: number; x2: number; y2: number }[] | null>(null);

  // Timer
  const TIMER_OPTIONS = [10, 15, 20, 30] as const;
  const [turnLength, setTurnLength] = useState<number>(10);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerActive, setTimerActive] = useState(false);
  const timerIdRef = useRef<number | null>(null);
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

  function playNotchClick() {
    playTone(1200, 0.03, "square", 0.04);
  }
  function easeOutCubic(t: number) {
    return 1 - Math.pow(1 - t, 3);
  }
  function notchIndexForAngle(angle: number) {
    let a = angle % 360;
    if (a < 0) a += 360;
    const degPerNotch = 360 / notchCount;
    return Math.floor(a / degPerNotch);
  }

  // SVG geometry helpers (deterministic)
  const cx = 150;
  const cy = 150;
  const r = 140;
  function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180.0;
    return {
      x: cx + r * Math.cos(angleRad),
      y: cy + r * Math.sin(angleRad),
    };
  }
  function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return ["M", cx, cy, "L", start.x, start.y, "A", r, r, 0, largeArcFlag, 0, end.x, end.y, "Z"].join(" ");
  }

  useEffect(() => {
    // compute notch positions once on client to avoid SSR/CSR differences
    const positions: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (let n = 0; n < notchCount; n++) {
      const angle = (n / notchCount) * 360;
      const inner = polarToCartesian(cx, cy, r - 6, angle);
      const outer = polarToCartesian(cx, cy, r + 6, angle);
      positions.push({ x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y });
    }
    setNotchPositions(positions);
  }, []);

  function animateTo(targetRotation: number, durationMs: number, onComplete?: (finalRotation: number) => void) {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    animStartRef.current = performance.now();
    animDurationRef.current = durationMs;
    animStartRotRef.current = spinRotation;
    animTargetRotRef.current = targetRotation;
    lastNotchRef.current = notchIndexForAngle(spinRotation);

    const loop = (now: number) => {
      const elapsed = now - animStartRef.current;
      const t = Math.min(1, elapsed / animDurationRef.current);
      const eased = easeOutCubic(t);
      const current = animStartRotRef.current + (animTargetRotRef.current - animStartRotRef.current) * eased;
      setSpinRotation(current);

      const currentNotch = notchIndexForAngle(current);
      if (lastNotchRef.current !== null && currentNotch !== lastNotchRef.current) {
        let steps = currentNotch - lastNotchRef.current;
        if (steps < 0) steps += notchCount;
        for (let s = 0; s < steps; s++) {
          playNotchClick();
        }
        lastNotchRef.current = currentNotch;
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(loop);
      } else {
        rafRef.current = null;
        // ensure final state set
        setSpinRotation(animTargetRotRef.current);
        if (onComplete) onComplete(animTargetRotRef.current);
      }
    };
    rafRef.current = requestAnimationFrame(loop);
  }

  // Spin: duration random among 3000,4000,5000,6000 ms and determine landing by final rotation
  function spinWheel(autoStartTimer = true) {
    if (spinningRef.current || timerActive || showPopup) return;
    if (tray.length === 0) return;
    spinningRef.current = true;
    setSpinning(true);
    playTone(780, 0.06, "triangle", 0.06);

    const segCount = SEGMENTS.length;
    const rotations = 4 + Math.floor(Math.random() * 4); // 4..7
    const chosen = Math.floor(Math.random() * segCount); // used to compute target offset to avoid degenerate landings
    const segAngle = 360 / segCount;
    const offset = chosen * segAngle + segAngle / 2;
    const target = spinRotation + rotations * 360 + offset;

    // choose random duration from {3,4,5,6} seconds
    const secondsOptions = [3, 4, 5, 6];
    const seconds = secondsOptions[Math.floor(Math.random() * secondsOptions.length)];
    const duration = seconds * 1000;

    animateTo(target, duration, (finalRotation) => {
      spinningRef.current = false;
      setSpinning(false);
      // Determine which segment is at the pointer (top) given finalRotation
      // Normalized angle for wheel center -> the segment whose center A satisfies (A + finalRotation) % 360 == 0
      // So compute normalized = (360 - (finalRotation % 360)) % 360, then index = floor(normalized / 90)
      let normalized = 360 - (finalRotation % 360);
      normalized = ((normalized % 360) + 360) % 360;
      const index = Math.floor(normalized / segAngle) % segCount;
      const landed = SEGMENTS[index];
      setLandedSegment(landed);
      playTone(520, 0.18, "sine", 0.08);
      setShowPopup(true);
      setTimeout(() => {
        setShowPopup(false);
        if (autoStartTimer) startTimer(turnLength);
      }, 3000);
    });
  }

  // Turn resolution
  function onCorrect() {
    const teamId = teams[activeTeamIndex].id;
    adjustScore(teamId, 1);
    playTone(980, 0.12, "sine", 0.09);
    resolveTurn();
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

  function resetGame(fullResetScores = false) {
    setUsedIndices([]);
    setLandedSegment(null);
    setShowPopup(false);
    setSpinning(false);
    setSpinRotation(0);
    clearTimer();
    setWinnerModalOpen(false);
    setWinnerTeam(null);
    drawNewCard();
    if (fullResetScores) resetScores();
  }

  const remainingCount = Math.max(0, tray.length - usedIndices.length);

  // wheel sizing; make smaller so it fits, but still larger when spinning (bounded)
  const wheelIdleSize = 280;
  const wheelMaxSpinning = isFullscreen ? "min(78vw,560px)" : "min(68vw,460px)";

  // --- SAFE image handling: compute currentCard & imgSrc so we never pass empty string to <img src=...>
  const currentCard = currentCardIndex !== null && tray[currentCardIndex] ? tray[currentCardIndex] : null;
  const imgSrc =
    currentCard && typeof currentCard.image === "string" && currentCard.image.trim().length > 0
      ? currentCard.image.trim()
      : null;

  return (
    <div className="min-h-screen bg-[hsl(140,40%,95%)] text-black antialiased"> {/* pastel green background */}
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="text-2xl font-extrabold text-blue-600">Classendo</a>
          <div className="text-xl font-bold">Spin & Speak</div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              className="btn btn-secondary p-2"
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
            {/* Exit button uses site green */}
            <button onClick={() => router.push("/games")} className="btn btn-secondary px-3 py-1 flex items-center gap-2">
              <Play size={14} /> Exit
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="pt-[72px] max-w-7xl mx-auto px-4 h-[calc(100vh-72px)]">
        <div className="h-full flex gap-6">
          {/* Wheel */}
          <section className="w-1/3 flex flex-col items-center justify-center">
            <div className="relative flex items-center justify-center">
              <div
                style={{
                  width: spinning ? wheelMaxSpinning : `${wheelIdleSize}px`,
                  height: spinning ? wheelMaxSpinning : `${wheelIdleSize}px`,
                  transition: "width 360ms ease, height 360ms ease",
                  maxWidth: "100%",
                }}
                className="flex items-center justify-center"
              >
                <svg viewBox="0 0 300 300" className="w-full h-full" style={{ transform: `rotate(${spinRotation}deg)` }}>
                  {/* four quarter slices */}
                  {SEGMENTS.map((seg, i) => {
                    const start = i * 90;
                    const end = start + 90;
                    const colors = ["#FF6B6B", "#FFD166", "#6BCB77", "#7CC7FF"];
                    return (
                      <path key={seg.id} d={describeArc(cx, cy, r, start, end)} fill={colors[i % colors.length]} stroke="#fff" strokeWidth="0" />
                    );
                  })}

                  {/* center hub */}
                  <circle cx={cx} cy={cy} r={48} fill="#ffffff" stroke="rgba(0,0,0,0.06)" strokeWidth="2" />

                  {/* emoji pictures */}
                  {SEGMENTS.map((seg, i) => {
                    const angle = i * 90 + 45;
                    const pos = polarToCartesian(cx, cy, r * 0.57, angle);
                    return (
                      <text key={seg.id} x={pos.x} y={pos.y + 8} textAnchor="middle" fontSize="34" style={{ pointerEvents: "none" }}>
                        {seg.emoji}
                      </text>
                    );
                  })}

                  {/* notches: render only after client computed positions to avoid hydration mismatch */}
                  {notchPositions &&
                    notchPositions.map((p, idx) => (
                      <line
                        key={idx}
                        x1={p.x1}
                        y1={p.y1}
                        x2={p.x2}
                        y2={p.y2}
                        stroke="#333"
                        strokeWidth="2"
                        strokeLinecap="round"
                        opacity="0.9"
                      />
                    ))}
                </svg>
              </div>

              <div className="absolute left-1/2 transform -translate-x-1/2 -top-6">
                <div className="w-10 h-10 md:w-14 md:h-14 bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg">▼</div>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => spinWheel(true)}
                disabled={spinning || timerActive || showPopup || tray.length === 0}
                className={`btn btn-primary px-6 py-3 text-lg font-bold shadow-2xl transition ${
                  spinning || timerActive || showPopup || tray.length === 0 ? "opacity-60 cursor-not-allowed" : "hover:scale-105"
                }`}
              >
                SPIN
              </button>
            </div>

            <div className="mt-4 text-sm text-gray-700">{remainingCount} cards remaining</div>
          </section>

          {/* Center card */}
          <section className="w-1/3 flex flex-col items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-80 md:h-96 flex items-center justify-center overflow-hidden">
              {currentCard ? (
                imgSrc ? (
                  <img src={imgSrc} alt={currentCard.word ?? ""} className="object-cover w-full h-full" />
                ) : (
                  <div className="text-2xl text-gray-400">No image</div>
                )
              ) : (
                <div className="text-xl text-gray-500">No card</div>
              )}
            </div>

            <div className="text-4xl font-extrabold text-center mt-4">
              {currentCard ? currentCard.word : "—"}
            </div>

            {showPopup && landedSegment && (
              <div className="mt-6">
                <div className="bg-white rounded-2xl shadow-2xl p-6 text-center animate-zoom-in">
                  <div className="text-2xl md:text-3xl font-extrabold">{landedSegment.label}</div>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col items-center gap-3">
              <div className={`px-4 py-2 rounded-lg font-bold text-xl ${timerActive && timerSeconds !== null && timerSeconds <= 3 ? "bg-red-500 text-white animate-pulse-fast" : "bg-white text-black shadow-sm"}`}>
                {timerActive && timerSeconds !== null ? `${timerSeconds}s` : `Ready`}
              </div>

              {timerActive && (
                <div className="flex items-center gap-4">
                  <button onClick={onCorrect} className="btn btn-primary px-6 py-2 font-bold shadow">✅ Correct</button>
                  <button onClick={onPass} className="btn btn-secondary px-6 py-2 font-semibold shadow">❌ Pass</button>
                </div>
              )}

              {timerActive && (
                <button onClick={teacherEndTimerEarly} className="btn btn-secondary mt-2 px-3 py-1">
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
                <div className="flex items-center gap-2">
                  <button onClick={addTeam} className="btn btn-secondary px-2 py-1">＋</button>
                  <button onClick={() => resetGame(true)} className="btn btn-secondary px-2 py-1">Reset Game</button>
                </div>
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

              <div className="pt-2 border-t mt-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">Timer</div>
                  <div className="flex gap-2">
                    {TIMER_OPTIONS.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTurnLength(t)}
                        className={`btn px-2 py-1 ${turnLength === t ? "btn-primary" : "btn-secondary"}`}
                      >
                        {t}s
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleMusic}
                      className={`btn px-3 py-1 ${musicOn ? "btn-primary" : "btn-secondary"}`}
                    >
                      {musicOn ? "Music: On" : "Music: Off"}
                    </button>
                    <button onClick={() => resetGame(false)} className="btn btn-secondary px-3 py-1">
                      Reset Turn
                    </button>
                  </div>

                  <div className="text-sm text-gray-500">Cards: {tray.length}</div>
                </div>
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
      `}</style>
    </div>
  );
}