"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import GameHeader from "@/components/games/GameHeader";
import { GameSettingsDropdown } from "@/components/games/GameSettingsSurface";
import { GameWinnerModal } from "@/components/games/GameWinnerModal";
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

type PlayMode = "team" | "classroom-sides";

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
  const isChooseYourSide = usePathname() === "/games/choose-your-side";
  const gameTitle = isChooseYourSide ? "Choose Your Side" : "Yes or No";
  const gameKey = isChooseYourSide ? "choose-your-side" : "yes-or-no";

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
  const [trayLoaded, setTrayLoaded] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LESSON_TRAY_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((rawCard): GameCard => {
            const card = (rawCard ?? {}) as Record<string, unknown>;
            const rawImage = [card.image, card.image_id, card.img].find(
              (value): value is string => typeof value === "string"
            );
            return {
              id: String(card.id ?? card.word ?? Math.random().toString(36).slice(2)),
              word: String(card.word ?? card.text ?? ""),
              image: resolveLessonImageUrl(rawImage),
            };
          });
          setTray(normalized);
        }
      }
    } catch (e) {
      console.error("Failed to load lesson tray", e);
    } finally {
      setTrayLoaded(true);
    }
  }, []);

  // Teams / Scoreboard
  const playMode: PlayMode = isChooseYourSide ? "classroom-sides" : "team";
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
  const [promptSetName, setPromptSetName] = useState("Activity Set");
  const [promptSetId, setPromptSetId] = useState<string | null>(null);
  const [promptSetIsPublic, setPromptSetIsPublic] = useState(true);
  const [savePromptModalOpen, setSavePromptModalOpen] = useState(false);
  const [savePromptName, setSavePromptName] = useState("Activity Set");
  const [savePromptNameError, setSavePromptNameError] = useState<string | null>(null);
  const [savedPromptSets, setSavedPromptSets] = useState<YesNoPromptSetRecord[]>([]);
  const [savedPromptSetsLoading, setSavedPromptSetsLoading] = useState(false);
  const [savedPromptSetsError, setSavedPromptSetsError] = useState<string | null>(null);
  const [savingPromptSet, setSavingPromptSet] = useState(false);
  const [deletingPromptSetId, setDeletingPromptSetId] = useState<string | null>(null);
  const [previewPromptSet, setPreviewPromptSet] = useState<YesNoPromptSetRecord | null>(null);
  const [savedPromptSetsScope, setSavedPromptSetsScope] = useState<YesNoPromptSetScope>("own");
  const [pendingDeletePromptSet, setPendingDeletePromptSet] = useState<YesNoPromptSetRecord | null>(null);
  const [pendingLoadPromptSet, setPendingLoadPromptSet] = useState<{
    set: YesNoPromptSetRecord;
    preserveSavedId: boolean;
  } | null>(null);

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

  // Initialize once after localStorage has been checked. With no lesson tray,
  // Saved Sets is the useful entry point for this game.
  const initialModalOpenedRef = useRef(false);
  useEffect(() => {
    if (!trayLoaded || initialModalOpenedRef.current) return;
    initialModalOpenedRef.current = true;
    if (tray.length > 0) {
      setSentencesMap((prev) => {
        const next = { ...prev };
        tray.forEach((c) => {
          if (!next[c.id]) next[c.id] = { text: "", isYes: true };
        });
        return next;
      });
      setSentencesModalView("edit");
    } else {
      setSentencesModalView("saved");
    }
    setSentencesModalOpen(true);
  }, [tray, trayLoaded]);

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

  function cardsFromPromptSet(set: YesNoPromptSetRecord) {
    const seen = new Set<string>();
    return set.rows.reduce<GameCard[]>((cards, row) => {
      if (!row.cardId || seen.has(row.cardId)) return cards;
      seen.add(row.cardId);
      cards.push({
        id: row.cardId,
        word: row.word,
        image: resolveLessonImageUrl(row.image),
      });
      return cards;
    }, []);
  }

  function hasDifferentCards(nextCards: GameCard[]) {
    return tray.map((card) => card.id).join("|") !== nextCards.map((card) => card.id).join("|");
  }

  function applySavedPromptSet(set: YesNoPromptSetRecord, preserveSavedId: boolean) {
    const nextTray = cardsFromPromptSet(set);
    if (nextTray.length === 0) {
      setSavedPromptSetsError("This saved set has no cards to load.");
      return;
    }

    setTray(nextTray);
    localStorage.setItem(LESSON_TRAY_KEY, JSON.stringify(nextTray));
    setPromptSetId(preserveSavedId ? set.id : null);
    setPromptSetName(set.name || "Activity Set");
    setPromptSetIsPublic(preserveSavedId ? set.isPublic : true);
    setSentencesMap(Object.fromEntries(set.rows.map((row) => [row.cardId, {
      text: row.text,
      isYes: row.isYes,
    }])));
    setUsedIndices([]);
    setCurrentCardIndex(null);
    setGameStarted(false);
    setRoundPhase("hidden");
    stopTimer();
    setPreviewPromptSet(null);
    setPendingLoadPromptSet(null);
    setSavedPromptSetsError(null);
    setSentencesModalView("edit");
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

  function openSavePromptModal() {
    setSavePromptName(promptSetName || "Activity Set");
    setSavePromptNameError(null);
    setSavePromptModalOpen(true);
  }

  async function handleSavePromptSet() {
    const trimmedName = savePromptName.trim();
    if (!trimmedName) {
      setSavePromptNameError("Enter a name for this set.");
      return;
    }
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
        name: trimmedName,
        isPublic: promptSetIsPublic,
        rows: rowsFromCurrentTray(),
      });
      setPromptSetId(saved.id);
      setPromptSetName(saved.name);
      setPromptSetIsPublic(saved.isPublic);
      setSavePromptModalOpen(false);
      setSavedPromptSetsScope("own");
      setSavedPromptSets((prev) => {
        const next = [saved, ...prev.filter((item) => item.id !== saved.id)];
        return next.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
      });
      setSavePromptNameError(null);
      setSentencesModalView("saved");
    } catch (error) {
      console.error("Failed to save Yes/No set", error);
      setSavedPromptSetsError("Could not save that set.");
    } finally {
      setSavingPromptSet(false);
    }
  }

  function handleLoadSavedPromptSet(set: YesNoPromptSetRecord) {
    const nextCards = cardsFromPromptSet(set);
    const preserveSavedId = savedPromptSetsScope === "own";
    if (nextCards.length === 0) {
      setSavedPromptSetsError("This saved set has no cards to load.");
      return;
    }
    if (tray.length > 0 && hasDifferentCards(nextCards)) {
      setPendingLoadPromptSet({ set, preserveSavedId });
      return;
    }
    applySavedPromptSet(set, preserveSavedId);
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
        setPromptSetName("Activity Set");
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
        if (playMode === "classroom-sides") {
          handleClassroomSideReveal();
        } else {
          void handleYesNo(false);
        }
      }
      return;
    }
    const id = window.setTimeout(() => setTimerSeconds((s) => (s !== null ? s - 1 : s)), 1000);
    timerRef.current = id;
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playMode, roundPhase, timerSeconds, turnLength]);

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
        const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
        const AudioContextConstructor = window.AudioContext || audioWindow.webkitAudioContext;
        if (!AudioContextConstructor) return null;
        audioCtxRef.current = new AudioContextConstructor();
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

  function handleClassroomSideReveal() {
    if (roundPhase !== "timing") return;
    stopTimer();
    setRoundPhase("feedback");
    if (correctAnswerIsYes) playYesJingle();
    else playNoJingle();

    if (currentCardIndex !== null && !usedIndices.includes(currentCardIndex)) {
      setUsedIndices((u) => [...u, currentCardIndex]);
    }

    clearPopupTimeout();
    popupTimeoutRef.current = window.setTimeout(() => {
      advanceAfterRound();
    }, 2200);
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
    if (playMode === "team") {
      setActiveTeamIndex((i) => (i + 1) % teams.length);
    }
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
    if (allUsed && playMode === "team") {
      const winner = teams.reduce((best, t) => (t.score > best.score ? t : best), teams[0]);
      setWinnerTeam(winner);
      setWinnerOpen(true);
      playCorrectSound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allUsed, playMode]);

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
    trackGameStart(gameKey);
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

  const remainingCount = Math.max(0, tray.length - usedIndices.length);
  const currentCard = currentCardIndex !== null ? tray[currentCardIndex] : null;
  const canAnswer = roundPhase === "timing";
  const timerLabel = roundPhase === "timing" && timerSeconds !== null ? `${timerSeconds}s` : "Ready";
  const showPrompt = roundPhase === "timing" || (roundPhase === "feedback" && !showPointsPrompt && !showPointsSpinner);
  const shouldBlurCardImage = !showPrompt;

  // UI
  return (
    <div className={`${isFullscreen ? "game-fullscreen-shell" : "h-screen"} overflow-hidden bg-[hsl(140,40%,95%)] text-black`}>
      <GameHeader
        title={gameTitle}
        onExit={() => router.push("/games")}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((s) => !s)}
        trackGameKey={gameKey}
      />

      {playMode === "team" && (
      <div className={isFullscreen ? "game-fullscreen-chrome shrink-0" : ""}>
        <div className="game-mobile-chrome pt-[72px] max-w-7xl mx-auto px-4">
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
      </div>
      )}

      {/* Kahoot-style responsive game canvas */}
      <main data-game-stage className={`game-yes-no-stage w-full max-w-7xl mx-auto px-4 pb-4 ${playMode === "team" ? "h-[calc(100vh-220px)]" : "h-[calc(100vh-184px)]"} min-h-0`}>
        <div className="flex justify-center items-start h-full min-h-0">
          <div className="relative w-full max-w-6xl rounded-3xl bg-white/85 shadow-2xl p-3 md:p-4 flex flex-col items-center overflow-hidden h-full min-h-0">
            <div className="relative w-full flex-1 min-h-0 flex flex-col items-center justify-center gap-2">
              <div className="relative w-full flex-[1.55] min-h-0 rounded-[28px] border-2 border-slate-200 bg-[#f7faf7] shadow-inner overflow-hidden flex items-center justify-center">
                {currentCard?.image ? (
                  <img
                    src={currentCard.image}
                    alt={currentCard.word}
                    className={`w-full h-full object-contain select-none transition-all duration-300 ${
                      shouldBlurCardImage ? "blur-xl" : "blur-0"
                    }`}
                    draggable={false}
                  />
                ) : tray.length === 0 ? (
                  <div className="flex max-w-md flex-col items-center px-6 text-center">
                    <div className="text-xl font-semibold text-slate-700">Choose a saved activity set</div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Load a reusable set to add its cards to the lesson tray and start the game.
                    </p>
                    <button
                      onClick={() => {
                        setSentencesModalView("saved");
                        setSentencesModalOpen(true);
                      }}
                      className="mt-5 rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white shadow transition-transform hover:-translate-y-0.5"
                    >
                      Open Saved Sets
                    </button>
                  </div>
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

              <div className="w-full max-w-[1100px] min-h-[64px] flex items-center justify-center px-4 text-center">
                <p className={`text-xl md:text-4xl font-extrabold tracking-tight text-slate-800 transition-all duration-300 ${showPrompt ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
                  {displayedText || "—"}
                </p>
              </div>
            </div>

            {playMode === "team" ? (
              <div className="relative z-10 mt-auto grid w-full grid-cols-2 gap-3 pt-1">
                <button
                  onClick={() => void handleYesNo(true)}
                  disabled={!canAnswer}
                  className={`h-[clamp(5.5rem,14vh,9rem)] rounded-[28px] border-[6px] border-white text-white font-extrabold text-3xl md:text-5xl shadow-2xl transition-transform duration-200 ${
                    canAnswer
                      ? "bg-[linear-gradient(180deg,#6ee7a8,#16a34a)] animate-pulse ring-4 ring-white/70 ring-offset-2 ring-offset-transparent hover:scale-[1.02] hover:shadow-[0_28px_80px_rgba(22,163,74,0.35)]"
                      : "bg-[#a7f3d0] opacity-75 cursor-not-allowed"
                  }`}
                  aria-label="Yes"
                >
                  YES
                </button>
                <button
                  onClick={() => void handleYesNo(false)}
                  disabled={!canAnswer}
                  className={`h-[clamp(5.5rem,14vh,9rem)] rounded-[28px] border-[6px] border-white text-white font-extrabold text-3xl md:text-5xl shadow-2xl transition-transform duration-200 ${
                    canAnswer
                      ? "bg-[linear-gradient(180deg,#fca5a5,#ef4444)] animate-pulse ring-4 ring-white/70 ring-offset-2 ring-offset-transparent hover:scale-[1.02] hover:shadow-[0_28px_80px_rgba(239,68,68,0.35)]"
                      : "bg-[#fbcaca] opacity-75 cursor-not-allowed"
                  }`}
                  aria-label="No"
                >
                  NO
                </button>
              </div>
            ) : (
              <div className="relative z-10 mt-auto w-full max-w-[980px] pb-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    className={`min-h-[130px] rounded-[28px] border-[3px] p-5 text-left shadow-xl transition-all duration-300 ${
                      roundPhase === "feedback" && correctAnswerIsYes
                        ? "border-[#2f8a46] bg-[linear-gradient(180deg,#d5f7df,#8dd59d)] text-[#174c26] scale-[1.01]"
                        : "border-[#b7e1bf] bg-[linear-gradient(180deg,#effcf2,#c8f0d4)] text-[#245231]"
                    } ${
                      roundPhase === "feedback" && !correctAnswerIsYes
                        ? "pointer-events-none opacity-0 scale-95 md:-translate-x-8"
                        : ""
                    } ${roundPhase === "timing" ? "animate-pulse" : ""}`}
                  >
                    <div className="text-xs font-black uppercase tracking-[0.35em] opacity-65">Move left ←</div>
                    <div className="mt-3 text-4xl md:text-5xl font-black tracking-tight">YES</div>
                    <p className="mt-2 text-sm md:text-base font-medium opacity-85">Move to the YES side of the classroom.</p>
                  </div>
                  <div
                    className={`min-h-[130px] rounded-[28px] border-[3px] p-5 text-left shadow-xl transition-all duration-300 ${
                      roundPhase === "feedback" && !correctAnswerIsYes
                        ? "border-[#d13d52] bg-[linear-gradient(180deg,#ffe0e4,#f7a4af)] text-[#6d1020] scale-[1.01]"
                        : "border-[#f1c6ce] bg-[linear-gradient(180deg,#fff3f5,#ffd9de)] text-[#7b2130]"
                    } ${
                      roundPhase === "feedback" && correctAnswerIsYes
                        ? "pointer-events-none opacity-0 scale-95 md:translate-x-8"
                        : ""
                    } ${roundPhase === "timing" ? "animate-pulse" : ""}`}
                  >
                    <div className="text-xs font-black uppercase tracking-[0.35em] opacity-65">Move right →</div>
                    <div className="mt-3 text-4xl md:text-5xl font-black tracking-tight">NO</div>
                    <p className="mt-2 text-sm md:text-base font-medium opacity-85">Move to the NO side of the classroom.</p>
                  </div>
                </div>

                <div className="mt-3 min-h-[52px] flex items-center justify-center">
                  {roundPhase === "feedback" ? (
                    <div className={`rounded-full px-6 py-3 text-lg md:text-xl font-extrabold shadow-lg ${
                      correctAnswerIsYes ? "bg-[#e6f8ea] text-[#1e6c34]" : "bg-[#fff0f2] text-[#b4233b]"
                    }`}>
                      Answer: {correctAnswerIsYes ? "YES" : "NO"}
                    </div>
                  ) : (
                    <div className="rounded-full border border-slate-200 bg-slate-50 px-5 py-2 text-sm font-semibold text-slate-600">
                      Answer reveals automatically when the timer finishes
                    </div>
                  )}
                </div>
              </div>
            )}

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
              {playMode === "team" ? (
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
              ) : (
                <div className="rounded-2xl border border-[#89ad70]/20 bg-[#f4f9f0] px-4 py-3 text-sm text-[#587446]">
                  Team scoring is available in Yes or No. Choose Your Side keeps the same prompts and timer, then reveals the answer automatically.
                </div>
              )}
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
      {playMode === "team" && (showPointsPrompt || showPointsSpinner) && (
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
          <div ref={modalRef} className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[30px] bg-[#fffdf8] shadow-[0_28px_80px_rgba(15,23,42,0.22)]" tabIndex={-1}>
            <div className="flex items-start justify-between gap-4 border-b border-[#eadfcb] px-6 py-5">
              <div>
                <h3 className="text-2xl font-bold">Enter sentences for each card</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Write the sentence that will appear for each card, mark whether it is correct, and save sets for reuse.
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
                <div className="flex-1 overflow-auto px-6 py-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#e8decb] bg-white px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{promptSetName}</div>
                      <div className="mt-0.5 text-xs text-gray-500">{tray.length} cards in this activity set</div>
                    </div>
                    <button
                      onClick={openSavePromptModal}
                      disabled={savingPromptSet || tray.length === 0}
                      className="rounded-full bg-[linear-gradient(180deg,#86b269,#6f9656)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(111,150,86,0.25)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                    >
                      {savingPromptSet ? "Saving..." : promptSetId ? "Update set" : "Save set"}
                    </button>
                  </div>

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

                <div className="flex items-center justify-end gap-3 border-t border-[#eadfcb] bg-[#fffaf0] px-6 py-4">
                  <button
                    onClick={openSavePromptModal}
                    disabled={savingPromptSet || tray.length === 0}
                    className="rounded-full bg-[linear-gradient(180deg,#86b269,#6f9656)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(111,150,86,0.25)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    {savingPromptSet ? "Saving..." : promptSetId ? "Update set" : "Save set"}
                  </button>
                  <button
                    onClick={() => setSentencesModalOpen(false)}
                    className="rounded-full border border-[#d8ccb6] bg-white px-5 py-2.5 text-sm font-semibold text-[#4d5b4d] shadow-sm transition-transform hover:-translate-y-0.5"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleModalFinished}
                    className="rounded-full bg-[linear-gradient(180deg,#86b269,#6f9656)] px-6 py-2.5 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(111,150,86,0.28)] transition-transform hover:-translate-y-0.5"
                  >
                    Finished
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex-1 overflow-auto px-6 py-5">
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
                              onClick={() => handleLoadSavedPromptSet(set)}
                              className="px-4 py-2 rounded-full bg-[var(--color-primary)] text-white text-sm font-semibold shadow hover:-translate-y-0.5 transition-transform"
                            >
                              Load
                            </button>
                            {savedPromptSetsScope === "own" ? (
                              <button
                                onClick={() => confirmDeletePromptSet(set)}
                                disabled={deletingPromptSetId === set.id}
                                className="px-4 py-2 rounded-full bg-white border border-red-200 text-red-600 text-sm font-semibold hover:-translate-y-0.5 transition-transform disabled:opacity-60"
                              >
                                {deletingPromptSetId === set.id ? "Deleting..." : "Delete"}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-[#eadfcb] bg-[#fffaf0] px-6 py-4">
                  <button
                    onClick={() => setSentencesModalOpen(false)}
                    className="rounded-full border border-[#d8ccb6] bg-white px-5 py-2.5 text-sm font-semibold text-[#4d5b4d] shadow-sm transition-transform hover:-translate-y-0.5"
                  >
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

      {savePromptModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4 py-8">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="save-yes-no-title"
            className="relative w-full max-w-lg rounded-[2rem] border border-[#dfe5d9] bg-white p-6 shadow-[0_24px_70px_rgba(47,58,47,0.22)] sm:p-7"
          >
            <button
              type="button"
              onClick={() => setSavePromptModalOpen(false)}
              disabled={savingPromptSet}
              className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              aria-label="Close dialog"
            >
              ×
            </button>

            <div className="pr-10">
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#6f895f]">Save activity set</p>
              <h2 id="save-yes-no-title" className="mt-2 text-2xl font-semibold text-[#2f3a2f]">Save Activity Set</h2>
              <p className="mt-2 text-sm leading-6 text-[#687268]">
                Save these {tray.length} cards, sentences, and answers so the activity is ready to reuse.
              </p>
            </div>

            <form
              className="mt-6"
              onSubmit={(event) => {
                event.preventDefault();
                if (!savingPromptSet) void handleSavePromptSet();
              }}
            >
              <label htmlFor="yes-no-save-name" className="text-sm font-semibold text-[#384638]">Set name</label>
              <input
                id="yes-no-save-name"
                type="text"
                value={savePromptName}
                onChange={(event) => {
                  setSavePromptName(event.target.value);
                  if (savePromptNameError) setSavePromptNameError(null);
                }}
                placeholder="For example, Animals: Yes or No"
                autoFocus
                disabled={savingPromptSet}
                aria-invalid={Boolean(savePromptNameError)}
                className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:ring-2 disabled:bg-slate-50 ${
                  savePromptNameError
                    ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                    : "border-[#d7ddd1] focus:border-[#86a96a] focus:ring-[#e5efdf]"
                }`}
              />
              {savePromptNameError ? <p className="mt-2 text-sm text-red-600">{savePromptNameError}</p> : null}

              <div className="mt-5 rounded-2xl border border-[#dfe5d9] bg-[#f7faf5] p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={promptSetIsPublic}
                    onChange={() => setPromptSetIsPublic((current) => !current)}
                    disabled={savingPromptSet}
                    aria-label="Make activity set public"
                    className="mt-0.5 h-5 w-5 rounded border-[#b8c5b2] accent-[#6f895f]"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-[#384638]">
                      {promptSetIsPublic ? "Public" : "Private"}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-[#687268]">
                      {promptSetIsPublic
                        ? "Other signed-in teachers can discover and load this set."
                        : "Only you can access this set."}
                    </span>
                  </span>
                </label>
              </div>

              {savedPromptSetsError ? <p className="mt-3 text-sm text-red-600">{savedPromptSetsError}</p> : null}

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setSavePromptModalOpen(false)}
                  disabled={savingPromptSet}
                  className="btn btn-secondary px-5 py-2.5 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPromptSet || !savePromptName.trim() || tray.length === 0}
                  className="btn btn-primary px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {savingPromptSet ? "Saving…" : promptSetId ? "Update set" : "Save set"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {pendingLoadPromptSet && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="replace-yes-no-tray-title"
            className="w-full max-w-md rounded-[2rem] border border-[#eadfcb] bg-white p-6 shadow-2xl"
          >
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-amber-700">Change lesson tray</p>
            <h3 id="replace-yes-no-tray-title" className="mt-2 text-2xl font-bold text-gray-900">Load a different card set?</h3>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Loading <span className="font-semibold text-gray-900">{pendingLoadPromptSet.set.name}</span> will change the cards in your lesson tray to the cards saved in this set.
            </p>
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              Your current tray will be replaced. The saved activity set itself will not be changed.
            </div>
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingLoadPromptSet(null)}
                className="btn btn-secondary px-5 py-2.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => applySavedPromptSet(pendingLoadPromptSet.set, pendingLoadPromptSet.preserveSavedId)}
                className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                Change tray and load set
              </button>
            </div>
          </section>
        </div>
      )}

      {previewPromptSet && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-6xl rounded-3xl bg-white shadow-2xl max-h-[92vh] overflow-hidden">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{previewPromptSet.name}</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Preview of the saved activity set. Images, sentences, and answers are shown read-only.
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
        <GameWinnerModal
          title={`${winnerTeam.name} wins!`}
          message={`Congratulations — ${winnerTeam.name} finished with ${winnerTeam.score} points.`}
          onClose={() => setWinnerOpen(false)}
          onPlayAgain={() => resetGameState(true)}
          onReturnToGames={() => router.push("/games")}
        />
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
