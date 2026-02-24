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

/*
  Yes or No (app/games/yes-or-no/page.tsx)
  Changes in this version:
  - Modal no longer auto-closes. Teacher must click "Finished" to close.
    When Finished is clicked and all sentences are present, a large green tick
    is shown briefly and the modal closes.
  - Added Start Game button (visible after modal close). Clicking it starts the
    first card's prep -> reveal -> timer sequence. Start button disappears until reset.
  - Image width increased (wider, not taller) and height reduced so scoreboard and Yes/No
    controls remain visible without scrolling.
  - Popups for results:
    * Correct answer: "+N" (N = 1..3 random) shown in center for 3s, then points applied and advance.
    * Incorrect answer: "Sorry — 0 points" shown in red for 3s, then advance.
  - Modal Yes/No buttons have hover & press feedback.
  - No automatic modal close; teacher has full control.
*/

export default function YesOrNoPage() {
  const router = useRouter();

  // Fullscreen
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
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  // Load lesson tray (read-only)
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

  // Teams / Scoreboard
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

  // Modes & mix
  type Mode = "sentence" | "vocab";
  const [globalMode, setGlobalMode] = useState<Mode>("sentence");
  const [mixMode, setMixMode] = useState(false);
  const [cardModeMap, setCardModeMap] = useState<Record<number, Mode>>({});

  // Teacher-provided sentences modal
  const [sentencesMap, setSentencesMap] = useState<Record<string, { text: string; isYes: boolean }>>({});
  const [sentencesModalOpen, setSentencesModalOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [modalFinishedTickVisible, setModalFinishedTickVisible] = useState(false);

  // Cards & used tracking
  const [usedIndices, setUsedIndices] = useState<number[]>([]);
  const pickRandomCardIndex = (avoidUsed = false): number | null => {
    if (tray.length === 0) return null;
    const all = tray.map((_, i) => i);
    const candidates = avoidUsed ? all.filter((i) => !usedIndices.includes(i)) : all;
    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  };
  const [currentCardIndex, setCurrentCardIndex] = useState<number | null>(null);

  // Game start control
  const [gameStarted, setGameStarted] = useState(false);

  // Initialize sentencesMap and open modal on startup
  useEffect(() => {
    if (tray.length > 0) {
      setSentencesMap((prev) => {
        const next = { ...prev };
        tray.forEach((c) => {
          if (!next[c.id]) next[c.id] = { text: "", isYes: true };
        });
        return next;
      });
      setSentencesModalOpen(true);
    }
  }, [tray.length]);

  // Round state
  const [displayedText, setDisplayedText] = useState<string>("");
  const [correctAnswerIsYes, setCorrectAnswerIsYes] = useState<boolean>(true);
  const [roundPhase, setRoundPhase] = useState<"prepping" | "hidden" | "timing" | "feedback">("hidden");

  // Timer
  const TIMER_OPTIONS = [10, 15, 20, 30] as const;
  const [turnLength, setTurnLength] = useState<number>(10);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (roundPhase !== "timing") {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    if (timerSeconds === null) {
      setTimerSeconds(turnLength);
      return;
    }
    if (timerSeconds <= 0) {
      setRoundPhase("feedback");
      return;
    }
    const id = window.setTimeout(() => setTimerSeconds((s) => (s !== null ? s - 1 : s)), 1000);
    timerRef.current = id;
    return () => clearTimeout(id);
  }, [roundPhase, timerSeconds, turnLength]);

  function startTimer() {
    setTimerSeconds(turnLength);
    setRoundPhase("timing");
  }
  function stopTimer() {
    setTimerSeconds(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  // Audio helpers (simple)
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
  function playJingle(freqs: number[], duration = 0.12, type: OscillatorType = "sine", gain = 0.08) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = f;
      g.gain.value = gain;
      o.connect(g);
      g.connect(ctx.destination);
      o.start(now + i * 0.06);
      g.gain.setValueAtTime(gain, now + i * 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.06 + duration);
      o.stop(now + i * 0.06 + duration + 0.02);
    });
  }
  function playYesJingle() { playJingle([880, 1100], 0.12, "sine", 0.09); }
  function playNoJingle() { playJingle([440], 0.12, "triangle", 0.07); }
  function playCorrectSound() { playJingle([1040, 880, 660], 0.16, "sine", 0.09); }
  function playIncorrectSound() { playJingle([220, 160], 0.14, "triangle", 0.08); }

  const [musicOn, setMusicOn] = useState(false);
  const musicIntervalRef = useRef<number | null>(null);
  function startMusic() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    ctx.resume().catch(() => {});
    if (musicIntervalRef.current) return;
    const melody = [330, 392, 523, 392];
    let step = 0;
    musicIntervalRef.current = window.setInterval(() => {
      playTone(melody[step % melody.length], 0.12, "square", 0.03);
      step++;
    }, 360);
  }
  function stopMusic() {
    if (musicIntervalRef.current) {
      clearInterval(musicIntervalRef.current);
      musicIntervalRef.current = null;
    }
    const ctx = getAudioCtx();
    if (ctx) ctx.suspend().catch(() => {});
  }
  function toggleMusic() {
    const willOn = !musicOn;
    setMusicOn(willOn);
    if (willOn) startMusic();
    else stopMusic();
  }

  // Prepare round for an index
  function prepareRoundForIndex(idx: number | null) {
    if (idx === null) {
      setDisplayedText("");
      setCorrectAnswerIsYes(true);
      return;
    }
    const card = tray[idx];
    if (!card) return;

    const modeForCard: Mode = mixMode ? (cardModeMap[idx] ?? (Math.random() < 0.5 ? "sentence" : "vocab")) : globalMode;

    if (mixMode && !cardModeMap[idx]) {
      setCardModeMap((m) => ({ ...m, [idx]: modeForCard }));
    }

    if (modeForCard === "sentence") {
      const entry = sentencesMap[card.id];
      setDisplayedText(entry?.text ?? "");
      setCorrectAnswerIsYes(entry?.isYes ?? true);
    } else {
      const correct = Math.random() < 0.5;
      if (correct) {
        setDisplayedText(card.word);
        setCorrectAnswerIsYes(true);
      } else {
        const other = tray.filter((_, i) => i !== idx);
        if (other.length === 0) {
          setDisplayedText(card.word);
          setCorrectAnswerIsYes(true);
        } else {
          const pick = other[Math.floor(Math.random() * other.length)];
          setDisplayedText(pick.word);
          setCorrectAnswerIsYes(false);
        }
      }
    }
  }
  useEffect(() => {
    prepareRoundForIndex(currentCardIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCardIndex, globalMode, mixMode, cardModeMap, sentencesMap]);

  // Navigation + keyboard
  function goToIndex(idx: number | null) {
    if (idx === null) return;
    setCurrentCardIndex(idx);
    // after first Start Game, subsequent navigation should run prep/start
    if (gameStarted) runPrepThenStart(idx);
  }
  function nextIndex() {
    if (tray.length === 0) return;
    const next = currentCardIndex === null ? 0 : (currentCardIndex + 1) % tray.length;
    goToIndex(next);
  }
  function prevIndex() {
    if (tray.length === 0) return;
    const prev = currentCardIndex === null ? tray.length - 1 : (currentCardIndex - 1 + tray.length) % tray.length;
    goToIndex(prev);
  }
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") nextIndex();
      if (e.key === "ArrowLeft") prevIndex();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCardIndex, tray.length, gameStarted]);

  // Prep & start sequence
  const runPrepThenStart = async (idx: number | null) => {
    if (idx === null) return;
    setRoundPhase("prepping");
    const tick = window.setInterval(() => playTone(1400, 0.02, "square", 0.03), 160);
    await new Promise((r) => setTimeout(r, 900));
    await new Promise((r) => setTimeout(r, 600));
    clearInterval(tick);
    setRoundPhase("timing");
    startTimer();
  };

  // Popups state
  const [popScoreValue, setPopScoreValue] = useState<number | null>(null);
  const [popScoreVisible, setPopScoreVisible] = useState(false);
  const [popScoreType, setPopScoreType] = useState<"points" | "zero" | null>(null);

  // Answer handling
  const popupTimeoutRef = useRef<number | null>(null);
  function clearPopupTimeout() {
    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
      popupTimeoutRef.current = null;
    }
  }

  async function handleYesNo(yes: boolean) {
    if (roundPhase !== "timing") return;
    stopTimer();
    setRoundPhase("feedback");
    if (yes) playYesJingle(); else playNoJingle();

    const correct = yes === correctAnswerIsYes;
    if (correct) {
      // random points 1..3
      const points = 1 + Math.floor(Math.random() * 3);
      setPopScoreValue(points);
      setPopScoreType("points");
      setPopScoreVisible(true);
      playCorrectSound();

      // Keep popup for 3s, then apply points and advance
      clearPopupTimeout();
      popupTimeoutRef.current = window.setTimeout(() => {
        adjustScore(teams[activeTeamIndex].id, points);
        setPopScoreVisible(false);
        setPopScoreValue(null);
        setPopScoreType(null);
        popupTimeoutRef.current = null;
        advanceAfterAnswer();
      }, 3000);
    } else {
      // incorrect: show red "Sorry — 0 points" for 3s then advance
      setPopScoreValue(0);
      setPopScoreType("zero");
      setPopScoreVisible(true);
      playIncorrectSound();

      clearPopupTimeout();
      popupTimeoutRef.current = window.setTimeout(() => {
        setPopScoreVisible(false);
        setPopScoreValue(null);
        setPopScoreType(null);
        popupTimeoutRef.current = null;
        advanceAfterAnswer();
      }, 3000);
    }

    // mark used
    if (currentCardIndex !== null && !usedIndices.includes(currentCardIndex)) {
      setUsedIndices((u) => [...u, currentCardIndex]);
    }
  }

  function advanceAfterAnswer() {
    setActiveTeamIndex((i) => (i + 1) % teams.length);
    const nextUnused = pickRandomCardIndex(true);
    if (nextUnused === null) {
      setCurrentCardIndex(null);
      setRoundPhase("hidden");
    } else {
      // navigation will run prep/start if gameStarted is true
      goToIndex(nextUnused);
    }
  }

  // Winner detection
  const allUsed = tray.length > 0 && usedIndices.length >= tray.length;
  const [winnerOpen, setWinnerOpen] = useState(false);
  const [winnerTeam, setWinnerTeam] = useState<Team | null>(null);
  useEffect(() => {
    if (allUsed) {
      const winner = teams.reduce((best, t) => (t.score > best.score ? t : best), teams[0]);
      setWinnerTeam(winner);
      setWinnerOpen(true);
      playCorrectSound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allUsed]);

  // Reset game
  function resetGame(fullResetScores = false) {
    setUsedIndices([]);
    setCardModeMap({});
    setMixMode(false);
    setRoundPhase("hidden");
    stopTimer();
    setSentencesModalOpen(true);
    setModalFinishedTickVisible(false);
    setWinnerOpen(false);
    setWinnerTeam(null);
    setGameStarted(false);
    const next = pickRandomCardIndex(true) ?? pickRandomCardIndex();
    setCurrentCardIndex(next);
    if (fullResetScores) resetScores();
  }

  // Modal "Finished" behavior: teacher closes manually; requires all filled
  function handleModalFinished() {
    const allFilled = tray.length > 0 && tray.every((c) => (sentencesMap[c.id] && sentencesMap[c.id].text.trim().length > 0));
    if (!allFilled) {
      // could show a subtle message; for now focus first empty
      const firstEmpty = tray.find((c) => !sentencesMap[c.id] || sentencesMap[c.id].text.trim().length === 0);
      if (firstEmpty) {
        const el = document.querySelector(`[data-card-id="${firstEmpty.id}"] textarea`) as HTMLTextAreaElement | null;
        if (el) el.focus();
      }
      return;
    }
    // show big green tick then close modal
    setModalFinishedTickVisible(true);
    setTimeout(() => {
      setModalFinishedTickVisible(false);
      setSentencesModalOpen(false);
      // pick first card but do not auto-start; Start Game button will be shown
      const next = pickRandomCardIndex(true) ?? pickRandomCardIndex();
      if (next !== null) setCurrentCardIndex(next);
    }, 900);
  }

  // Start Game button handler (starts first card)
  function handleStartGameClick() {
    if (currentCardIndex === null) return;
    setGameStarted(true);
    runPrepThenStart(currentCardIndex);
  }

  // Start initial card when modal closed: only set currentCardIndex (done in handleModalFinished)
  useEffect(() => {
    // If modal was closed through other means and there's no current card, select one
    if (!sentencesModalOpen && currentCardIndex === null && tray.length > 0) {
      const next = pickRandomCardIndex(true) ?? pickRandomCardIndex();
      if (next !== null) setCurrentCardIndex(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentencesModalOpen]);

  // Mix toggle
  function toggleMix() {
    setMixMode((m) => {
      const will = !m;
      if (will) {
        const map: Record<number, Mode> = {};
        tray.forEach((_, i) => {
          map[i] = Math.random() < 0.5 ? "sentence" : "vocab";
        });
        setCardModeMap(map);
      } else {
        setCardModeMap({});
      }
      return will;
    });
  }

  // Edge: no cards
  if (!tray || tray.length === 0) {
    return (
      <div className="min-h-screen bg-[hsl(140,40%,95%)] flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-bold mb-4">Yes or No</h1>
        <p className="text-lg text-gray-700 mb-6">No cards found in your lesson tray.</p>
        <div className="flex gap-3">
          <button onClick={() => (window.location.href = "/flashcards")} className="btn btn-primary px-3 py-1">Go to Flashcards</button>
          <button onClick={() => (window.location.href = "/dashboard")} className="btn btn-secondary px-3 py-1">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  const remainingCount = Math.max(0, tray.length - usedIndices.length);

  // UI
  return (
    <div className="min-h-screen bg-[hsl(140,40%,95%)] text-black">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="text-2xl font-extrabold text-blue-600">ClassBloom</a>
          <div className="text-xl font-bold">Yes or No</div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="btn btn-secondary p-2"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
            <button onClick={() => router.push("/games")} className="btn btn-secondary px-3 py-1 flex items-center gap-2">
              <Play size={14} /> Exit
            </button>
          </div>
        </div>
      </header>

      {/* Scoreboard */}
      <div className="pt-[72px] max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">Scoreboard</h2>
            <div className="text-sm text-gray-600">Teams</div>

            <div className="flex items-center gap-1 ml-3">
              <button onClick={addTeam} disabled={teams.length >= 6} className="btn btn-secondary p-1.5 text-sm">+</button>
              <button onClick={() => setTeams((s) => s.slice(0, Math.max(2, s.length - 1)))} disabled={teams.length <= 2} className="btn btn-secondary p-1.5 text-sm">−</button>
              <button onClick={resetScores} className="btn btn-secondary p-1.5 text-sm">Reset scores</button>
              <button onClick={() => resetGame(true)} className="btn btn-secondary p-1.5 text-sm">Reset game</button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2 py-1 rounded-md border bg-white text-sm">
              <div className="text-xs text-gray-500">Active</div>
              <div className="font-semibold">{teams[activeTeamIndex]?.name}</div>
              <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse ml-2" />
            </div>

            {/* Timer selector */}
            <div className="flex items-center gap-2 px-2 py-1 rounded-md border bg-white text-sm">
              <div className="text-xs text-gray-500 mr-2">Timer</div>
              <div className="flex gap-1">
                {TIMER_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTurnLength(t)}
                    className={`px-2 py-0.5 text-xs rounded ${turnLength === t ? "bg-[var(--color-accent)] text-white" : "bg-transparent"}`}
                  >
                    {t}s
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => toggleMusic()} className={`btn px-3 py-1 ${musicOn ? "btn-primary" : "btn-secondary"}`}>
              {musicOn ? "Music: On" : "Music: Off"}
            </button>
          </div>
        </div>

        {/* Team boxes */}
        <div className="mb-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {teams.map((team, idx) => {
            const isActive = idx === activeTeamIndex;
            return (
              <div key={team.id} className={`p-2 rounded-md border flex items-center justify-between transition-transform ${isActive ? "scale-105 ring-2 ring-[var(--color-accent)]" : "bg-white"}`}>
                <div>
                  <div className="text-sm font-semibold">{team.name}</div>
                </div>
                <div className="text-xl font-bold w-12 text-center">{team.score}</div>
              </div>
            );
          })}
        </div>

        {/* Mode controls */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => { setGlobalMode("sentence"); setMixMode(false); }}
            className={`btn px-3 py-1 ${globalMode === "sentence" && !mixMode ? "btn-primary animate-pulse" : "btn-secondary"}`}
          >
            Sentence
          </button>

          <button
            onClick={() => { setGlobalMode("vocab"); setMixMode(false); }}
            className={`btn px-3 py-1 ${globalMode === "vocab" && !mixMode ? "btn-primary animate-pulse" : "btn-secondary"}`}
          >
            Vocabulary
          </button>

          <button
            onClick={toggleMix}
            className={`btn px-3 py-1 ${mixMode ? "btn-primary animate-pulse" : "btn-secondary"}`}
          >
            Mix
          </button>
        </div>
      </div>

      {/* Main game grid */}
      <main className="max-w-7xl mx-auto px-4 pb-20" style={{ minHeight: "calc(100vh - 260px)" }}>
        <div className="flex justify-center items-start">
          <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl p-6 flex flex-col items-center">

            {/* Timer badge centered above picture */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2">
              <div className="bg-white border shadow px-6 py-3 rounded-full text-2xl font-bold">
                {roundPhase === "timing" && timerSeconds !== null ? `${timerSeconds}s` : "Ready"}
              </div>
            </div>

            {/* Left arrow */}
            <button
              onClick={prevIndex}
              aria-label="Previous"
              className="btn btn-secondary absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center shadow"
            >
              ◀
            </button>

            {/* Right arrow */}
            <button
              onClick={nextIndex}
              aria-label="Next"
              className="btn btn-secondary absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center shadow"
            >
              ▶
            </button>

            {/* Image - wider not taller */}
            <div className="w-full bg-white rounded-xl overflow-hidden shadow-inner flex items-center justify-center" style={{ height: 420 }}>
              {currentCardIndex !== null && tray[currentCardIndex] ? (
                tray[currentCardIndex].image ? (
                  <img src={tray[currentCardIndex].image} alt={tray[currentCardIndex].word} className="object-contain w-11/12 h-full" />
                ) : (
                  <div className="text-3xl text-gray-400">No image</div>
                )
              ) : (
                <div className="text-2xl text-gray-500">No card</div>
              )}
            </div>

            {/* Prep overlay */}
            {roundPhase === "prepping" && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/30 rounded-2xl p-6 text-center text-white">
                  <div className="text-5xl font-bold mb-2 animate-bounce">Get Ready</div>
                </div>
              </div>
            )}

            {/* Text (revealed when timing or feedback) */}
            <div className="mt-6 text-4xl md:text-5xl font-extrabold text-center min-h-[4.5rem]">
              {(roundPhase === "timing" || roundPhase === "feedback") ? displayedText : "—"}
            </div>

            {/* Start Game button (visible when modal closed and not started) */}
            {!gameStarted && !sentencesModalOpen && currentCardIndex !== null && (
              <div className="mt-6">
                <button onClick={handleStartGameClick} className="btn btn-primary px-6 py-3 text-lg shadow">Start Game</button>
              </div>
            )}

            {/* Yes / No */}
            <div className="mt-8 flex items-center gap-10">
              <button
                onClick={() => handleYesNo(true)}
                disabled={roundPhase !== "timing"}
                className={`btn btn-primary px-12 py-4 text-2xl font-bold shadow-lg transform transition-all ${
                  roundPhase !== "timing" ? "opacity-60 cursor-not-allowed" : "hover:scale-105 active:scale-95"
                }`}
              >
                Yes
              </button>

              <button
                onClick={() => handleYesNo(false)}
                disabled={roundPhase !== "timing"}
                className={`btn btn-secondary px-12 py-4 text-2xl font-bold shadow-lg transform transition-all ${
                  roundPhase !== "timing" ? "opacity-60 cursor-not-allowed" : "hover:scale-105 active:scale-95"
                }`}
              >
                No
              </button>
            </div>

            <div className="mt-6 text-lg text-gray-700">Cards remaining: {remainingCount}</div>
          </div>
        </div>
      </main>

      {/* Popups (correct/incorrect) */}
      {popScoreVisible && popScoreType === "points" && popScoreValue !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white/95 rounded-xl p-8 shadow-2xl">
            <div className="text-6xl font-extrabold text-green-600 pop-animate">+{popScoreValue}</div>
          </div>
        </div>
      )}
      {popScoreVisible && popScoreType === "zero" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white/95 rounded-xl p-8 shadow-2xl">
            <div className="text-4xl font-extrabold text-red-600 pop-animate">Sorry 0 points</div>
          </div>
        </div>
      )}

      {/* Sentences modal */}
      {sentencesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div ref={modalRef} className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 overflow-auto max-h-[80vh]" tabIndex={-1}>
            <h3 className="text-2xl font-bold mb-4">Enter sentences for each card</h3>
            <p className="text-sm text-gray-600 mb-4">Write the sentence that will appear for each card in Sentence mode and mark whether it is correct (Yes) or incorrect (No). Click "Finished" when done.</p>

            <div className="grid grid-cols-1 gap-4">
              {tray.map((c) => (
                <div key={c.id} data-card-id={c.id} className="flex gap-3 items-start p-3 border rounded">
                  <div className="w-28 h-24 bg-gray-100 flex items-center justify-center rounded overflow-hidden">
                    {c.image ? <img src={c.image} alt={c.word} className="object-cover w-full h-full" /> : <div className="text-sm text-gray-400">No image</div>}
                  </div>

                  <div className="flex-1">
                    <div className="text-sm font-semibold mb-1">{c.word}</div>
                    <textarea
                      value={sentencesMap[c.id]?.text ?? ""}
                      onChange={(e) => {
                        const text = e.target.value;
                        setSentencesMap((m) => ({ ...m, [c.id]: { text, isYes: m[c.id]?.isYes ?? true } }));
                      }}
                      placeholder="Enter sentence for this card..."
                      className="w-full border rounded p-2 text-sm"
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <div className="text-sm mr-2">Correct?</div>

                      {/* Modal Yes button with hover & click animations */}
                      <button
                        onClick={() => setSentencesMap((m) => ({ ...m, [c.id]: { text: m[c.id]?.text ?? "", isYes: true } }))}
                        className={`px-3 py-1 rounded transition transform ${sentencesMap[c.id]?.isYes ? "bg-[var(--color-primary)] text-white scale-105 shadow" : "bg-white border hover:scale-105"}`}
                        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                        onMouseUp={(e) => (e.currentTarget.style.transform = "")}
                      >
                        Yes
                      </button>

                      {/* Modal No button with hover & click animations */}
                      <button
                        onClick={() => setSentencesMap((m) => ({ ...m, [c.id]: { text: m[c.id]?.text ?? "", isYes: false } }))}
                        className={`px-3 py-1 rounded transition transform ${sentencesMap[c.id] && !sentencesMap[c.id].isYes ? "bg-red-500 text-white scale-105 shadow" : "bg-white border hover:scale-105"}`}
                        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                        onMouseUp={(e) => (e.currentTarget.style.transform = "")}
                      >
                        No
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2 items-center">
              {/* Finished button */}
              <button
                onClick={handleModalFinished}
                className="px-4 py-2 rounded bg-green-600 text-white shadow"
              >
                Finished
              </button>

              {/* Optional manual close (keeps modal open only if teacher wants) */}
              <button
                onClick={() => setSentencesModalOpen(false)}
                className="px-4 py-2 rounded bg-white border"
              >
                Close
              </button>
            </div>

            {/* Large green tick overlay when Finished is clicked */}
            {modalFinishedTickVisible && (
              <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                <div className="rounded-full bg-white/90 p-8 shadow-2xl">
                  <div className="text-8xl text-green-600">✔</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Winner modal */}
      {winnerOpen && winnerTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-8 shadow-xl text-center max-w-md w-full">
            <h2 className="text-3xl font-extrabold">🎉 Winner!</h2>
            <p className="mt-3 text-xl">{winnerTeam.name} wins with {winnerTeam.score} points</p>
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={() => { setWinnerOpen(false); router.push("/games"); }} className="btn btn-secondary px-3 py-1">Return to Games</button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        :root { --color-primary: #2563eb; }

        @keyframes pop {
          0% { transform: scale(0.7); opacity: 0; }
          50% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .pop-animate {
          animation: pop 900ms ease both;
        }

        .animate-pulse {
          animation: pulse 1200ms infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.03); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
