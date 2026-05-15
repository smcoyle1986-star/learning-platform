"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GameHeader from "@/components/games/GameHeader";
import { GameSettingsDropdown } from "@/components/games/GameSettingsSurface";
import { resolveLessonImageUrl } from "@/lib/lessons/image";
import { supabase } from "@/lib/supabase/client";
import { trackGameStart } from "@/lib/games/track-game-start";
import {
  deleteYesNoPromptSet,
  loadYesNoPromptSets,
  saveYesNoPromptSet,
  type YesNoPromptRow,
  type YesNoPromptSetRecord,
  type YesNoPromptSetScope,
} from "@/lib/games/yes-or-no/repository";

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
          image: resolveLessonImageUrl(c.image ?? c.image_id ?? c.img),
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
  function removeTeam() {
    setTeams((s) => {
      if (s.length <= 1) return s;
      const next = s.slice(0, -1);
      return next;
    });
    setActiveTeamIndex((i) => (i > 0 ? i - 1 : 0));
  }
  function resetScores() {
    setTeams((s) => s.map((t) => ({ ...t, score: 0 })));
  }
  function adjustScore(id: string, delta: number) {
    setTeams((s) => s.map((t) => (t.id === id ? { ...t, score: Math.max(0, t.score + delta) } : t)));
  }
  function resetGameState(fullResetScores = false) {
    setUsedIndices([]);
    setCardModeMap({});
    setMixMode(false);
    setRoundPhase("hidden");
    stopTimer();
    setSentencesModalOpen(true);
    setSentencesModalView("edit");
    setModalFinishedTickVisible(false);
    setWinnerOpen(false);
    setWinnerTeam(null);
    setGameStarted(false);
    const next = pickRandomCardIndex(true) ?? pickRandomCardIndex();
    setCurrentCardIndex(next);
    if (fullResetScores) resetScores();
  }

  // Modes & mix
  type Mode = "sentence" | "vocab";
  const [globalMode, setGlobalMode] = useState<Mode>("sentence");
  const [mixMode, setMixMode] = useState(false);
  const [cardModeMap, setCardModeMap] = useState<Record<number, Mode>>({});

  // Teacher-provided sentences modal
  const [sentencesMap, setSentencesMap] = useState<Record<string, { text: string; isYes: boolean }>>({});
  const [sentencesModalOpen, setSentencesModalOpen] = useState(false);
  const [sentencesModalView, setSentencesModalView] = useState<"edit" | "saved">("edit");
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [modalFinishedTickVisible, setModalFinishedTickVisible] = useState(false);
  const [promptSetName, setPromptSetName] = useState("Yes/No Set");
  const [promptSetId, setPromptSetId] = useState<string | null>(null);
  const [savedPromptSets, setSavedPromptSets] = useState<YesNoPromptSetRecord[]>([]);
  const [savedPromptSetsLoading, setSavedPromptSetsLoading] = useState(false);
  const [savedPromptSetsError, setSavedPromptSetsError] = useState<string | null>(null);
  const [savingPromptSet, setSavingPromptSet] = useState(false);
  const [deletingPromptSetId, setDeletingPromptSetId] = useState<string | null>(null);
  const [previewPromptSet, setPreviewPromptSet] = useState<YesNoPromptSetRecord | null>(null);
  const [savedPromptSetsScope, setSavedPromptSetsScope] = useState<YesNoPromptSetScope>("own");
  const [pendingDeletePromptSet, setPendingDeletePromptSet] = useState<YesNoPromptSetRecord | null>(null);

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

  function rowsFromCurrentTray() {
    return tray.map((card) => {
      const current = sentencesMap[card.id];
      return {
        cardId: card.id,
        text: current?.text ?? "",
        isYes: current?.isYes ?? true,
        word: card.word,
        image: card.image ?? null,
      } satisfies YesNoPromptRow;
    });
  }

  function applySavedPromptSet(set: YesNoPromptSetRecord) {
    setPromptSetId(set.id);
    setPromptSetName(set.name || "Yes/No Set");
    setSentencesMap((prev) => {
      const next = { ...prev };
      tray.forEach((card) => {
        const match = set.rows.find((row) => row.cardId === card.id);
        next[card.id] = {
          text: match?.text ?? "",
          isYes: match?.isYes ?? true,
        };
      });
      return next;
    });
  }

  async function loadSavedPromptSetsForUser(scope: YesNoPromptSetScope = savedPromptSetsScope) {
    setSavedPromptSetsLoading(true);
    setSavedPromptSetsError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setSavedPromptSets([]);
        setSavedPromptSetsError("You need to be signed in to view saved sets.");
        return;
      }
      const sets = await loadYesNoPromptSets(supabase, user.id, scope);
      setSavedPromptSets(sets);
    } catch (error) {
      console.error("Failed to load saved Yes/No sets", error);
      setSavedPromptSetsError("Could not load saved sets right now.");
    } finally {
      setSavedPromptSetsLoading(false);
    }
  }

  useEffect(() => {
    if (!sentencesModalOpen) return;
    if (sentencesModalView !== "saved") return;
    void loadSavedPromptSetsForUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sentencesModalOpen, sentencesModalView, savedPromptSetsScope]);

  async function handleSavePromptSet() {
    setSavingPromptSet(true);
    setSavedPromptSetsError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setSavedPromptSetsError("Sign in to save a set.");
        return;
      }
      const saved = await saveYesNoPromptSet(supabase, {
        promptSetId,
        userId: user.id,
        name: promptSetName || "Yes/No Set",
        rows: rowsFromCurrentTray(),
      });
      setPromptSetId(saved.id);
      setPromptSetName(saved.name);
      setSavedPromptSetsScope("own");
      setSavedPromptSets((prev) => {
        const next = [saved, ...prev.filter((item) => item.id !== saved.id)];
        return next.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
      });
      setSentencesModalView("saved");
    } catch (error) {
      console.error("Failed to save Yes/No set", error);
      setSavedPromptSetsError("Could not save that set.");
    } finally {
      setSavingPromptSet(false);
    }
  }

  async function handleLoadSavedPromptSet(set: YesNoPromptSetRecord) {
    applySavedPromptSet(set);
    setSentencesModalView("edit");
  }

  function openPreviewPromptSet(set: YesNoPromptSetRecord) {
    setPreviewPromptSet(set);
  }

  function closePreviewPromptSet() {
    setPreviewPromptSet(null);
  }

  async function handleDeleteSavedPromptSet(setId: string) {
    setDeletingPromptSetId(setId);
    setSavedPromptSetsError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setSavedPromptSetsError("Sign in to delete saved sets.");
        return;
      }
      await deleteYesNoPromptSet(supabase, setId, user.id);
      setSavedPromptSets((prev) => prev.filter((item) => item.id !== setId));
      if (promptSetId === setId) {
        setPromptSetId(null);
        setPromptSetName("Yes/No Set");
      }
    } catch (error) {
      console.error("Failed to delete Yes/No set", error);
      setSavedPromptSetsError("Could not delete that set.");
    } finally {
      setDeletingPromptSetId(null);
    }
  }

  function confirmDeletePromptSet(set: YesNoPromptSetRecord) {
    setPendingDeletePromptSet(set);
  }

  function cancelDeletePromptSet() {
    setPendingDeletePromptSet(null);
  }

  async function runDeletePromptSet(set: YesNoPromptSetRecord) {
    setPendingDeletePromptSet(null);
    await handleDeleteSavedPromptSet(set.id);
  }

  // Round state
  const [displayedText, setDisplayedText] = useState<string>("");
  const [correctAnswerIsYes, setCorrectAnswerIsYes] = useState<boolean>(true);
  const [roundPhase, setRoundPhase] = useState<"prepping" | "hidden" | "timing" | "feedback">("hidden");

  // Timer
  const TIMER_OPTIONS = [10, 15, 20, 30] as const;
  const [turnLength, setTurnLength] = useState<number>(10);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const roundEndHandledRef = useRef(false);

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
      if (!roundEndHandledRef.current) {
        roundEndHandledRef.current = true;
        void handleYesNo(false);
      }
      return;
    }
    const id = window.setTimeout(() => setTimerSeconds((s) => (s !== null ? s - 1 : s)), 1000);
    timerRef.current = id;
    return () => clearTimeout(id);
  }, [roundPhase, timerSeconds, turnLength]);

  function startTimer() {
    roundEndHandledRef.current = false;
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

  function resetForNextCard(nextCardIndex: number | null) {
    stopTimer();
    clearPointsSpinnerTimers();
    setShowPointsPrompt(false);
    setShowPointsSpinner(false);
    setAwardedPoints(null);
    setShowNoPoints(false);
    setGameStarted(false);
    setRoundPhase("hidden");
    setCurrentCardIndex(nextCardIndex);
    roundEndHandledRef.current = false;
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
    setGameStarted(false);
    setRoundPhase("hidden");
    stopTimer();
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

  // Score spinner state
  const [showPointsPrompt, setShowPointsPrompt] = useState(false);
  const [showPointsSpinner, setShowPointsSpinner] = useState(false);
  const [spinningPoints, setSpinningPoints] = useState(1);
  const [awardedPoints, setAwardedPoints] = useState<number | null>(null);
  const [showNoPoints, setShowNoPoints] = useState(false);
  const pointsSpinIntervalRef = useRef<number | null>(null);
  const pointsSpinTimeoutRef = useRef<number | null>(null);
  const pointsAwardTimeoutRef = useRef<number | null>(null);
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
      playCorrectSound();
      setShowPointsPrompt(true);
      setShowPointsSpinner(false);
      setAwardedPoints(null);
      clearPointsSpinnerTimers();
    } else {
      // incorrect: show red "Sorry — 0 points" for 3s then advance
      setShowNoPoints(true);
      playIncorrectSound();

      clearPopupTimeout();
      popupTimeoutRef.current = window.setTimeout(() => {
        advanceAfterRound();
      }, 1500);
    }

    // mark used
    if (currentCardIndex !== null && !usedIndices.includes(currentCardIndex)) {
      setUsedIndices((u) => [...u, currentCardIndex]);
    }
  }

  function advanceAfterRound() {
    clearPointsSpinnerTimers();
    if (popupTimeoutRef.current) {
      clearTimeout(popupTimeoutRef.current);
      popupTimeoutRef.current = null;
    }
    setShowPointsPrompt(false);
    setShowPointsSpinner(false);
    setAwardedPoints(null);
    setShowNoPoints(false);
    setActiveTeamIndex((i) => (i + 1) % teams.length);
    const nextUnused = pickRandomCardIndex(true);
    if (nextUnused === null) {
      resetForNextCard(null);
    } else {
      resetForNextCard(nextUnused);
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
    trackGameStart("yes-or-no");
    setGameStarted(true);
    runPrepThenStart(currentCardIndex);
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
        adjustScore(teams[scoringTeamIndex].id, finalPoints);
        playTone(780, 0.16, "triangle", 0.08);

        window.setTimeout(() => {
          advanceAfterRound();
        }, 650);
      }, 1500);
    }, 4000);
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
  const currentCard = currentCardIndex !== null ? tray[currentCardIndex] : null;
  const canAnswer = roundPhase === "timing";
  const timerLabel = roundPhase === "timing" && timerSeconds !== null ? `${timerSeconds}s` : "Ready";
  const showPrompt = roundPhase === "timing" || (roundPhase === "feedback" && !showPointsPrompt && !showPointsSpinner);

  // UI
  return (
    <div className="h-screen overflow-hidden bg-[hsl(140,40%,95%)] text-black">
      <GameHeader
        title="Yes or No"
        onExit={() => router.push("/games")}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((s) => !s)}
        trackGameKey="yes-or-no"
      />

      {/* Scoreboard */}
      <div className="pt-[72px] max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <h2 className="text-base md:text-lg font-semibold">Scoreboard</h2>
            <div className="text-xs md:text-sm text-gray-600">Teams</div>

          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2 py-1 rounded-md border bg-white text-sm">
              <div className="text-xs text-gray-500">Active</div>
              <div className="font-semibold">{teams[activeTeamIndex]?.name}</div>
              <div className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse ml-2" />
            </div>
          </div>
        </div>

        {/* Team boxes */}
        <div className="mb-2 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
          {teams.map((team, idx) => {
            const isActive = idx === activeTeamIndex;
            return (
              <div key={team.id} className={`p-2 rounded-md border flex items-center justify-between transition-transform ${isActive ? "scale-105 ring-2 ring-[var(--color-accent)]" : "bg-white"}`}>
                <div>
                  <div className="text-xs md:text-sm font-semibold">{team.name}</div>
                </div>
                <div className="text-lg md:text-xl font-bold w-10 md:w-12 text-center">{team.score}</div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Main game grid */}
      <main className="max-w-7xl mx-auto px-4 pb-4 h-[calc(100vh-220px)] min-h-0">
        <div className="flex justify-center items-start h-full min-h-0">
          <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl p-4 md:p-5 flex flex-col items-center overflow-hidden h-full min-h-0">
            <div className="relative w-full flex-1 min-h-0 flex flex-col items-center justify-center gap-2 py-1">
              <div className="relative w-full max-w-[1040px] flex-[1.55] min-h-0 rounded-[28px] border-2 border-slate-200 bg-[#f7faf7] shadow-inner overflow-hidden flex items-center justify-center">
                {currentCard?.image ? (
                  <img
                    src={currentCard.image}
                    alt={currentCard.word}
                    className="w-full h-full object-contain select-none"
                    draggable={false}
                  />
                ) : (
                  <div className="text-gray-400 text-xl font-semibold">No image selected</div>
                )}

                <div className="absolute top-4 right-4 z-20">
                  <div className="w-40 md:w-48 h-[58px] md:h-[62px] rounded-2xl bg-[linear-gradient(180deg,#60a5fa,#2563eb)] text-white shadow-2xl border-[8px] border-white/85 flex items-center justify-center text-center px-3">
                    <span className="text-xl md:text-2xl font-extrabold leading-none tracking-tight">{timerLabel}</span>
                  </div>
                </div>

                {roundPhase === "prepping" && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                    <div className="rounded-[32px] border border-white/20 bg-[rgba(15,23,42,0.76)] px-10 py-6 shadow-2xl text-white text-3xl md:text-4xl font-extrabold">
                      Get Ready
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full max-w-[920px] min-h-[72px] flex items-center justify-center px-4 text-center">
                <p className={`text-2xl md:text-4xl font-extrabold tracking-tight text-slate-800 transition-all duration-300 ${showPrompt ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
                  {displayedText || "—"}
                </p>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-center gap-4 pb-2 mt-auto">
              <button
                onClick={() => void handleYesNo(true)}
                disabled={!canAnswer}
                className={`w-[112px] h-[112px] md:w-[124px] md:h-[124px] rounded-full border-[8px] border-white text-white font-extrabold text-2xl md:text-3xl shadow-2xl transition-transform duration-200 ${
                  canAnswer
                    ? "bg-[linear-gradient(180deg,#6ee7a8,#16a34a)] animate-pulse ring-4 ring-white/70 ring-offset-4 ring-offset-transparent hover:scale-105 hover:shadow-[0_28px_80px_rgba(22,163,74,0.35)]"
                    : "bg-[#a7f3d0] opacity-75 cursor-not-allowed"
                }`}
                aria-label="Yes"
              >
                YES
              </button>
              <button
                onClick={() => void handleYesNo(false)}
                disabled={!canAnswer}
                className={`w-[112px] h-[112px] md:w-[124px] md:h-[124px] rounded-full border-[8px] border-white text-white font-extrabold text-2xl md:text-3xl shadow-2xl transition-transform duration-200 ${
                  canAnswer
                    ? "bg-[linear-gradient(180deg,#fca5a5,#ef4444)] animate-pulse ring-4 ring-white/70 ring-offset-4 ring-offset-transparent hover:scale-105 hover:shadow-[0_28px_80px_rgba(239,68,68,0.35)]"
                    : "bg-[#fbcaca] opacity-75 cursor-not-allowed"
                }`}
                aria-label="No"
              >
                NO
              </button>
            </div>

            {!gameStarted && !sentencesModalOpen && currentCardIndex !== null && (
              <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-auto">
                <button
                  onClick={handleStartGameClick}
                  className="w-48 h-48 rounded-full bg-[linear-gradient(180deg,#60a5fa,#2563eb)] text-white shadow-2xl border-[10px] border-white/85 flex items-center justify-center text-center px-6 hover:scale-105 hover:shadow-[0_18px_50px_rgba(37,99,235,0.35)] transition-transform"
                  title="Start"
                >
                  <span className="text-3xl font-extrabold leading-tight">Start</span>
                </button>
              </div>
            )}

            <div className="sr-only">Cards remaining: {remainingCount}</div>
          </div>
        </div>
      </main>

      {settingsOpen && (
        <div className="fixed top-[72px] right-4 z-[70]">
          <GameSettingsDropdown className="w-[420px]">
            <div className="mb-5">
              <div className="mb-2 font-semibold">Game Modes</div>
              <p className="text-sm text-[var(--color-text-muted)] mb-3">
                Choose how the current card behaves before the round starts.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setGlobalMode("sentence"); setMixMode(false); }}
                  className={`px-3 py-2 rounded-full text-sm font-semibold transition ${
                    globalMode === "sentence" && !mixMode
                      ? "bg-[var(--color-accent)] text-white shadow"
                      : "bg-white border border-black/10 text-[var(--color-text-main)] hover:shadow-md"
                  }`}
                >
                  Sentence
                </button>
                <button
                  onClick={() => { setGlobalMode("vocab"); setMixMode(false); }}
                  className={`px-3 py-2 rounded-full text-sm font-semibold transition ${
                    globalMode === "vocab" && !mixMode
                      ? "bg-[var(--color-accent)] text-white shadow"
                      : "bg-white border border-black/10 text-[var(--color-text-main)] hover:shadow-md"
                  }`}
                >
                  Vocabulary
                </button>
                <button
                  onClick={toggleMix}
                  className={`px-3 py-2 rounded-full text-sm font-semibold transition ${
                    mixMode
                      ? "bg-[var(--color-accent)] text-white shadow"
                      : "bg-white border border-black/10 text-[var(--color-text-main)] hover:shadow-md"
                  }`}
                >
                  Mix
                </button>
              </div>
              <div className="mt-3 text-sm text-[var(--color-text-muted)] space-y-1">
                <p><span className="font-semibold text-[var(--color-text-main)]">Sentence</span> uses the teacher’s sentence for each card.</p>
                <p><span className="font-semibold text-[var(--color-text-main)]">Vocabulary</span> shows the image and word. Students decide whether they match.</p>
                <p><span className="font-semibold text-[var(--color-text-main)]">Mix</span> uses a mix of sentence and vocabulary cards.</p>
              </div>
            </div>

            <div className="mb-5">
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
                <button onClick={() => resetGameState(true)} className="btn btn-secondary px-3 py-2 text-sm">
                  Reset game
                </button>
              </div>
            </div>

            <div className="mb-5">
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

            <div className="mb-5">
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

      {/* Score prompt / spinner */}
      {showNoPoints && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white/95 rounded-xl p-8 shadow-2xl">
            <div className="text-4xl font-extrabold text-red-600 pop-animate">Sorry 0 points</div>
          </div>
        </div>
      )}
      {(showPointsPrompt || showPointsSpinner) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
          {!showPointsSpinner ? (
            <button
              onClick={startPointsSpinner}
              className="w-52 h-52 rounded-full bg-[var(--color-accent)] text-white shadow-2xl border-[10px] border-white/85 flex items-center justify-center text-center px-6 hover:scale-105 hover:shadow-[0_18px_50px_rgba(37,99,235,0.35)] transition-transform"
              title="Get points"
            >
              <span className="text-3xl font-extrabold leading-tight">Get points!</span>
            </button>
          ) : (
            <div className="w-52 h-52 rounded-full bg-white/96 border-[10px] border-[var(--color-accent)] shadow-2xl flex flex-col items-center justify-center">
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

      {/* Sentences modal */}
      {sentencesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div ref={modalRef} className="relative bg-white rounded-2xl shadow-xl w-full max-w-5xl p-6 overflow-hidden max-h-[90vh]" tabIndex={-1}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h3 className="text-2xl font-bold">Enter sentences for each card</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Write the sentence that will appear for each card in Yes/No mode, mark whether it is correct, and save sets for reuse.
                </p>
              </div>
              <div className="flex rounded-full bg-gray-100 p-1">
                <button
                  onClick={() => setSentencesModalView("edit")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${sentencesModalView === "edit" ? "bg-[var(--color-primary)] text-white shadow" : "text-gray-700 hover:bg-white"}`}
                >
                  Write New
                </button>
                <button
                  onClick={() => {
                    setSentencesModalView("saved");
                    void loadSavedPromptSetsForUser();
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition ${sentencesModalView === "saved" ? "bg-[var(--color-primary)] text-white shadow" : "text-gray-700 hover:bg-white"}`}
                >
                  Saved Sets
                </button>
              </div>
            </div>

            {sentencesModalView === "edit" ? (
              <>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <label className="text-sm font-semibold text-gray-700">Set name</label>
                  <input
                    value={promptSetName}
                    onChange={(e) => setPromptSetName(e.target.value)}
                    className="min-w-[16rem] flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
                    placeholder="Name this set"
                  />
                  <button
                    onClick={() => void handleSavePromptSet()}
                    disabled={savingPromptSet}
                    className="px-4 py-2 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold shadow hover:-translate-y-0.5 transition-transform disabled:opacity-60"
                  >
                    {savingPromptSet ? "Saving..." : promptSetId ? "Update set" : "Save set"}
                  </button>
                </div>

                <div className="max-h-[62vh] overflow-auto pr-1">
                  <div className="grid grid-cols-1 gap-4">
                    {tray.map((c) => (
                      <div key={c.id} data-card-id={c.id} className="flex gap-3 items-start p-3 border rounded">
                        <div className="w-28 h-24 bg-gray-100 flex items-center justify-center rounded overflow-hidden">
                          {resolveLessonImageUrl(c.image) ? (
                            <img src={resolveLessonImageUrl(c.image)} alt={c.word} className="object-cover w-full h-full" />
                          ) : (
                            <div className="text-sm text-gray-400">No image</div>
                          )}
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
                            <button
                              onClick={() => setSentencesMap((m) => ({ ...m, [c.id]: { text: m[c.id]?.text ?? "", isYes: true } }))}
                              className={`px-3 py-1 rounded transition transform ${sentencesMap[c.id]?.isYes ? "bg-[var(--color-primary)] text-white scale-105 shadow" : "bg-white border hover:scale-105"}`}
                              onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
                              onMouseUp={(e) => (e.currentTarget.style.transform = "")}
                            >
                              Yes
                            </button>
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
                </div>

                <div className="mt-6 flex justify-end gap-2 items-center">
                  <button onClick={handleModalFinished} className="px-4 py-2 rounded bg-green-600 text-white shadow">
                    Finished
                  </button>
                  <button onClick={() => setSentencesModalOpen(false)} className="px-4 py-2 rounded bg-white border">
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="max-h-[62vh] overflow-auto pr-1">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <div className="flex rounded-full bg-gray-100 p-1">
                      <button
                        onClick={() => {
                          setSavedPromptSetsScope("own");
                          void loadSavedPromptSetsForUser("own");
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                          savedPromptSetsScope === "own"
                            ? "bg-[var(--color-accent)] text-white shadow"
                            : "text-gray-700 hover:bg-white"
                        }`}
                      >
                        My sets
                      </button>
                      <button
                        onClick={() => {
                          setSavedPromptSetsScope("others");
                          void loadSavedPromptSetsForUser("others");
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                          savedPromptSetsScope === "others"
                            ? "bg-[var(--color-accent)] text-white shadow"
                            : "text-gray-700 hover:bg-white"
                        }`}
                      >
                        Public sets
                      </button>
                    </div>
                    <button
                      onClick={() => void loadSavedPromptSetsForUser()}
                      className="px-4 py-2 rounded-full bg-white border border-gray-200 text-sm font-semibold hover:-translate-y-0.5 transition-transform"
                    >
                      Refresh
                    </button>
                  </div>

                  {savedPromptSetsError && (
                    <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                      {savedPromptSetsError}
                    </div>
                  )}

                  {savedPromptSetsLoading ? (
                    <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
                      Loading saved sets...
                    </div>
                  ) : savedPromptSets.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
                      {savedPromptSetsScope === "own"
                        ? "No saved sets yet. Switch to Write New and save one for reuse."
                        : "No sets from other teachers yet."}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {savedPromptSets.map((set) => (
                        <div key={set.id} className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3">
                          <div>
                            <div className="font-semibold text-gray-800">{set.name}</div>
                            <div className="text-xs text-gray-500">
                              {savedPromptSetsScope === "own" ? "Your set" : "Another teacher's set"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {set.rows.length} rows • updated {new Date(set.updatedAt).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openPreviewPromptSet(set)}
                              className="px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-700 text-sm font-semibold hover:-translate-y-0.5 transition-transform"
                            >
                              Preview
                            </button>
                            <button
                              onClick={() => void handleLoadSavedPromptSet(set)}
                              className="px-4 py-2 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold shadow hover:-translate-y-0.5 transition-transform"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => confirmDeletePromptSet(set)}
                              disabled={deletingPromptSetId === set.id}
                              className="px-4 py-2 rounded-full bg-white border border-red-200 text-red-600 text-sm font-semibold hover:-translate-y-0.5 transition-transform disabled:opacity-60"
                            >
                              {deletingPromptSetId === set.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-2 items-center">
                  <button onClick={() => setSentencesModalOpen(false)} className="px-4 py-2 rounded bg-white border">
                    Close
                  </button>
                </div>
              </>
            )}

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

      {previewPromptSet && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-6xl rounded-3xl bg-white shadow-2xl max-h-[92vh] overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{previewPromptSet.name}</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Preview of the saved Yes/No set. Images, sentences, and answers are shown read-only.
                </p>
              </div>
              <button
                onClick={closePreviewPromptSet}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:-translate-y-0.5 transition-transform"
              >
                Close
              </button>
            </div>

            <div className="max-h-[calc(92vh-92px)] overflow-auto px-6 py-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {previewPromptSet.rows.map((row, index) => (
                  <div
                    key={`${row.cardId}-${index}`}
                    className="rounded-2xl border border-gray-200 bg-[#f9fafb] p-4 shadow-sm"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                        {row.image ? (
                          <img src={row.image} alt={row.word} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                            No image
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-gray-500">Card {index + 1}</div>
                          <div
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              row.isYes ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                            }`}
                          >
                            {row.isYes ? "Yes" : "No"}
                          </div>
                        </div>

                        <div className="mt-2 text-lg font-bold text-gray-900">{row.word}</div>
                        <div className="mt-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800">
                          {row.text || "No sentence saved for this card."}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingDeletePromptSet && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-6">
            <h3 className="text-2xl font-bold text-gray-900">Delete saved set?</h3>
            <p className="mt-3 text-sm text-gray-600">
              This will permanently delete <span className="font-semibold text-gray-900">{pendingDeletePromptSet.name}</span>.
              This cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={cancelDeletePromptSet}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:-translate-y-0.5 transition-transform"
              >
                Cancel
              </button>
              <button
                onClick={() => void runDeletePromptSet(pendingDeletePromptSet)}
                className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:-translate-y-0.5 transition-transform"
              >
                Delete set
              </button>
            </div>
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
