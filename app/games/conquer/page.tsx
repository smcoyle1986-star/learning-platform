"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HelpCircle, RefreshCcw, Shield, Swords, X } from "lucide-react";
import GameHeader from "@/components/games/GameHeader";
import { GameSettingsDropdown, GameSettingsModal } from "@/components/games/GameSettingsSurface";
import KaboomStyleDecisionModal from "@/components/games/KaboomStyleDecisionModal";
import { GameWinnerModal } from "@/components/games/GameWinnerModal";
import { supabase } from "@/lib/supabase/client";
import { trackGameStart } from "@/lib/games/track-game-start";

type GameCard = {
  id: string;
  word: string;
  image?: string | null;
};

type TeamTheme = {
  fill: string;
  border: string;
  shadow: string;
  text: string;
  glow: string;
};

type CellState = {
  ownerId: string | null;
  bomb: boolean;
  crater: boolean;
};

type CardDisplayMode = "image+text" | "image" | "text";
type RpsChoice = "rock" | "paper" | "scissors";
type TeamCount = 2 | 3 | 4;
type AttackMode = "slots" | "manual";
type ContestOutcome = "attacker" | "defender" | "draw";

const LESSON_TRAY_KEY = "classendo-lesson-tray";
const BOARD_SIZE = 8;
const BOMB_COUNT = 6;

const TEAM_THEMES: TeamTheme[] = [
  {
    fill: "rgba(127, 163, 106, 0.28)",
    border: "rgba(127, 163, 106, 0.45)",
    shadow: "rgba(127, 163, 106, 0.18)",
    text: "#32402c",
    glow: "rgba(127, 163, 106, 0.26)",
  },
  {
    fill: "rgba(108, 144, 255, 0.26)",
    border: "rgba(108, 144, 255, 0.45)",
    shadow: "rgba(108, 144, 255, 0.18)",
    text: "#2f3659",
    glow: "rgba(108, 144, 255, 0.26)",
  },
  {
    fill: "rgba(244, 155, 185, 0.28)",
    border: "rgba(244, 155, 185, 0.45)",
    shadow: "rgba(244, 155, 185, 0.18)",
    text: "#5c3041",
    glow: "rgba(244, 155, 185, 0.26)",
  },
  {
    fill: "rgba(250, 211, 126, 0.28)",
    border: "rgba(250, 211, 126, 0.48)",
    shadow: "rgba(250, 211, 126, 0.18)",
    text: "#5f4a27",
    glow: "rgba(250, 211, 126, 0.26)",
  },
];

function resolveImageUrl(value?: string | null) {
  const raw = (value ?? "").toString().trim();
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return supabase.storage.from("vocab-images").getPublicUrl(raw).data.publicUrl;
}

function shuffleArray<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function defaultCards(): GameCard[] {
  return [
    { id: "cat", word: "Cat" },
    { id: "dog", word: "Dog" },
    { id: "apple", word: "Apple" },
    { id: "book", word: "Book" },
    { id: "tree", word: "Tree" },
    { id: "fish", word: "Fish" },
    { id: "sun", word: "Sun" },
    { id: "ball", word: "Ball" },
    { id: "friend", word: "Friend" },
    { id: "run", word: "Run" },
    { id: "jump", word: "Jump" },
    { id: "play", word: "Play" },
  ];
}

function createTeams(count: TeamCount) {
  return Array.from({ length: count }, (_, index) => ({
    id: `team-${index + 1}`,
    name: `Team ${index + 1}`,
    theme: TEAM_THEMES[index],
  }));
}

function createBoard() {
  const total = BOARD_SIZE * BOARD_SIZE;
  const bombIndices = new Set<number>();
  const targetBombs = Math.min(BOMB_COUNT, Math.max(0, total - 1));
  while (bombIndices.size < targetBombs) {
    bombIndices.add(Math.floor(Math.random() * total));
  }

  return Array.from({ length: total }, (_, index) => ({
    ownerId: null,
    bomb: bombIndices.has(index),
    crater: false,
  })) satisfies CellState[];
}

function indexToCoord(index: number) {
  const row = Math.floor(index / BOARD_SIZE);
  const col = index % BOARD_SIZE;
  return {
    row,
    col,
    label: `${String.fromCharCode(65 + col)}${row + 1}`,
  };
}

function getOrthogonalNeighbors(index: number) {
  const { row, col } = indexToCoord(index);
  const out: number[] = [];
  if (row > 0) out.push((row - 1) * BOARD_SIZE + col);
  if (row < BOARD_SIZE - 1) out.push((row + 1) * BOARD_SIZE + col);
  if (col > 0) out.push(row * BOARD_SIZE + (col - 1));
  if (col < BOARD_SIZE - 1) out.push(row * BOARD_SIZE + (col + 1));
  return out;
}

function getAllNeighbors(index: number) {
  const { row, col } = indexToCoord(index);
  const out: number[] = [];
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if (r === row && c === col) continue;
      if (r < 0 || c < 0 || r >= BOARD_SIZE || c >= BOARD_SIZE) continue;
      out.push(r * BOARD_SIZE + c);
    }
  }
  return out;
}

function getRpsWinner(attacker: RpsChoice, defender: RpsChoice) {
  if (attacker === defender) return "draw" as const;
  if (
    (attacker === "rock" && defender === "scissors") ||
    (attacker === "paper" && defender === "rock") ||
    (attacker === "scissors" && defender === "paper")
  ) {
    return "attacker" as const;
  }
  return "defender" as const;
}

export default function ConquerPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [teamCount, setTeamCount] = useState<TeamCount>(2);
  const [cardDisplayMode, setCardDisplayMode] = useState<CardDisplayMode>("image+text");

  const sourceCardsRef = useRef<GameCard[]>(defaultCards());
  const [promptState, setPromptState] = useState<{ deck: GameCard[]; cursor: number }>({
    deck: shuffleArray(defaultCards()),
    cursor: 0,
  });
  const [board, setBoard] = useState<CellState[]>(() => createBoard());
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);
  const [rpsOpen, setRpsOpen] = useState(false);
  const [rpsTargetIndex, setRpsTargetIndex] = useState<number | null>(null);
  const [rpsAttackerTeamId, setRpsAttackerTeamId] = useState<string | null>(null);
  const [rpsDefenderTeamId, setRpsDefenderTeamId] = useState<string | null>(null);
  const [attackMode, setAttackMode] = useState<AttackMode>("slots");
  const [slotAttackerFace, setSlotAttackerFace] = useState<RpsChoice>("rock");
  const [slotDefenderFace, setSlotDefenderFace] = useState<RpsChoice>("rock");
  const [slotAttackerLocked, setSlotAttackerLocked] = useState(false);
  const [slotDefenderLocked, setSlotDefenderLocked] = useState(false);
  const [roundLocked, setRoundLocked] = useState(false);
  const [banner, setBanner] = useState<{ text: string; tone: "good" | "bad" | "neutral" } | null>(null);
  const [contestResultPopup, setContestResultPopup] = useState<{ text: string; tone: "good" | "bad" | "neutral" } | null>(null);
  const [attackFlickerOn, setAttackFlickerOn] = useState(false);
  const [pendingAttackResolution, setPendingAttackResolution] = useState<{ index: number; teamId: string } | null>(null);
  const [bombAnimation, setBombAnimation] = useState<{ index: number; stage: "warning" | "impact" | "aftershock" } | null>(
    null
  );
  const [scoresOpen, setScoresOpen] = useState(false);
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);
  const bannerTimeoutRef = useRef<number | null>(null);
  const actionTimeoutRef = useRef<number | null>(null);
  const lastAutoContestRef = useRef<string | null>(null);
  const attackSpinIntervalRef = useRef<number | null>(null);
  const attackSpinFinishRef = useRef<number | null>(null);
  const attackPopupTimeoutRef = useRef<number | null>(null);
  const attackResolveTimeoutRef = useRef<number | null>(null);
  const attackFlickerIntervalRef = useRef<number | null>(null);
  const attackFlickerFinishRef = useRef<number | null>(null);
  const bombWarningTimeoutRef = useRef<number | null>(null);
  const bombImpactTimeoutRef = useRef<number | null>(null);
  const bombResolveTimeoutRef = useRef<number | null>(null);
  const defendedSafeRef = useRef<Set<number>>(new Set());
  const attackOutcomeRef = useRef<{ result: ContestOutcome; index: number; attackerTeamId: string; defenderTeamId: string } | null>(null);
  const [boardMetrics, setBoardMetrics] = useState({
    frameWidth: 1120,
    frameHeight: 760,
    labelWidth: 28,
    labelHeight: 28,
    gap: 6,
    cellWidth: 120,
    cellHeight: 76,
    padding: 16,
  });
  const boardViewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onFullChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFullChange);
    return () => document.removeEventListener("fullscreenchange", onFullChange);
  }, []);

  useLayoutEffect(() => {
    function recomputeBoardMetrics() {
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const bounds = boardViewportRef.current?.getBoundingClientRect();
      // Measure the actual flex area left after the header and board controls.
      // This avoids guessing at browser/TV chrome heights and keeps every row
      // plus the score button inside the visible game viewport.
      const availableWidth = Math.floor(bounds?.width || window.innerWidth - (isFullscreen ? 24 : 64));
      const availableHeight = Math.floor(bounds?.height || viewportHeight - (isFullscreen ? 160 : 250));
      const padding = isFullscreen ? 14 : 16;
      const gap = isFullscreen ? 6 : 6;
      const labelWidth = isFullscreen ? 28 : 24;
      const labelHeight = isFullscreen ? 28 : 24;

      const minCellHeight = isFullscreen ? 32 : 46;
      const maxCellHeightFromViewport = Math.max(
        minCellHeight,
        Math.floor((availableHeight - padding * 2 - labelHeight - BOARD_SIZE * gap) / BOARD_SIZE)
      );
      const cellHeight = Math.max(minCellHeight, Math.min(maxCellHeightFromViewport, isFullscreen ? 112 : 98));

      const minCellWidth = isFullscreen ? 46 : 62;
      const maxCellWidthFromViewport = Math.max(
        minCellWidth,
        Math.floor((availableWidth - padding * 2 - labelWidth - BOARD_SIZE * gap) / BOARD_SIZE)
      );
      const preferredCellWidth = Math.floor(cellHeight * (isFullscreen ? 1.68 : 1.55));
      const cellWidth = Math.max(minCellWidth, Math.min(maxCellWidthFromViewport, preferredCellWidth));

      const frameWidth = labelWidth + BOARD_SIZE * cellWidth + BOARD_SIZE * gap + padding * 2;
      const frameHeight = labelHeight + BOARD_SIZE * cellHeight + BOARD_SIZE * gap + padding * 2;

      setBoardMetrics({ frameWidth, frameHeight, labelWidth, labelHeight, gap, cellWidth, cellHeight, padding });
    }

    recomputeBoardMetrics();
    window.addEventListener("resize", recomputeBoardMetrics);
    document.addEventListener("fullscreenchange", recomputeBoardMetrics);
    window.visualViewport?.addEventListener("resize", recomputeBoardMetrics);
    const observer = new ResizeObserver(recomputeBoardMetrics);
    if (boardViewportRef.current) observer.observe(boardViewportRef.current);
    return () => {
      window.removeEventListener("resize", recomputeBoardMetrics);
      document.removeEventListener("fullscreenchange", recomputeBoardMetrics);
      window.visualViewport?.removeEventListener("resize", recomputeBoardMetrics);
      observer.disconnect();
    };
  }, [isFullscreen]);

  function enterFullscreen() {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LESSON_TRAY_KEY);
      if (!raw) {
        sourceCardsRef.current = defaultCards();
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        sourceCardsRef.current = defaultCards();
        return;
      }
      const normalized = parsed
        .map((c: Record<string, unknown>, i: number) => {
          const word = String(c.word ?? c.text ?? c.label ?? c.name ?? c.title ?? "");
          const id = String(c.id ?? word ?? `conquer-${i}`);
          const image = resolveImageUrl(
            typeof c.image === "string" ? c.image
              : typeof c.image_id === "string" ? c.image_id
                : typeof c.img === "string" ? c.img : null,
          );
          return { id, word, image };
        })
        .filter((card: GameCard) => card.word);
      sourceCardsRef.current = normalized.length ? normalized : defaultCards();
      setPromptState({
        deck: shuffleArray(sourceCardsRef.current),
        cursor: 0,
      });
    } catch {
      sourceCardsRef.current = defaultCards();
      setPromptState({
        deck: shuffleArray(sourceCardsRef.current),
        cursor: 0,
      });
    }
  }, []);

  function rebuildGame() {
    clearAllTimers();
    lastAutoContestRef.current = null;
    defendedSafeRef.current = new Set();
    attackOutcomeRef.current = null;
    setBoard(createBoard());
    setPromptState({
      deck: shuffleArray(sourceCardsRef.current.length ? sourceCardsRef.current : defaultCards()),
      cursor: 0,
    });
    setActiveTeamIndex(0);
    setSelectedIndex(null);
    setPromptOpen(false);
    setRpsOpen(false);
    setRpsTargetIndex(null);
    setRpsAttackerTeamId(null);
    setRpsDefenderTeamId(null);
    setAttackMode("slots");
    setSlotAttackerFace("rock");
    setSlotDefenderFace("rock");
    setSlotAttackerLocked(false);
    setSlotDefenderLocked(false);
    setRoundLocked(false);
    setBanner(null);
    setContestResultPopup(null);
    setAttackFlickerOn(false);
    setPendingAttackResolution(null);
    setBombAnimation(null);
    setScoresOpen(false);
    setWinnerModalOpen(false);
  }

  function clearAllTimers() {
    if (bannerTimeoutRef.current) {
      clearTimeout(bannerTimeoutRef.current);
      bannerTimeoutRef.current = null;
    }
    if (actionTimeoutRef.current) {
      clearTimeout(actionTimeoutRef.current);
      actionTimeoutRef.current = null;
    }
    if (attackSpinIntervalRef.current) {
      clearInterval(attackSpinIntervalRef.current);
      attackSpinIntervalRef.current = null;
    }
    if (attackSpinFinishRef.current) {
      clearTimeout(attackSpinFinishRef.current);
      attackSpinFinishRef.current = null;
    }
    if (attackPopupTimeoutRef.current) {
      clearTimeout(attackPopupTimeoutRef.current);
      attackPopupTimeoutRef.current = null;
    }
    if (attackResolveTimeoutRef.current) {
      clearTimeout(attackResolveTimeoutRef.current);
      attackResolveTimeoutRef.current = null;
    }
    if (attackFlickerIntervalRef.current) {
      clearInterval(attackFlickerIntervalRef.current);
      attackFlickerIntervalRef.current = null;
    }
    if (attackFlickerFinishRef.current) {
      clearTimeout(attackFlickerFinishRef.current);
      attackFlickerFinishRef.current = null;
    }
    if (bombWarningTimeoutRef.current) {
      clearTimeout(bombWarningTimeoutRef.current);
      bombWarningTimeoutRef.current = null;
    }
    if (bombImpactTimeoutRef.current) {
      clearTimeout(bombImpactTimeoutRef.current);
      bombImpactTimeoutRef.current = null;
    }
    if (bombResolveTimeoutRef.current) {
      clearTimeout(bombResolveTimeoutRef.current);
      bombResolveTimeoutRef.current = null;
    }
    setBombAnimation(null);
  }

  function resolveAttackResult(result: ContestOutcome, attackerTeamId: string, defenderTeamId: string, index: number) {
    clearAllTimers();
    attackOutcomeRef.current = { result, index, attackerTeamId, defenderTeamId };
    const attackerName = teamsById[attackerTeamId]?.name ?? "Attacker";
    const defenderName = teamsById[defenderTeamId]?.name ?? "Defender";
    const popupText =
      result === "attacker"
        ? `${attackerName} conquers the square!`
        : result === "defender"
          ? `${defenderName} successfully defends!`
          : "Stalemate! Spin again!";
    const popupTone: "good" | "bad" | "neutral" = result === "attacker" ? "good" : result === "defender" ? "bad" : "neutral";

    attackResolveTimeoutRef.current = window.setTimeout(() => {
      setContestResultPopup({ text: popupText, tone: popupTone });

      attackPopupTimeoutRef.current = window.setTimeout(() => {
        setContestResultPopup(null);
        setRpsOpen(false);
        setPromptOpen(false);
        setSelectedIndex(null);

        window.setTimeout(() => {
          if (result === "attacker") {
            setPendingAttackResolution({ index, teamId: attackerTeamId });
            setAttackFlickerOn(true);
            attackFlickerIntervalRef.current = window.setInterval(() => {
              setAttackFlickerOn((prev) => !prev);
            }, 110);
            applyAttackSuccess(index, attackerTeamId);
            attackOutcomeRef.current = null;
            finishTurn(undefined, "neutral", 720);
            return;
          }

          if (result === "defender") {
            defendedSafeRef.current.add(index);
            setPendingAttackResolution(null);
            attackOutcomeRef.current = null;
            finishTurn(undefined, "neutral", 650);
            return;
          }

          attackOutcomeRef.current = null;
          setPendingAttackResolution(null);
          finishTurn(undefined, "neutral", 650);
        }, 280);
      }, 1500);
    }, 1000);
  }

  useEffect(() => {
    rebuildGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamCount]);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  const teams = useMemo(
    () =>
      createTeams(teamCount).map((team, index) => ({
        ...team,
        score: board.reduce((sum, cell) => (cell.ownerId === team.id ? sum + 1 : sum), 0),
        active: index === activeTeamIndex,
      })),
    [activeTeamIndex, board, teamCount]
  );

  const activeTeam = teams[activeTeamIndex] ?? teams[0];
  const currentCard = promptState.deck[promptState.cursor] ?? sourceCardsRef.current[0] ?? defaultCards()[0];
  const bombShockwaveCells = useMemo(
    () => (bombAnimation ? new Set(getAllNeighbors(bombAnimation.index)) : null),
    [bombAnimation]
  );

  const teamsById = useMemo(() => {
    return Object.fromEntries(teams.map((team) => [team.id, team])) as Record<
      string,
      (typeof teams)[number]
    >;
  }, [teams]);
  const attackerTeam = rpsAttackerTeamId ? teamsById[rpsAttackerTeamId] : null;
  const defenderTeam = rpsDefenderTeamId ? teamsById[rpsDefenderTeamId] : null;
  const attackPreviewTeam = pendingAttackResolution ? teamsById[pendingAttackResolution.teamId] : null;

  const columnLabels = useMemo(() => Array.from({ length: BOARD_SIZE }, (_, i) => String.fromCharCode(65 + i)), []);
  const rowLabels = useMemo(() => Array.from({ length: BOARD_SIZE }, (_, i) => String(i + 1)), []);

  function advancePromptCard() {
    setPromptState((prev) => {
      const source = sourceCardsRef.current.length ? sourceCardsRef.current : defaultCards();
      const nextCursor = prev.cursor + 1;
      if (nextCursor >= prev.deck.length) {
        return {
          deck: shuffleArray(source),
          cursor: 0,
        };
      }
      return {
        ...prev,
        cursor: nextCursor,
      };
    });
  }

  function advanceTeam() {
    setActiveTeamIndex((prev) => (prev + 1) % teamCount);
  }

  function showBanner(text: string, tone: "good" | "bad" | "neutral" = "neutral", holdMs = 1200) {
    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    setBanner({ text, tone });
    bannerTimeoutRef.current = window.setTimeout(() => {
      setBanner(null);
      bannerTimeoutRef.current = null;
    }, holdMs);
  }

  function finishTurn(message?: string, tone: "good" | "bad" | "neutral" = "neutral", delayMs = 900) {
    clearAllTimers();
    setRoundLocked(true);
    if (message) setBanner({ text: message, tone });
    actionTimeoutRef.current = window.setTimeout(() => {
      setSelectedIndex(null);
      setPromptOpen(false);
      setRpsOpen(false);
      setRpsTargetIndex(null);
      setRpsAttackerTeamId(null);
      setRpsDefenderTeamId(null);
      setAttackMode("slots");
      setSlotAttackerFace("rock");
      setSlotDefenderFace("rock");
      setSlotAttackerLocked(false);
      setSlotDefenderLocked(false);
      setBanner(null);
      setContestResultPopup(null);
      setPendingAttackResolution(null);
      setAttackFlickerOn(false);
      lastAutoContestRef.current = null;
      advanceTeam();
      advancePromptCard();
      setRoundLocked(false);
      actionTimeoutRef.current = null;
    }, delayMs);
  }

  function randomRpsChoice() {
    const options: RpsChoice[] = ["rock", "paper", "scissors"];
    return options[Math.floor(Math.random() * options.length)];
  }

  function countPressureSides(index: number, teamId: string) {
    return getOrthogonalNeighbors(index).filter((neighbor) => board[neighbor]?.ownerId === teamId).length;
  }

  function findPressureAttacker(index: number) {
    const cell = board[index];
    if (!cell || cell.crater || !cell.ownerId || defendedSafeRef.current.has(index)) return null;
    for (const team of teams) {
      if (team.id === cell.ownerId) continue;
      if (countPressureSides(index, team.id) >= 3) {
        return team.id;
      }
    }
    return null;
  }

  function findAutoContest() {
    for (let index = 0; index < board.length; index += 1) {
      const cell = board[index];
      if (!cell || cell.crater || !cell.ownerId || defendedSafeRef.current.has(index)) continue;
      const attackerTeamId = findPressureAttacker(index);
      if (attackerTeamId) {
        return {
          index,
          attackerTeamId,
          defenderTeamId: cell.ownerId,
        };
      }
    }
    return null;
  }

  function openContest(index: number, attackerTeamId: string, defenderTeamId: string) {
    clearAllTimers();
    setSelectedIndex(index);
    setPromptOpen(false);
    const attackerIndex = teams.findIndex((team) => team.id === attackerTeamId);
    if (attackerIndex >= 0) {
      setActiveTeamIndex(attackerIndex);
    }
    setRpsTargetIndex(index);
    setRpsAttackerTeamId(attackerTeamId);
    setRpsDefenderTeamId(defenderTeamId);
    setAttackMode("slots");
    setSlotAttackerFace(randomRpsChoice());
    setSlotDefenderFace(randomRpsChoice());
    setSlotAttackerLocked(false);
    setSlotDefenderLocked(false);
    setContestResultPopup(null);
    setAttackFlickerOn(false);
    setPendingAttackResolution(null);
    lastAutoContestRef.current = `${index}:${attackerTeamId}:${defenderTeamId}`;
    setRpsOpen(true);
  }

  function findBonusSquare(index: number) {
    const choices = getOrthogonalNeighbors(index).filter((neighbor) => {
      const cell = board[neighbor];
      return !!cell && !cell.crater && cell.ownerId === null;
    });
    return choices.length ? choices[Math.floor(Math.random() * choices.length)] : null;
  }

  function findPenaltySquare(index: number, teamId: string) {
    const choices = getOrthogonalNeighbors(index).filter((neighbor) => {
      const cell = board[neighbor];
      return !!cell && !cell.crater && cell.ownerId === teamId;
    });
    return choices.length ? choices[Math.floor(Math.random() * choices.length)] : null;
  }

  function claimSquare(index: number, teamId: string) {
    setBoard((prev) => {
      const next = prev.map((cell) => ({ ...cell }));
      if (!next[index] || next[index].crater) return prev;
      next[index] = { ...next[index], ownerId: teamId, bomb: false };
      return next;
    });
  }

  function applyBomb(index: number) {
    setBoard((prev) => {
      const next = prev.map((cell) => ({ ...cell }));
      if (!next[index]) return prev;
      next[index] = { ownerId: null, crater: true, bomb: false };
      getAllNeighbors(index).forEach((neighbor) => {
        if (!next[neighbor] || next[neighbor].crater) return;
        next[neighbor] = {
          ...next[neighbor],
          ownerId: null,
          bomb: false,
        };
      });
      return next;
    });
  }

  function triggerBomb(index: number) {
    clearAllTimers();
    setRoundLocked(true);
    setPromptOpen(false);
    setRpsOpen(false);
    setContestResultPopup(null);
    setPendingAttackResolution(null);
    setAttackFlickerOn(false);
    setSelectedIndex(index);
    setBombAnimation(null);
    showBanner("BOOM!", "bad", 1200);

    window.setTimeout(() => {
      setBombAnimation({ index, stage: "warning" });

      bombWarningTimeoutRef.current = window.setTimeout(() => {
        setBombAnimation((current) => (current && current.index === index ? { ...current, stage: "impact" } : current));
        applyBomb(index);
      }, 260);

      bombImpactTimeoutRef.current = window.setTimeout(() => {
        setBombAnimation((current) => (current && current.index === index ? { ...current, stage: "aftershock" } : current));
      }, 760);

      bombResolveTimeoutRef.current = window.setTimeout(() => {
        setBombAnimation(null);
        setSelectedIndex(null);
        setPromptOpen(false);
        setRpsOpen(false);
        setRpsTargetIndex(null);
        setRpsAttackerTeamId(null);
        setRpsDefenderTeamId(null);
        setAttackMode("slots");
        setSlotAttackerFace("rock");
        setSlotDefenderFace("rock");
        setSlotAttackerLocked(false);
        setSlotDefenderLocked(false);
        setContestResultPopup(null);
        setPendingAttackResolution(null);
        setAttackFlickerOn(false);
        lastAutoContestRef.current = null;
        advanceTeam();
        advancePromptCard();
        setRoundLocked(false);
        bombResolveTimeoutRef.current = null;
      }, 1550);
    }, 280);
  }

  function applyAttackSuccess(index: number, teamId: string) {
    setBoard((prev) => {
      const next = prev.map((cell) => ({ ...cell }));
      if (!next[index] || next[index].crater) return prev;
      next[index] = { ...next[index], ownerId: teamId, bomb: false };
      const bonusSquare = findBonusSquare(index);
      if (bonusSquare !== null && next[bonusSquare] && !next[bonusSquare].crater) {
        next[bonusSquare] = { ...next[bonusSquare], ownerId: teamId, bomb: false };
      }
      return next;
    });
  }

  function applyAttackLoss(index: number, teamId: string) {
    setBoard((prev) => {
      const next = prev.map((cell) => ({ ...cell }));
      const penaltySquare = findPenaltySquare(index, teamId);
      if (penaltySquare !== null && next[penaltySquare] && !next[penaltySquare].crater) {
        next[penaltySquare] = { ...next[penaltySquare], ownerId: null, bomb: false };
      }
      return next;
    });
  }

  function openPrompt(index: number) {
    if (roundLocked || promptOpen || rpsOpen || banner) return;
    const cell = board[index];
    if (!cell || cell.crater) return;
    setSelectedIndex(index);
    if (cell.ownerId) {
      const attackerTeamId = findPressureAttacker(index);
      if (attackerTeamId) {
        openContest(index, attackerTeamId, cell.ownerId);
        return;
      }
    }
    if (cell.ownerId && cell.ownerId === activeTeam.id) {
      setPromptOpen(true);
      return;
    }
    setPromptOpen(true);
  }

  useEffect(() => {
    if (!promptOpen || selectedIndex === null || rpsOpen || roundLocked) return;
    const cell = board[selectedIndex];
    if (!cell || !cell.ownerId || cell.ownerId === activeTeam.id) return;
    const attackerTeamId = findPressureAttacker(selectedIndex);
    if (!attackerTeamId) return;
    openContest(selectedIndex, attackerTeamId, cell.ownerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promptOpen, selectedIndex, board, activeTeam.id, rpsOpen, roundLocked]);

  useEffect(() => {
    if (roundLocked || promptOpen || rpsOpen || banner) return;
    const contest = findAutoContest();
    if (!contest) return;
    const contestKey = `${contest.index}:${contest.attackerTeamId}:${contest.defenderTeamId}`;
    if (lastAutoContestRef.current === contestKey) return;
    openContest(contest.index, contest.attackerTeamId, contest.defenderTeamId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, teams, roundLocked, promptOpen, rpsOpen, banner]);

  function handleWrongAnswer() {
    showBanner("The turn moves on.", "neutral", 900);
    finishTurn(undefined, "neutral", 900);
  }

  function handleCorrectAnswer() {
    if (selectedIndex === null) return;
    const cell = board[selectedIndex];
    const currentTeam = activeTeam;

    if (!cell || cell.crater) {
      finishTurn("That square is a crater.", "neutral", 850);
      return;
    }

    if (cell.bomb) {
      triggerBomb(selectedIndex);
      return;
    }

    if (cell.ownerId === null) {
      claimSquare(selectedIndex, currentTeam.id);
      finishTurn("Square claimed!", "good", 850);
      return;
    }

    if (defendedSafeRef.current.has(selectedIndex)) {
      finishTurn("That square has already been defended.", "neutral", 850);
      return;
    }

    if (cell.ownerId === currentTeam.id) {
      finishTurn("That square is already yours.", "neutral", 850);
      return;
    }

    finishTurn("You need three touching sides to attack.", "bad", 1000);
  }

  function startSlotContest() {
    if (
      selectedIndex === null ||
      rpsTargetIndex === null ||
      !rpsAttackerTeamId ||
      !rpsDefenderTeamId ||
      rpsOpen === false
    )
      return;
    trackGameStart("conquer");
    clearAllTimers();
    setContestResultPopup(null);
    setAttackFlickerOn(false);
    setPendingAttackResolution(null);
    setSlotAttackerLocked(false);
    setSlotDefenderLocked(false);

    const attackerFinal = randomRpsChoice();
    const defenderFinal = randomRpsChoice();
    let attackerLocked = false;
    let defenderLocked = false;

    attackSpinIntervalRef.current = window.setInterval(() => {
      if (!attackerLocked) setSlotAttackerFace(randomRpsChoice());
      if (!defenderLocked) setSlotDefenderFace(randomRpsChoice());
    }, 85);

    attackSpinFinishRef.current = window.setTimeout(() => {
      attackerLocked = true;
      setSlotAttackerLocked(true);
      setSlotAttackerFace(attackerFinal);
    }, 2400);

    attackPopupTimeoutRef.current = window.setTimeout(() => {
      defenderLocked = true;
      setSlotDefenderLocked(true);
      setSlotDefenderFace(defenderFinal);
      if (attackSpinIntervalRef.current) {
        clearInterval(attackSpinIntervalRef.current);
        attackSpinIntervalRef.current = null;
      }

      const result = getRpsWinner(attackerFinal, defenderFinal);
      if (rpsAttackerTeamId && rpsDefenderTeamId && rpsTargetIndex !== null) {
        resolveAttackResult(result, rpsAttackerTeamId, rpsDefenderTeamId, rpsTargetIndex);
      }
    }, 3900);
  }

  function resolveManualContest(result: "attacker" | "defender") {
    if (
      selectedIndex === null ||
      rpsTargetIndex === null ||
      !rpsAttackerTeamId ||
      !rpsDefenderTeamId
    ) {
      return;
    }

    clearAllTimers();
    setContestResultPopup(null);
    setAttackFlickerOn(false);
    setPendingAttackResolution(null);
    if (rpsAttackerTeamId && rpsDefenderTeamId && rpsTargetIndex !== null) {
      resolveAttackResult(result, rpsAttackerTeamId, rpsDefenderTeamId, rpsTargetIndex);
    }
  }

  const totalOwned = useMemo(() => {
    const counts: Record<string, number> = {};
    teams.forEach((team) => {
      counts[team.id] = 0;
    });
    board.forEach((cell) => {
      if (cell.ownerId) counts[cell.ownerId] = (counts[cell.ownerId] ?? 0) + 1;
    });
    return counts;
  }, [board, teams]);

  const boardCompleted = useMemo(
    () => board.length > 0 && board.every((cell) => cell.crater || cell.ownerId !== null),
    [board]
  );

  const winningTeams = useMemo(() => {
    const bestScore = Math.max(...teams.map((team) => totalOwned[team.id] ?? 0), 0);
    return teams.filter((team) => (totalOwned[team.id] ?? 0) === bestScore);
  }, [teams, totalOwned]);

  useEffect(() => {
    if (!boardCompleted || winnerModalOpen) return;
    clearAllTimers();
    setPromptOpen(false);
    setRpsOpen(false);
    setSelectedIndex(null);
    setRpsTargetIndex(null);
    setRpsAttackerTeamId(null);
    setRpsDefenderTeamId(null);
    setRoundLocked(true);
    setBanner(null);
    setContestResultPopup(null);
    setPendingAttackResolution(null);
    setAttackFlickerOn(false);
    setBombAnimation(null);
    setWinnerModalOpen(true);
  }, [boardCompleted, winnerModalOpen]);

  function resetBoardOnly() {
    rebuildGame();
  }

  function renderPromptCard(card: GameCard) {
    const image = card.image ?? null;
    const label = card.word.replaceAll("_", " ");

    if (cardDisplayMode === "text") {
      return (
        <div className="mx-auto flex min-h-[18rem] w-[min(92vw,56rem)] items-center justify-center rounded-[2rem] border border-black/5 bg-[var(--color-bg-main)] px-8 py-10 text-center shadow-sm">
          <div className="text-4xl font-black tracking-tight text-[var(--color-text-main)] md:text-6xl">{label}</div>
        </div>
      );
    }

    return (
      <div className="mx-auto flex min-h-0 w-[min(92vw,56rem)] max-h-full flex-col items-center justify-center gap-4 rounded-[2rem] border border-black/5 bg-[var(--color-bg-main)] px-5 py-5 text-center shadow-sm sm:px-8 sm:py-8">
        <div className="flex h-[min(48vh,18rem)] min-h-0 w-full items-center justify-center overflow-hidden rounded-[1.8rem] bg-white/80">
          {image ? (
            <img src={image} alt={label} className="h-auto w-auto max-h-full max-w-full object-contain" />
          ) : (
            <div className="text-6xl font-black text-[var(--color-text-muted)]">{label.slice(0, 1)}</div>
          )}
        </div>
        {cardDisplayMode === "image+text" && (
          <div className="text-3xl font-extrabold tracking-tight text-[var(--color-text-main)] md:text-5xl">
            {label}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
      <GameHeader
        title="Conquer"
        onExit={() => router.push("/games")}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((s) => !s)}
        trackGameKey="conquer"
      />

      {settingsOpen && (
        <div className="fixed right-4 top-[76px] z-[70]">
          <GameSettingsDropdown className="w-[min(92vw,32rem)]">
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.26em] text-[var(--color-text-muted)]">Game modes</div>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  Conquer is a territory game. Claim open squares, contest enemy squares when you have pressure, and watch for hidden bombs.
                </p>
              </div>

              <div>
                <div className="text-sm font-semibold text-[var(--color-text-main)]">Teams</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[2, 3, 4].map((count) => (
                    <button
                      key={count}
                      onClick={() => setTeamCount(count as TeamCount)}
                      className={`btn px-3 py-2 text-sm ${teamCount === count ? "btn-primary" : "btn-secondary"}`}
                    >
                      {count} teams
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-xs text-[var(--color-text-muted)]">Changing the team count resets the board.</div>
              </div>

              <div>
                <div className="text-sm font-semibold text-[var(--color-text-main)]">Card display</div>
                <div className="mt-2 flex flex-col gap-2">
                  {(["image+text", "image", "text"] as CardDisplayMode[]).map((mode) => (
                    <label
                      key={mode}
                      className={`cursor-pointer rounded-2xl border px-3 py-2 text-sm transition ${
                        cardDisplayMode === mode
                          ? "border-transparent bg-[var(--color-accent)] text-white"
                          : "border-black/10 bg-white"
                      }`}
                    >
                      <input
                        hidden
                        type="radio"
                        name="conquer-card-display"
                        checked={cardDisplayMode === mode}
                        onChange={() => setCardDisplayMode(mode)}
                      />
                      {mode === "image+text" ? "Image + text" : mode === "image" ? "Image only" : "Text only"}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold text-[var(--color-text-main)]">Board controls</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button onClick={resetBoardOnly} className="btn btn-secondary px-3 py-2 text-sm">
                    <RefreshCcw size={15} />
                    New board
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button onClick={() => setSettingsOpen(false)} className="btn btn-secondary px-3 py-2 text-sm">
                  Close
                </button>
              </div>
            </div>
          </GameSettingsDropdown>
        </div>
      )}

      <main data-game-stage className="conquer-game-stage h-[100dvh] px-3 pb-3 pt-[76px] sm:px-5">
        <div className={`mx-auto h-full ${isFullscreen ? "max-w-[96rem]" : "max-w-7xl"}`}>
          <section
            className={`flex h-full min-h-0 flex-col rounded-[2rem] border border-black/5 shadow-sm backdrop-blur-sm ${isFullscreen ? "p-3" : "p-4 sm:p-5"}`}
            style={{
              background: `radial-gradient(circle at 50% 10%, ${activeTeam.theme.fill} 0%, rgba(255,255,255,0.92) 38%, rgba(255,255,255,0.84) 100%)`,
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setScoresOpen((v) => !v)}
                  className="btn btn-secondary px-3 py-2 text-sm flex items-center gap-2"
                >
                  <Shield size={15} />
                  {scoresOpen ? "Hide scores" : "Reveal scores"}
                </button>
                <div className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--color-text-muted)]">
                  Conquer territory
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold shadow-sm">
                <span className="text-[var(--color-text-muted)]">Active</span>
                <span className="text-[var(--color-text-main)]">{activeTeam?.name ?? "Team 1"}</span>
                <span className="h-3 w-3 rounded-full bg-[var(--color-accent)]" />
              </div>
            </div>

            {scoresOpen && (
              <div className="mt-3 rounded-[1.75rem] border border-black/8 bg-white/96 p-4 shadow-lg backdrop-blur-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
                      <Swords size={14} className="text-[var(--color-accent)]" />
                      Scoreboard
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                      Build territory, defend your borders, and keep the board in your colour.
                    </p>
                  </div>
                  <button
                    onClick={() => setScoresOpen(false)}
                    className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-[var(--color-text-muted)] transition hover:-translate-y-0.5 hover:text-[var(--color-text-main)]"
                  >
                    Hide
                  </button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {teams.map((team, index) => {
                    const isActive = index === activeTeamIndex;
                    const theme = team.theme;
                    return (
                      <div
                        key={team.id}
                        className={`rounded-[1.35rem] border bg-white px-3 py-3 shadow-sm transition-all ${
                          isActive ? "ring-2 ring-[rgba(127,163,106,0.26)]" : ""
                        }`}
                        style={{
                          borderColor: isActive ? theme.border : "rgba(15,23,42,0.12)",
                          boxShadow: isActive ? `0 12px 28px ${theme.shadow}` : "0 10px 22px rgba(15,23,42,0.06)",
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-lg font-black tracking-tight text-[var(--color-text-main)]">{team.name}</div>
                            <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
                              {isActive ? "Active turn" : "Waiting"}
                            </div>
                          </div>
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-2xl text-xl font-black"
                            style={{
                              backgroundColor: theme.fill,
                              color: theme.text,
                              border: `1px solid ${theme.border}`,
                            }}
                          >
                            {totalOwned[team.id] ?? 0}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div ref={boardViewportRef} className="mt-3 flex min-h-0 flex-1 items-center justify-center overflow-hidden">
              <div className="flex h-full w-full min-h-0 items-center justify-center">
                <div
                  className={`relative shrink-0 overflow-hidden rounded-[2rem] border border-black/10 bg-[rgba(242,248,239,0.88)] shadow-[0_20px_60px_rgba(15,23,42,0.12)] ${
                    bombAnimation ? "conquer-bomb-board" : ""
                  }`}
                  style={{
                    background: `linear-gradient(180deg, rgba(255,255,255,0.96), ${activeTeam.theme.fill} 100%)`,
                    borderColor: activeTeam.theme.border,
                    width: `${boardMetrics.frameWidth}px`,
                    height: `${boardMetrics.frameHeight}px`,
                    padding: `${boardMetrics.padding}px`,
                    maxWidth: "100%",
                    maxHeight: "100%",
                  }}
                >
                  <div
                    className="grid h-full w-full"
                    style={{
                      gap: `${boardMetrics.gap}px`,
                      gridTemplateColumns: `${boardMetrics.labelWidth}px repeat(${BOARD_SIZE}, ${boardMetrics.cellWidth}px)`,
                      gridTemplateRows: `${boardMetrics.labelHeight}px repeat(${BOARD_SIZE}, ${boardMetrics.cellHeight}px)`,
                    }}
                  >
                    <div />
                    {columnLabels.map((label) => (
                      <div
                        key={label}
                        className="flex items-center justify-center text-[13px] font-black uppercase tracking-[0.24em] text-[var(--color-text-main)] drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]"
                      >
                        {label}
                      </div>
                    ))}

                    {rowLabels.map((label, row) => (
                      <React.Fragment key={label}>
                        <div className="flex items-center justify-center text-[13px] font-black uppercase tracking-[0.24em] text-[var(--color-text-main)] drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]">
                          {label}
                        </div>
                        {Array.from({ length: BOARD_SIZE }, (_, col) => {
                          const index = row * BOARD_SIZE + col;
                          const cell = board[index];
                          const team = cell.ownerId ? teamsById[cell.ownerId] : null;
                          const attackPreview = pendingAttackResolution?.index === index ? attackPreviewTeam : null;
                          const attackPreviewActive = pendingAttackResolution?.index === index;
                          const defendedSafe = defendedSafeRef.current.has(index);
                          const bombActive = bombAnimation?.index === index;
                          const bombStage = bombActive ? bombAnimation.stage : null;
                          const bombShockwaveActive = !bombActive && (bombShockwaveCells?.has(index) ?? false);
                          const canAttack =
                            !cell.crater &&
                            !!cell.ownerId &&
                            cell.ownerId !== activeTeam.id &&
                            !defendedSafe &&
                            countPressureSides(index, activeTeam.id) >= 3;
                          const isSelected = selectedIndex === index && promptOpen;

                          return (
                            <button
                              key={index}
                              onClick={() => openPrompt(index)}
                              disabled={roundLocked || promptOpen || rpsOpen}
                              className={`group relative h-full w-full overflow-hidden rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.015] disabled:cursor-not-allowed disabled:hover:translate-y-0`}
                              style={{
                                backgroundColor: cell.crater
                                  ? "rgba(71, 85, 105, 0.92)"
                                  : bombActive
                                    ? bombStage === "warning"
                                      ? "rgba(255, 183, 77, 0.5)"
                                      : bombStage === "impact"
                                        ? "rgba(220, 38, 38, 0.56)"
                                        : "rgba(30, 41, 59, 0.36)"
                                    : bombShockwaveActive
                                      ? "rgba(255, 247, 237, 0.96)"
                                      : attackPreview
                                        ? attackPreviewActive && attackFlickerOn
                                          ? attackPreview.theme.fill
                                          : "rgba(255,255,255,0.98)"
                                        : team
                                          ? team.theme.fill
                                          : "rgba(255,255,255,0.98)",
                                backgroundImage:
                                  bombActive && bombStage === "impact"
                                    ? "radial-gradient(circle at 50% 45%, rgba(255,255,255,0.56), rgba(239,68,68,0.24) 35%, rgba(7,10,18,0.08) 72%)"
                                    : undefined,
                                transform: bombActive
                                  ? bombStage === "warning"
                                    ? "scale(1.04)"
                                    : bombStage === "impact"
                                      ? "scale(1.08)"
                                      : "scale(1.03)"
                                  : bombShockwaveActive
                                    ? "scale(1.02)"
                                    : undefined,
                                filter:
                                  bombActive && bombStage === "aftershock"
                                    ? "saturate(1.12) brightness(0.98)"
                                    : bombShockwaveActive
                                      ? "saturate(1.08) brightness(1.02)"
                                      : undefined,
                                borderColor: cell.crater
                                  ? "rgba(71, 85, 105, 0.85)"
                                  : defendedSafe
                                    ? "rgba(148,163,184,0.34)"
                                    : bombActive
                                      ? bombStage === "warning"
                                        ? "rgba(251, 191, 36, 0.78)"
                                        : bombStage === "impact"
                                          ? "rgba(248, 113, 113, 0.88)"
                                          : "rgba(147, 51, 234, 0.72)"
                                      : bombShockwaveActive
                                        ? "rgba(255, 159, 67, 0.34)"
                                        : attackPreview
                                          ? attackPreview.theme.border
                                          : isSelected
                                            ? "rgba(30,64,175,0.55)"
                                            : canAttack
                                              ? "rgba(30,64,175,0.26)"
                                              : team
                                                ? team.theme.border
                                                : "rgba(15,23,42,0.08)",
                                boxShadow: cell.crater
                                  ? "inset 0 0 0 1px rgba(255,255,255,0.06)"
                                  : bombActive
                                    ? bombStage === "warning"
                                      ? "0 0 0 3px rgba(251, 191, 36, 0.36), 0 0 30px rgba(249, 115, 22, 0.42), inset 0 0 0 1px rgba(255,255,255,0.4)"
                                      : bombStage === "impact"
                                        ? "0 0 0 4px rgba(255,255,255,0.45), 0 0 40px rgba(239,68,68,0.58), inset 0 0 0 1px rgba(255,255,255,0.46)"
                                        : "0 0 0 4px rgba(255,255,255,0.18), 0 0 24px rgba(100,116,139,0.28)"
                                    : defendedSafe
                                      ? "0 0 0 1px rgba(148,163,184,0.2), 0 8px 14px rgba(15,23,42,0.06)"
                                      : bombShockwaveActive
                                        ? "0 0 0 2px rgba(255,159,67,0.22), 0 0 18px rgba(255,159,67,0.2)"
                                        : attackPreview
                                          ? attackPreviewActive && attackFlickerOn
                                            ? `0 0 0 3px ${attackPreview.theme.glow}, 0 0 24px rgba(220,38,38,0.26)`
                                            : `0 0 0 2px ${attackPreview.theme.glow}, 0 10px 20px rgba(15,23,42,0.10)`
                                          : isSelected
                                            ? `0 0 0 3px rgba(30,64,175,0.10), 0 10px 20px rgba(15,23,42,0.12)`
                                          : canAttack
                                              ? `0 0 0 2px ${team?.theme.glow ?? "rgba(30,64,175,0.16)"}, 0 8px 16px rgba(15,23,42,0.08)`
                                              : "0 8px 16px rgba(15,23,42,0.06)",
                                cursor: roundLocked || promptOpen || rpsOpen ? "not-allowed" : "pointer",
                              }}
                              aria-label={`Square ${indexToCoord(index).label}`}
                            >
                              {!cell.crater && (
                                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                                  <div
                                    className="rounded-full border border-white/55 bg-white/58 px-2.5 py-1 text-center font-black uppercase tracking-[0.22em] text-[var(--color-text-main)] shadow-[0_2px_10px_rgba(255,255,255,0.38)] transition-all duration-200 group-hover:scale-105 group-hover:bg-white/76 group-hover:shadow-[0_4px_14px_rgba(15,23,42,0.14)]"
                                    style={{
                                      fontSize: `${Math.max(16, Math.floor(Math.min(boardMetrics.cellWidth, boardMetrics.cellHeight) * 0.32))}px`,
                                      lineHeight: 1,
                                    }}
                                  >
                                    {indexToCoord(index).label}
                                  </div>
                                </div>
                              )}
                              <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-all duration-200 group-hover:opacity-100">
                                <div className="absolute inset-[7%] rounded-[1.4rem] border-2 border-white/80 shadow-[0_0_0_4px_rgba(255,255,255,0.16)] animate-pulse" />
                                <div className="absolute inset-[14%] rounded-[1.1rem] bg-white/10 blur-[1px]" />
                              </div>
                              {bombActive && (
                                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
                                  <div
                                    className={`absolute inset-0 ${
                                      bombStage === "warning"
                                        ? "bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.42),rgba(239,68,68,0.24)_45%,rgba(249,115,22,0.04)_75%)]"
                                        : bombStage === "impact"
                                          ? "bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.58),rgba(239,68,68,0.36)_34%,rgba(7,10,18,0.08)_76%)]"
                                          : "bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.16),rgba(100,116,139,0.08)_38%,rgba(15,23,42,0.04)_76%)]"
                                    }`}
                                  />
                                  <div
                                    className={`absolute left-1/2 top-1/2 h-[82%] w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white/70 ${
                                      bombStage === "warning"
                                        ? "animate-pulse opacity-70"
                                        : bombStage === "impact"
                                          ? "conquer-bomb-ring-1"
                                          : "conquer-bomb-ring-2"
                                    }`}
                                  />
                                  <div
                                    className={`absolute left-1/2 top-1/2 h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white/85 ${
                                      bombStage === "warning"
                                        ? "bg-amber-300/70"
                                        : bombStage === "impact"
                                          ? "bg-red-500/60"
                                          : "bg-slate-950/80"
                                    }`}
                                  />
                                  {[0, 1, 2, 3, 4, 5].map((particleIndex) => {
                                    const angle = (particleIndex / 6) * 360;
                                    const distance = 14 + particleIndex * 5;
                                    return (
                                      <span
                                        key={particleIndex}
                                        className={`absolute left-1/2 top-1/2 h-2.5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                                          bombStage === "warning"
                                            ? "bg-yellow-200/80"
                                            : bombStage === "impact"
                                              ? "bg-white/90"
                                              : "bg-slate-200/80"
                                        }`}
                                        style={{
                                          transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(-${distance}px)`,
                                          opacity: bombStage === "warning" ? 0.35 : bombStage === "impact" ? 0.95 : 0.55,
                                          boxShadow: "0 0 16px rgba(255,255,255,0.2)",
                                        }}
                                      />
                                    );
                                  })}
                                </div>
                              )}
                              {cell.crater ? (
                                <div className="relative flex h-full w-full items-center justify-center overflow-hidden text-[10px] font-black uppercase tracking-[0.24em] text-white/90">
                                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),rgba(15,23,42,0.94)_62%,rgba(15,23,42,0.98)_100%)]" />
                                  <div className="absolute inset-[16%] rounded-full border border-white/8 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_65%)]" />
                                  <div className="absolute inset-x-[18%] top-[28%] h-[3px] -rotate-12 rounded-full bg-white/8" />
                                  <div className="absolute inset-x-[22%] top-[58%] h-[2px] rotate-[18deg] rounded-full bg-white/10" />
                                  <div className="absolute inset-x-[35%] top-[42%] h-[2px] -rotate-[28deg] rounded-full bg-white/8" />
                                  <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_52%)]" />
                                  <span className="relative z-10 drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">Crater</span>
                                </div>
                              ) : cell.ownerId ? (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  {defendedSafe && (
                                    <>
                                      <div
                                        className="pointer-events-none absolute inset-[6%] rounded-[1.3rem]"
                                        style={{
                                          background:
                                            "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(226,232,240,0.92) 45%, rgba(203,213,225,0.96) 100%)",
                                          boxShadow:
                                            "inset 0 0 0 4px rgba(255,255,255,0.82), inset 0 -8px 0 rgba(148,163,184,0.25), 0 10px 16px rgba(15,23,42,0.08)",
                                        }}
                                      />
                                      <div
                                        className="pointer-events-none absolute inset-[7.5%] rounded-[1.15rem]"
                                        style={{
                                          backgroundImage:
                                            "repeating-linear-gradient(90deg, rgba(148,163,184,0.18) 0 12px, rgba(255,255,255,0.0) 12px 20px), repeating-linear-gradient(0deg, rgba(148,163,184,0.1) 0 10px, rgba(255,255,255,0.0) 10px 20px)",
                                          boxShadow: "inset 0 0 0 2px rgba(148,163,184,0.18)",
                                        }}
                                      />
                                      <div className="pointer-events-none absolute left-1/2 top-[13%] z-20 -translate-x-1/2 rounded-full border border-slate-400/20 bg-white/90 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-[0.28em] text-slate-500 shadow-sm">
                                        Safe
                                      </div>
                                    </>
                                  )}
                                  <div
                                    className={`relative z-10 h-[60%] w-[60%] rounded-full border-4 ${isSelected ? "animate-pulse" : ""}`}
                                    style={{
                                      backgroundColor: team?.theme.border ?? "rgba(30,64,175,0.26)",
                                      borderColor: "rgba(255,255,255,0.82)",
                                      boxShadow: `0 8px 18px rgba(15,23,42,0.12), inset 0 1px 0 rgba(255,255,255,0.65)`,
                                    }}
                                  />
                                </div>
                              ) : null}
                            </button>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {banner && (
        <div className="pointer-events-none fixed inset-x-0 top-28 z-[80] flex justify-center px-4">
          <div
            className="rounded-full border px-5 py-3 text-sm font-semibold shadow-lg backdrop-blur-md"
            style={{
              backgroundColor:
                banner.tone === "good"
                  ? "rgba(219, 250, 226, 0.96)"
                  : banner.tone === "bad"
                    ? "rgba(255, 233, 233, 0.96)"
                    : "rgba(255, 255, 255, 0.96)",
              borderColor:
                banner.tone === "good"
                  ? "rgba(127, 163, 106, 0.28)"
                  : banner.tone === "bad"
                    ? "rgba(239, 68, 68, 0.22)"
                    : "rgba(15,23,42,0.08)",
              color: banner.tone === "bad" ? "#9f1239" : "var(--color-text-main)",
            }}
          >
            {banner.text}
          </div>
        </div>
      )}

      {promptOpen && selectedIndex !== null && currentCard && (
        <KaboomStyleDecisionModal
          open
          title="Answer to claim the square"
          description="Correct answers claim open territory. Attack contests appear automatically when a square is surrounded."
          onIncorrect={handleWrongAnswer}
          onCorrect={handleCorrectAnswer}
          incorrectLabel="❌"
          correctLabel="⭕"
          incorrectAriaLabel="Wrong answer"
          correctAriaLabel="Correct answer"
        >
          {renderPromptCard(currentCard)}
        </KaboomStyleDecisionModal>
      )}

      {rpsOpen && selectedIndex !== null && rpsTargetIndex !== null && rpsDefenderTeamId && (
        <GameSettingsModal className="max-w-4xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-4xl font-black tracking-tight text-red-600 animate-pulse">ATTACK!</h2>
              <p className="mt-2 text-sm font-semibold text-red-500">
                A square has been surrounded. Choose how to resolve the challenge.
              </p>
            </div>
            <button
              onClick={() => {
                setRpsOpen(false);
                setSelectedIndex(null);
                finishTurn(undefined, "neutral", 200);
              }}
              className="rounded-full border border-black/10 bg-white p-2 text-[var(--color-text-muted)] transition hover:-translate-y-0.5 hover:text-[var(--color-text-main)]"
              aria-label="Close challenge"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => setAttackMode("slots")}
              className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                attackMode === "slots"
                  ? "border-transparent bg-[var(--color-accent)] text-white shadow-lg"
                  : "border-black/10 bg-white text-[var(--color-text-main)]"
              }`}
            >
              Slots
            </button>
            <button
              onClick={() => setAttackMode("manual")}
              className={`rounded-full border px-4 py-2 text-sm font-black transition ${
                attackMode === "manual"
                  ? "border-transparent bg-[var(--color-accent)] text-white shadow-lg"
                  : "border-black/10 bg-white text-[var(--color-text-main)]"
              }`}
            >
              Teacher calls it
            </button>
          </div>

          {attackMode === "slots" ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div
                className="rounded-[1.75rem] border p-4 shadow-[0_0_0_2px_rgba(239,68,68,0.06)]"
                style={{
                  borderColor: attackerTeam?.theme.border ?? "rgba(239,68,68,0.22)",
                  background: attackerTeam
                    ? `linear-gradient(180deg, ${attackerTeam.theme.fill}, rgba(255,255,255,0.98) 78%)`
                    : "rgba(255,235,235,0.92)",
                }}
              >
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.24em]" style={{ color: attackerTeam?.theme.text ?? "#b91c1c" }}>
                  <Swords size={15} style={{ color: attackerTeam?.theme.border ?? "#dc2626" }} />
                  {rpsAttackerTeamId ? `${teamsById[rpsAttackerTeamId]?.name ?? "Attacker"} spins` : "Attacker"}
                </div>
                <div className="mt-3 rounded-[1.75rem] border p-4 text-center shadow-inner" style={{ borderColor: attackerTeam?.theme.border ?? "rgba(239,68,68,0.22)", backgroundColor: "rgba(255,255,255,0.95)" }}>
                  <div className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: attackerTeam?.theme.text ?? "#ef4444" }}>Attack wheel</div>
                  <div
                    className={`mt-3 flex h-36 items-center justify-center rounded-[1.5rem] border-2 text-5xl font-black capitalize transition-all duration-150 ${
                      slotAttackerLocked ? "bg-red-50" : "bg-white"
                    }`}
                    style={{
                      borderColor: attackerTeam?.theme.border ?? "rgba(239,68,68,0.22)",
                      color: attackerTeam?.theme.text ?? "#b91c1c",
                      backgroundColor: slotAttackerLocked ? attackerTeam?.theme.fill ?? "rgba(255,235,235,0.8)" : "white",
                      boxShadow: attackerTeam?.theme.glow
                        ? `0 0 0 3px ${attackerTeam.theme.glow}, inset 0 1px 0 rgba(255,255,255,0.8)`
                        : "none",
                    }}
                  >
                    {slotAttackerFace}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-[var(--color-text-muted)]">
                    {slotAttackerLocked ? "Locked in" : "Spinning..."}
                  </div>
                </div>
              </div>

              <div
                className="rounded-[1.75rem] border p-4 shadow-[0_0_0_2px_rgba(239,68,68,0.06)]"
                style={{
                  borderColor: defenderTeam?.theme.border ?? "rgba(239,68,68,0.22)",
                  background: defenderTeam
                    ? `linear-gradient(180deg, ${defenderTeam.theme.fill}, rgba(255,255,255,0.98) 78%)`
                    : "rgba(255,235,235,0.92)",
                }}
              >
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.24em]" style={{ color: defenderTeam?.theme.text ?? "#b91c1c" }}>
                  <Shield size={15} style={{ color: defenderTeam?.theme.border ?? "#dc2626" }} />
                  {rpsDefenderTeamId ? `${teamsById[rpsDefenderTeamId]?.name ?? "Defender"} spins` : "Defender"}
                </div>
                <div className="mt-3 rounded-[1.75rem] border p-4 text-center shadow-inner" style={{ borderColor: defenderTeam?.theme.border ?? "rgba(239,68,68,0.22)", backgroundColor: "rgba(255,255,255,0.95)" }}>
                  <div className="text-[11px] font-black uppercase tracking-[0.3em]" style={{ color: defenderTeam?.theme.text ?? "#ef4444" }}>Defense wheel</div>
                  <div
                    className={`mt-3 flex h-36 items-center justify-center rounded-[1.5rem] border-2 text-5xl font-black capitalize transition-all duration-150 ${
                      slotDefenderLocked ? "bg-red-50" : "bg-white"
                    }`}
                    style={{
                      borderColor: defenderTeam?.theme.border ?? "rgba(239,68,68,0.22)",
                      color: defenderTeam?.theme.text ?? "#b91c1c",
                      backgroundColor: slotDefenderLocked ? defenderTeam?.theme.fill ?? "rgba(255,235,235,0.8)" : "white",
                      boxShadow: defenderTeam?.theme.glow
                        ? `0 0 0 3px ${defenderTeam.theme.glow}, inset 0 1px 0 rgba(255,255,255,0.8)`
                        : "none",
                    }}
                  >
                    {slotDefenderFace}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-[var(--color-text-muted)]">
                    {slotDefenderLocked ? "Locked in" : "Spinning..."}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[1.75rem] border border-red-200 bg-red-50 p-5 shadow-[0_0_0_2px_rgba(239,68,68,0.06)]">
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.24em] text-red-700">
                <Shield size={15} className="text-red-600" />
                Teacher decision
              </div>
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                If the class plays rock, paper, scissors in real life, choose the result here.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => resolveManualContest("attacker")}
                  className="btn btn-primary px-5 py-3 text-sm"
                >
                  Attack successful
                </button>
                <button
                  onClick={() => resolveManualContest("defender")}
                  className="btn btn-secondary px-5 py-3 text-sm"
                >
                  Defend successful
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 rounded-[1.5rem] border border-red-200 bg-white/95 p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 text-sm font-semibold text-[var(--color-text-main)]">
              <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-green-50 px-3 py-1.5 text-green-700">
                <span className="text-lg font-black">O</span>
                Win the square
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-red-700">
                <span className="text-lg font-black">X</span>
                Defend the square
              </div>
            </div>
            <p className="mt-3 text-center text-sm text-[var(--color-text-muted)]">
              Green O means the square changes colour. Red X means the defender keeps it.
            </p>
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={() => {
                setRpsOpen(false);
                setPromptOpen(false);
                setSelectedIndex(null);
                finishTurn("Challenge skipped.", "neutral", 700);
              }}
              className="btn btn-secondary px-5 py-3 text-sm"
            >
              Skip
            </button>
            {attackMode === "slots" && (
              <button onClick={startSlotContest} className="btn btn-primary px-5 py-3 text-sm">
                Start spin
              </button>
            )}
          </div>
        </GameSettingsModal>
      )}

      {contestResultPopup && (
        <div className="pointer-events-none fixed inset-0 z-[85] flex items-center justify-center px-4">
          <div
            className="max-w-[min(92vw,42rem)] rounded-[2.5rem] border-4 border-white/70 px-8 py-8 text-center shadow-[0_30px_90px_rgba(15,23,42,0.24)] backdrop-blur-md"
            style={{
              backgroundColor:
                contestResultPopup.tone === "good"
                  ? "rgba(219, 250, 226, 0.98)"
                  : contestResultPopup.tone === "bad"
                    ? "rgba(255, 233, 233, 0.98)"
                    : "rgba(255, 255, 255, 0.98)",
              color:
                contestResultPopup.tone === "bad"
                  ? "#991b1b"
                  : contestResultPopup.tone === "good"
                    ? "#224d31"
                    : "var(--color-text-main)",
            }}
          >
            <div className="text-[0.7rem] font-black uppercase tracking-[0.5em] text-red-500">CONQUER</div>
            <div className="mt-3 text-3xl font-black tracking-tight md:text-5xl">{contestResultPopup.text}</div>
          </div>
        </div>
      )}

      {winnerModalOpen && (
        <GameWinnerModal
          title={winningTeams.length > 1 ? "It's a tie!" : `${winningTeams[0]?.name ?? "Team 1"} wins!`}
          message={winningTeams.length > 1
            ? `${winningTeams.map((team) => team.name).join(" and ")} finished level on territory.`
            : `${winningTeams[0]?.name ?? "Team 1"} finished with the most territory.`}
          onClose={() => setWinnerModalOpen(false)}
          onPlayAgain={rebuildGame}
          onReturnToGames={() => router.push("/games")}
        >
            <div className="grid gap-3 sm:grid-cols-2">
              {winningTeams.map((team) => (
                <div
                  key={team.id}
                  className="rounded-[1.35rem] border px-4 py-4 shadow-sm"
                  style={{
                    borderColor: team.theme.border,
                    background: `linear-gradient(180deg, ${team.theme.fill}, rgba(255,255,255,0.98) 82%)`,
                  }}
                >
                  <div className="text-lg font-black tracking-tight text-[var(--color-text-main)]">{team.name}</div>
                  <div className="mt-1 text-sm font-semibold" style={{ color: team.theme.text }}>
                    {totalOwned[team.id] ?? 0} squares
                  </div>
                </div>
              ))}
            </div>
        </GameWinnerModal>
      )}

      <style jsx global>{`
        @keyframes conquer-bomb-shake {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg);
          }
          15% {
            transform: translate3d(-3px, 2px, 0) rotate(-0.12deg);
          }
          30% {
            transform: translate3d(4px, -3px, 0) rotate(0.16deg);
          }
          45% {
            transform: translate3d(-4px, 2px, 0) rotate(-0.18deg);
          }
          60% {
            transform: translate3d(3px, -2px, 0) rotate(0.14deg);
          }
          75% {
            transform: translate3d(-2px, 1px, 0) rotate(-0.08deg);
          }
          100% {
            transform: translate3d(0, 0, 0) rotate(0deg);
          }
        }
        .conquer-bomb-board {
          animation: conquer-bomb-shake 520ms ease-in-out 1;
        }
        @keyframes conquer-bomb-ring-1 {
          0% {
            transform: translate(-50%, -50%) scale(0.32);
            opacity: 0.95;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.35);
            opacity: 0;
          }
        }
        .conquer-bomb-ring-1 {
          animation: conquer-bomb-ring-1 520ms ease-out forwards;
        }
        @keyframes conquer-bomb-ring-2 {
          0% {
            transform: translate(-50%, -50%) scale(0.62);
            opacity: 0.55;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.7);
            opacity: 0;
          }
        }
        .conquer-bomb-ring-2 {
          animation: conquer-bomb-ring-2 700ms ease-out forwards;
        }
      `}</style>
    </div>
  );
}
