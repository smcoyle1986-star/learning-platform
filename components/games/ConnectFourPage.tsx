"use client";

import { readGameTrayRaw } from "@/lib/games/session";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import GameHeader from "@/components/games/GameHeader";
import { MobileScorePanel } from "@/components/games/MobileScorePanel";
import { GameSettingsModal } from "@/components/games/GameSettingsSurface";
import KaboomStyleDecisionModal from "@/components/games/KaboomStyleDecisionModal";
import { GameWinnerModal } from "@/components/games/GameWinnerModal";
import { supabase } from "@/lib/supabase/client";
import { trackGameStart } from "@/lib/games/track-game-start";
import { DemoNextStep, DemoTutorial } from "@/components/demo/DemoTutorial";
import { ANIMALS_DEMO_CARDS, isAnimalsDemoSearch } from "@/lib/demo/animals";

/*
  Connect Four — Classendo style
  - Header now includes "Return to Games" button.
  - Restart in header only restarts (does NOT open settings).
  - Settings button moved under the scoreboard on the left (shows current options).
  - Column numbers are always visible and bold black (selected column becomes blue/white).
  - Other gameplay behavior unchanged.
*/

type TrayCard = { id: string; word: string; image?: string | null; audio?: string | null };

const DEFAULT_COLS = 7;
const DEFAULT_ROWS = 6;

type Player = 1 | 2;
type Cell = 0 | Player;
type AiLevel = "none" | "easy" | "medium" | "hard";

const CBUTTON = "btn btn-secondary px-3 py-1";
const RBUTTON = "btn btn-secondary px-3 py-1";

const ACTIVE_BOARD_THEME: Record<Player, { shell: string; border: string; glow: string; inner: string }> = {
  1: {
    shell: "linear-gradient(180deg, rgba(255, 245, 245, 0.98) 0%, rgba(254, 232, 232, 0.96) 100%)",
    border: "rgba(239, 68, 68, 0.18)",
    glow: "0 18px 50px rgba(239, 68, 68, 0.12)",
    inner: "linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 248, 248, 0.82) 100%)",
  },
  2: {
    shell: "linear-gradient(180deg, rgba(255, 251, 235, 0.98) 0%, rgba(254, 249, 195, 0.96) 100%)",
    border: "rgba(234, 179, 8, 0.18)",
    glow: "0 18px 50px rgba(234, 179, 8, 0.12)",
    inner: "linear-gradient(180deg, rgba(255, 255, 255, 0.88) 0%, rgba(255, 251, 236, 0.82) 100%)",
  },
};

function resolveImageUrl(value?: string | null) {
  const raw = (value ?? "").toString().trim();
  if (!raw) return null;
  if (raw.startsWith("http")) return raw;
  return supabase.storage.from("vocab-images").getPublicUrl(raw).data.publicUrl;
}

function createEmptyBoard(rows: number, cols: number): Cell[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0 as Cell));
}
function cloneBoard(board: Cell[][]) {
  return board.map((r) => r.slice());
}
function availableCols(board: Cell[][]) {
  const cols = board[0].length;
  const avail: number[] = [];
  for (let c = 0; c < cols; c++) if (board[0][c] === 0) avail.push(c);
  return avail;
}
function checkWin(board: Cell[][], rows: number, cols: number) {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ] as const;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const p = board[r][c];
      if (!p) continue;
      for (const [dr, dc] of directions) {
        const line: [number, number][] = [[r, c]];
        for (let k = 1; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) break;
          if (board[rr][cc] !== p) break;
          line.push([rr, cc]);
        }
        if (line.length === 4) return { winner: p as Player, line };
      }
    }
  }
  const full = board[0].every((v) => v !== 0);
  if (full) return { winner: 0, line: null, draw: true };
  return { winner: 0, line: null, draw: false };
}
function dropToken(board: Cell[][], cols: number, player: Player, col: number) {
  for (let r = board.length - 1; r >= 0; r--) {
    if (board[r][col] === 0) {
      board[r][col] = player;
      return { success: true, row: r };
    }
  }
  return { success: false, row: -1 };
}

// --- AI helpers (easy/medium/hard) ---
function aiEasyMove(board: Cell[][], rows: number, cols: number, me: Player) {
  const avail = availableCols(board);
  if (avail.length === 0) return -1;
  const opp = me === 1 ? 2 : 1;

  // win if possible
  for (const col of avail) {
    const b = cloneBoard(board);
    if (dropToken(b, cols, me, col).success) {
      const w = checkWin(b, rows, cols);
      if (w.winner === me) return col;
    }
  }
  // block if opponent can win
  for (const col of avail) {
    const b = cloneBoard(board);
    if (dropToken(b, cols, opp, col).success) {
      const w = checkWin(b, rows, cols);
      if (w.winner === opp) return col;
    }
  }
  // prefer center-ish columns
  const center = (cols - 1) / 2;
  const weights = avail.map((c) => 1 / (1 + Math.abs(c - center)));
  const sum = weights.reduce((a, b) => a + b, 0);
  let rnd = Math.random() * sum;
  for (let i = 0; i < avail.length; i++) {
    rnd -= weights[i];
    if (rnd <= 0) return avail[i];
  }
  return avail[0];
}

function aiMediumMove(board: Cell[][], rows: number, cols: number, me: Player) {
  const opp = me === 1 ? 2 : 1;
  const avail = availableCols(board);
  for (const col of avail) {
    const b = cloneBoard(board);
    const res = dropToken(b, cols, me, col);
    if (res.success) {
      const win = checkWin(b, rows, cols);
      if (win.winner === me) return col;
    }
  }
  for (const col of avail) {
    const b = cloneBoard(board);
    const res = dropToken(b, cols, opp, col);
    if (res.success) {
      const win = checkWin(b, rows, cols);
      if (win.winner === opp) return col;
    }
  }
  return avail[Math.floor(Math.random() * avail.length)];
}

function scoreBoard(board: Cell[][], rows: number, cols: number, me: Player) {
  let score = 0;
  const opp = me === 1 ? 2 : 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dirs = [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1],
      ] as const;
      for (const [dr, dc] of dirs) {
        const cells: Cell[] = [];
        for (let k = 0; k < 4; k++) {
          const rr = r + dr * k;
          const cc = c + dc * k;
          if (rr < 0 || rr >= rows || cc < 0 || cc >= cols) {
            cells.length = 0;
            break;
          }
          cells.push(board[rr][cc]);
        }
        if (cells.length !== 4) continue;
        const meCount = cells.filter((v) => v === me).length;
        const oppCount = cells.filter((v) => v === opp).length;
        if (meCount > 0 && oppCount === 0) {
          if (meCount === 4) score += 10000;
          else if (meCount === 3) score += 50;
          else if (meCount === 2) score += 10;
          else score += 1;
        } else if (oppCount > 0 && meCount === 0) {
          if (oppCount === 4) score -= 10000;
          else if (oppCount === 3) score -= 50;
          else if (oppCount === 2) score -= 10;
          else score -= 1;
        }
      }
    }
  }
  return score;
}

function minimax(board: Cell[][], rows: number, cols: number, depth: number, alpha: number, beta: number, maximizing: boolean, me: Player, currentPlayer: Player): { score: number; col: number | null } {
  const win = checkWin(board, rows, cols);
  if (win.winner === me) return { score: 1000000, col: null };
  if (win.winner && win.winner !== me && win.winner !== 0) return { score: -1000000, col: null };
  if (win.draw || depth === 0) return { score: scoreBoard(board, rows, cols, me), col: null };

  const avail = availableCols(board);
  if (avail.length === 0) return { score: 0, col: null };

  let bestCol: number | null = null;
  if (maximizing) {
    let value = -Infinity;
    for (const col of avail) {
      const b = cloneBoard(board);
      const res = dropToken(b, cols, currentPlayer, col);
      if (!res.success) continue;
      const child = minimax(b, rows, cols, depth - 1, alpha, beta, false, me, currentPlayer === 1 ? 2 : 1);
      if (child.score > value) {
        value = child.score;
        bestCol = col;
      }
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return { score: value, col: bestCol };
  } else {
    let value = Infinity;
    for (const col of avail) {
      const b = cloneBoard(board);
      const res = dropToken(b, cols, currentPlayer, col);
      if (!res.success) continue;
      const child = minimax(b, rows, cols, depth - 1, alpha, beta, true, me, currentPlayer === 1 ? 2 : 1);
      if (child.score < value) {
        value = child.score;
        bestCol = col;
      }
      beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return { score: value, col: bestCol };
  }
}

function selectAiMove(board: Cell[][], rows: number, cols: number, level: AiLevel, aiPlayer: Player) {
  const avail = availableCols(board);
  if (avail.length === 0) return -1;
  if (level === "easy") return aiEasyMove(board, rows, cols, aiPlayer);
  if (level === "medium") return aiMediumMove(board, rows, cols, aiPlayer);
  // hard: immediate win/block then minimax
  for (const col of avail) {
    const b = cloneBoard(board);
    const ok = dropToken(b, cols, aiPlayer, col).success;
    if (!ok) continue;
    const w = checkWin(b, rows, cols);
    if (w.winner === aiPlayer) return col;
  }
  const opp = aiPlayer === 1 ? 2 : 1;
  for (const col of avail) {
    const b = cloneBoard(board);
    const ok = dropToken(b, cols, opp, col).success;
    if (!ok) continue;
    const w = checkWin(b, rows, cols);
    if (w.winner === opp) return col;
  }
  const depth = 5;
  const result = minimax(board, rows, cols, depth, -Infinity, Infinity, true, aiPlayer, aiPlayer);
  return result.col ?? avail[Math.floor(Math.random() * avail.length)];
}

/* ---------------------------
   React component
   --------------------------- */

export default function ConnectFourPage({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const [isDemo, setIsDemo] = useState(demo);

  // lesson-tray
  const [tray, setTray] = useState<TrayCard[]>(() => demo ? ANIMALS_DEMO_CARDS.map((card) => ({
    id: card.id,
    word: card.word,
    image: card.image ?? null,
  })) : []);
  useEffect(() => {
    const demoActive = demo || isAnimalsDemoSearch(window.location.search);
    setIsDemo(demoActive);
    if (demoActive) {
      setTray(ANIMALS_DEMO_CARDS.map((card) => ({
        id: card.id,
        word: card.word,
        image: card.image ?? null,
      })));
      setShowSettings(false);
      return;
    }
    try {
      const raw = readGameTrayRaw();
      if (!raw) { setTray([]); return; }
      const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const normalized = parsed.map((c: Record<string, unknown>, i: number) => ({
            id: String(c.id ?? c.word ?? `t-${i}`),
            word: String(c.word ?? c.text ?? c.label ?? ""),
            image: resolveImageUrl(
              typeof c.image === "string" ? c.image
                : typeof c.image_id === "string" ? c.image_id
                  : typeof c.img === "string" ? c.img : null,
            ),
            audio: typeof c.audio === "string" ? c.audio : null,
          })).filter((x) => x.word);
          setTray(normalized);
      } else setTray([]);
    } catch {
      setTray([]);
    }
  }, [demo]);

  // fullscreen expansion
  const [inFullscreen, setInFullscreen] = useState<boolean>(false);
  useEffect(() => {
    function onFull() { setInFullscreen(!!document.fullscreenElement); }
    document.addEventListener("fullscreenchange", onFull);
    return () => document.removeEventListener("fullscreenchange", onFull);
  }, []);

  useEffect(() => {
    if (!isDemo) return;
    document.body.classList.add("classendo-demo-immersive");
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => undefined);
    }
    return () => document.body.classList.remove("classendo-demo-immersive");
  }, [isDemo]);

  // settings
  const [showSettings, setShowSettings] = useState<boolean>(!demo);
  const [showNoCardsModal, setShowNoCardsModal] = useState<boolean>(false);
  const [aiLevel, setAiLevel] = useState<AiLevel>("none");
  const [firstToWins, setFirstToWins] = useState<number>(3);
  const [boardCols, setBoardCols] = useState<number>(DEFAULT_COLS);
  const [boardRows, setBoardRows] = useState<number>(DEFAULT_ROWS);

  // runtime
  const [board, setBoard] = useState<Cell[][]>(() => createEmptyBoard(DEFAULT_ROWS, DEFAULT_COLS));
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [cursorCol, setCursorCol] = useState<number>(Math.floor(DEFAULT_COLS / 2));
  const [aiFocusCol, setAiFocusCol] = useState<number | null>(null);
  const [winnerLine, setWinnerLine] = useState<[number, number][] | null>(null);
  const [matchWins, setMatchWins] = useState<Record<number, number>>({ 1: 0, 2: 0 });
  const [mobileScoreOpen, setMobileScoreOpen] = useState(false);
  const [matchWinnerModalOpen, setMatchWinnerModalOpen] = useState(false);
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);
  const didTrackMatchStartRef = useRef(false);
  const matchCompletionShownRef = useRef(false);
  const activeBoardTheme = ACTIVE_BOARD_THEME[currentPlayer];
  const matchWinner = (matchWins[1] ?? 0) >= firstToWins ? 1 : (matchWins[2] ?? 0) >= firstToWins ? 2 : null;

  // falling animation state
  const [falling, setFalling] = useState<{ col: number; row: number; player: Player } | null>(null);

  // game-over draw state
  const [gameOverDraw, setGameOverDraw] = useState<boolean>(false);

  // music
  const [musicOn, setMusicOn] = useState<boolean>(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicIntervalRef = useRef<number | null>(null);
  function getAudioCtx() {
    if (!audioCtxRef.current) {
      try {
        const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
        const AudioContextConstructor = window.AudioContext || audioWindow.webkitAudioContext;
        audioCtxRef.current = AudioContextConstructor ? new AudioContextConstructor() : null;
      } catch { audioCtxRef.current = null; }
    }
    return audioCtxRef.current;
  }
  function playTone(freq = 440, dur = 0.18, type: OscillatorType = "sine", gain = 0.04) {
    const ctx = getAudioCtx(); if (!ctx) return;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain; o.connect(g); g.connect(ctx.destination);
    const now = ctx.currentTime; o.start(now); g.gain.setValueAtTime(gain, now); g.gain.linearRampToValueAtTime(0.0001, now + dur); o.stop(now + dur + 0.02);
  }
  function toggleMusic() {
    const will = !musicOn; setMusicOn(will);
    const ctx = getAudioCtx(); if (!ctx) return;
    if (will) {
      ctx.resume().catch(() => {});
      if (musicIntervalRef.current) return;
      const seq = [330, 392, 523, 660, 523, 392];
      let step = 0;
      musicIntervalRef.current = window.setInterval(() => { playTone(seq[step++ % seq.length], 0.16, "sine", 0.03); }, 420) as unknown as number;
    } else {
      if (musicIntervalRef.current) { clearInterval(musicIntervalRef.current); musicIntervalRef.current = null; }
      ctx.suspend().catch(() => {});
    }
  }

  // AI
  const [aiPlaysAs, setAiPlaysAs] = useState<Player>(2);
  const aiTimeoutsRef = useRef<number[]>([]);

  // LEARNING modal state
  const [selectedColForModal, setSelectedColForModal] = useState<number | null>(null);
  const [learningCard, setLearningCard] = useState<TrayCard | null>(null);
  const [showLearningLabel, setShowLearningLabel] = useState<boolean>(false);
  const [showMissedTurn, setShowMissedTurn] = useState<boolean>(false);
  const [modalDisplayMode, setModalDisplayMode] = useState<"image+text" | "image" | "text">("image+text");
  const [demoRoundPromptDismissed, setDemoRoundPromptDismissed] = useState(false);
  const [showDemoWorksheetPrompt, setShowDemoWorksheetPrompt] = useState(false);
  const [showDemoFinalWorksheetPrompt, setShowDemoFinalWorksheetPrompt] = useState(false);
  const [demoWorksheetLinkVisible, setDemoWorksheetLinkVisible] = useState(false);

  // Show no-cards modal when tray empty
  useEffect(() => {
    if (tray.length === 0) {
      setShowNoCardsModal(true);
      setShowSettings(false);
    } else {
      setShowNoCardsModal(false);
    }
  }, [tray]);

  useEffect(() => {
    setBoard(createEmptyBoard(boardRows, boardCols));
    setCursorCol(Math.floor(boardCols / 2));
    didTrackMatchStartRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardCols, boardRows]);

  // keyboard controls
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showSettings || showNoCardsModal || winnerLine || matchWinner || isAiThinking) return;
      if (e.key === "ArrowLeft") setCursorCol((c) => Math.max(0, c - 1));
      else if (e.key === "ArrowRight") setCursorCol((c) => Math.min(boardCols - 1, c + 1));
      else if (e.key === "Enter") handleColumnClick(cursorCol);
      else {
        const n = parseInt(e.key, 10);
        if (!isNaN(n) && n >= 1 && n <= boardCols) {
          const colIndex = n - 1;
          setCursorCol(colIndex);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSettings, showNoCardsModal, boardCols, cursorCol, winnerLine, matchWinner, isAiThinking]);

  // Column click handler (shows learning modal for human players)
  function handleColumnClick(col: number) {
    setCursorCol(col);
    const humanTurn = aiLevel === "none" || aiPlaysAs !== currentPlayer;
    if (!humanTurn) return; // ignore if AI's turn
    if (!tray.length) return; // no cards
    const card = tray[Math.floor(Math.random() * tray.length)];
    setLearningCard(card);
    setShowLearningLabel(false);
    setSelectedColForModal(col);
  }

  // confirm learning modal -> drop
  function confirmLearningAndDrop() {
    const col = selectedColForModal;
    if (col == null) return;
    setSelectedColForModal(null);
    setLearningCard(null);
    setShowLearningLabel(false);
    handleDropAnimated(col);
  }

  function buildAiThinkingPath(startCol: number, chosenCol: number, availableColsList: number[]) {
    const pool = availableColsList.length > 0 ? availableColsList : [chosenCol];
    const path: number[] = [];
    let cursor = startCol;

    if (cursor !== chosenCol) {
      path.push(cursor);
    }

    const introSteps = aiLevel === "hard"
      ? 2 + Math.floor(Math.random() * 5)
      : aiLevel === "medium"
        ? 1 + Math.floor(Math.random() * 4)
        : 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < introSteps; i++) {
      const options = pool.filter((col) => col !== cursor && col !== chosenCol);
      const next = options.length > 0 ? options[Math.floor(Math.random() * options.length)] : chosenCol;
      if (next !== cursor) {
        path.push(next);
        cursor = next;
      }
    }

    if (cursor !== chosenCol) {
      path.push(chosenCol);
    }

    return path;
  }

  // deny learning modal -> miss turn
  function denyLearningAndMissTurn() {
    setSelectedColForModal(null);
    setLearningCard(null);
    setShowLearningLabel(false);
    setShowMissedTurn(true);
    setCurrentPlayer((p) => (p === 1 ? 2 : 1) as Player);
    window.setTimeout(() => setShowMissedTurn(false), 1600);
  }

  // standard drop
  function handleDrop(col: number) {
    if (showSettings || showNoCardsModal || winnerLine || matchWinner || isAiThinking) return;
    if (!didTrackMatchStartRef.current) {
      didTrackMatchStartRef.current = true;
      trackGameStart("connect-four");
    }
    const b = cloneBoard(board);
    for (let r = boardRows - 1; r >= 0; r--) {
      if (b[r][col] === 0) {
        b[r][col] = currentPlayer;
        setBoard(b);
        const res = checkWin(b, boardRows, boardCols);
        if (res.winner && res.winner !== 0) {
          setWinnerLine(res.line ?? null);
          setMatchWins((m) => ({ ...m, [res.winner!]: (m[res.winner!] ?? 0) + 1 }));
        } else if (res.draw) {
          setWinnerLine(null);
          setGameOverDraw(true);
        } else {
          setCurrentPlayer((p) => (p === 1 ? 2 : 1) as Player);
        }
        break;
      }
    }
  }

  // animated falling drop
  function handleDropAnimated(col: number) {
    if (showSettings || showNoCardsModal || winnerLine || matchWinner || isAiThinking || falling) return;
    if (!didTrackMatchStartRef.current) {
      didTrackMatchStartRef.current = true;
      trackGameStart("connect-four");
    }
    const b = cloneBoard(board);
    let dropRow = -1;
    for (let r = boardRows - 1; r >= 0; r--) {
      if (b[r][col] === 0) { dropRow = r; break; }
    }
    if (dropRow < 0) return;
    setFalling({ col, row: -1, player: currentPlayer });
    const baseDuration = 0.28;
    const perRow = 0.08;
    const duration = baseDuration + Math.max(0, dropRow) * perRow;
    const t = window.setTimeout(() => {
      const nb = cloneBoard(board);
      nb[dropRow][col] = currentPlayer;
      setBoard(nb);
      setFalling(null);
      const res = checkWin(nb, boardRows, boardCols);
      if (res.winner && res.winner !== 0) {
        setWinnerLine(res.line ?? null);
        setMatchWins((m) => ({ ...m, [res.winner!]: (m[res.winner!] ?? 0) + 1 }));
      } else if (res.draw) {
        setWinnerLine(null);
        setGameOverDraw(true);
      } else {
        setCurrentPlayer((p) => (p === 1 ? 2 : 1) as Player);
      }
    }, duration * 1000 + 60) as unknown as number;
    aiTimeoutsRef.current.push(t);
  }

  // AI drama + falling
  useEffect(() => {
    if (showSettings || showNoCardsModal || winnerLine || matchWinner) return;
    if (aiLevel !== "none" && aiPlaysAs === currentPlayer) {
      doAiMoveWithDrama();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, aiLevel, aiPlaysAs, showSettings, showNoCardsModal, winnerLine, matchWinner]);

  async function doAiMoveWithDrama() {
    if (isAiThinking) return;
    setIsAiThinking(true);

    const chosen = selectAiMove(board, boardRows, boardCols, aiLevel, aiPlaysAs);
    const avail = availableCols(board);
    if (chosen < 0 || avail.length === 0) {
      setIsAiThinking(false);
      return;
    }

    const seq = buildAiThinkingPath(cursorCol, chosen, avail);
    const thinkProfile = (() => {
      const roll = Math.random();
      if (roll < 0.28) {
        return { min: 2, max: 3, base: aiLevel === "hard" ? 180 : aiLevel === "medium" ? 160 : 140 };
      }
      if (roll < 0.78) {
        return { min: 3, max: 5, base: aiLevel === "hard" ? 250 : aiLevel === "medium" ? 220 : 190 };
      }
      return { min: 5, max: 8, base: aiLevel === "hard" ? 340 : aiLevel === "medium" ? 300 : 250 };
    })();
    const pulseSpacing = thinkProfile.base + Math.floor(Math.random() * 70);
    const pulseCount = Math.max(
      thinkProfile.min,
      Math.min(thinkProfile.max, seq.length + Math.floor(Math.random() * 3))
    );

    aiTimeoutsRef.current.forEach((t) => clearTimeout(t));
    aiTimeoutsRef.current = [];
    let accumulated = 0;
    const nonFinalSteps = Math.max(0, pulseCount - 1);
    const thinkPath = seq.length > 1
      ? [...seq.slice(0, Math.min(seq.length - 1, nonFinalSteps)), chosen]
      : [chosen];
    for (let i = 0; i < thinkPath.length; i++) {
      const col = thinkPath[i];
      const stepDelay = pulseSpacing + Math.floor(Math.random() * 120) - i * 18;
      accumulated += stepDelay;
      const t = window.setTimeout(() => {
        setCursorCol(col);
        setAiFocusCol(col);
      }, accumulated) as unknown as number;
      aiTimeoutsRef.current.push(t);
    }

    const finalThinkPause = 180 + Math.floor(Math.random() * 260);
    const finalDelay = accumulated + finalThinkPause;
    const finalT = window.setTimeout(() => {
      handleDropAnimated(chosen);
      setIsAiThinking(false);
      setAiFocusCol(null);
    }, finalDelay) as unknown as number;
    aiTimeoutsRef.current.push(finalT);
  }

  function cancelAiTimeouts() {
    aiTimeoutsRef.current.forEach((t) => clearTimeout(t));
    aiTimeoutsRef.current = [];
    setAiFocusCol(null);
  }

  // restart match — now strictly restart (does NOT open settings)
  function restartMatch() {
    cancelAiTimeouts();
    setBoard(createEmptyBoard(boardRows, boardCols));
    didTrackMatchStartRef.current = false;
    setWinnerLine(null);
    setGameOverDraw(false);
    setMatchWins({ 1: 0, 2: 0 });
    setMatchWinnerModalOpen(false);
    matchCompletionShownRef.current = false;
    setCurrentPlayer(1);
    setIsAiThinking(false);
    setFalling(null);
    setSelectedColForModal(null);
    // do not auto-open settings here
  }

  useEffect(() => {
    if (matchWinner && !matchCompletionShownRef.current) {
      matchCompletionShownRef.current = true;
      setWinnerLine(null);
      setGameOverDraw(false);
      setMatchWinnerModalOpen(true);
      cancelAiTimeouts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchWinner]);

  useEffect(() => {
    if (!isDemo || matchWinner || demoRoundPromptDismissed || (!winnerLine && !gameOverDraw)) return;
    setShowDemoWorksheetPrompt(true);
  }, [demoRoundPromptDismissed, gameOverDraw, isDemo, matchWinner, winnerLine]);

  useEffect(() => {
    if (isDemo && matchWinner) setShowDemoFinalWorksheetPrompt(true);
  }, [isDemo, matchWinner]);

  useEffect(() => {
    return () => {
      cancelAiTimeouts();
      if (musicIntervalRef.current) clearInterval(musicIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UI
  return (
    <div data-demo-immersive={isDemo || undefined} className={`connect-four-page ${isDemo ? "min-h-[100dvh] overflow-hidden p-3 pt-20" : "min-h-screen p-6 pt-24"} bg-[var(--color-bg-main)] text-[var(--color-text-main)]`}>
      <div className={`mx-auto ${inFullscreen ? "max-w-full" : "max-w-6xl"}`}>
        <GameHeader
          title="Connect Four"
          onExit={() => router.push(isDemo ? "/demo/animals" : "/games")}
          isFullscreen={inFullscreen}
          onToggleFullscreen={() => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
          }}
          settingsOpen={showSettings}
          onToggleSettings={() => setShowSettings((s) => !s)}
          trackGameKey="connect-four"
          exitLabel={isDemo ? "Back to home" : undefined}
          hideBrand={isDemo}
          mobileScoreOpen={mobileScoreOpen}
          onToggleMobileScore={() => setMobileScoreOpen((open) => !open)}
        />

        <div className={`connect-four-layout ${isDemo ? "flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-4" : "flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-6"}`}>
          {/* Left: scoreboard */}
          <MobileScorePanel open={mobileScoreOpen} className={isDemo ? "w-full lg:w-56" : "w-full lg:w-56"}>
            <div className="bg-white rounded p-3 shadow flex flex-col">
              <div>
                <div className="font-semibold mb-2">Match (first to {firstToWins})</div>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between"><div>Player 1</div><div className="font-bold">{matchWins[1] ?? 0}</div></div>
                  <div className="flex justify-between"><div>{aiLevel === "none" ? "Player 2" : `Player ${aiPlaysAs === 2 ? "AI" : "2"}`}</div><div className="font-bold">{matchWins[2] ?? 0}</div></div>
                </div>
                <div className="mt-3 text-xs text-gray-500">Use number keys or arrows to choose column, click number to see image, then ✅/❌.</div>
              </div>
            </div>
          </MobileScorePanel>

          <div className="min-w-0 flex-1">
            <div
              data-game-stage
              className="connect-four-stage p-4 rounded-[32px] border shadow-[0_18px_50px_rgba(0,0,0,0.08)]"
              style={{
                height: inFullscreen || isDemo ? "calc(100dvh - 7rem)" : "620px",
                background: activeBoardTheme.shell,
                borderColor: activeBoardTheme.border,
                boxShadow: `${activeBoardTheme.glow}, 0 18px 50px rgba(0,0,0,0.08)`,
              }}
            >
              <div
                className="mt-2 rounded-[28px] overflow-hidden border shadow-inner p-4 h-full"
                style={{
                  background: activeBoardTheme.inner,
                  borderColor: activeBoardTheme.border,
                  boxShadow: `${activeBoardTheme.glow}, inset 0 1px 0 rgba(255,255,255,0.72)`,
                }}
              >
                <div className="h-full w-full flex flex-col min-h-0">
                  <div className="grid shrink-0" style={{ gridTemplateColumns: `repeat(${boardCols}, minmax(0, 1fr))`, gap: 10 }}>
                    {Array.from({ length: boardCols }, (_, col) => {
                      const active = col === cursorCol;
                      const aiFocused = isAiThinking && aiFocusCol === col;
                      const columnHasSpace = board[0]?.[col] === 0;
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => handleColumnClick(col)}
                          disabled={showSettings || showNoCardsModal || !!winnerLine || !!matchWinner || isAiThinking || !columnHasSpace}
                          className={`rounded-full border px-2 py-2 font-extrabold transition-transform ${
                            aiFocused
                              ? "bg-[var(--color-accent)] text-white border-transparent scale-110 shadow-[0_12px_30px_rgba(37,99,235,0.35)]"
                              : active
                                ? "bg-[var(--color-accent)] text-white border-transparent scale-105 shadow-md"
                                : "bg-white text-black border-black/10"
                          } ${columnHasSpace ? "hover:-translate-y-0.5" : "opacity-40 cursor-not-allowed"}`}
                          style={{ minHeight: 44 }}
                        >
                          {col + 1}
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative mt-3 flex-1 min-h-0">
                    <div
                      className="absolute inset-0 rounded-[28px] overflow-hidden border border-black/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]"
                      style={{
                        background:
                          "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
                      }}
                    >
                      <div
                        className="grid h-full w-full p-2"
                        style={{
                          gridTemplateColumns: `repeat(${boardCols}, minmax(0, 1fr))`,
                          gridTemplateRows: `repeat(${boardRows}, minmax(0, 1fr))`,
                          gap: 8,
                        }}
                      >
                        {board.map((row, r) =>
                          row.map((cell, c) => {
                            const isWinning = !!winnerLine?.some(([wr, wc]) => wr === r && wc === c);
                            const isActiveColumn = c === cursorCol;
                            const aiFocused = isAiThinking && aiFocusCol === c;
                            const isDropped = cell !== 0;
                            return (
                              <button
                                key={`${r}-${c}`}
                                type="button"
                                onClick={() => handleColumnClick(c)}
                                disabled={showSettings || showNoCardsModal || !!winnerLine || !!matchWinner || isAiThinking || r !== 0}
                                className={`relative rounded-[22px] border-2 transition-all duration-200 overflow-hidden ${
                                  isActiveColumn ? "ring-2 ring-[var(--color-accent)] ring-offset-2" : ""
                                } ${isWinning ? "scale-[1.04]" : ""} ${aiFocused ? "ring-4 ring-blue-300 ring-offset-2" : ""}`}
                                style={{
                                  background: isWinning
                                    ? "rgba(253,224,71,0.22)"
                                    : aiFocused
                                      ? "rgba(191,219,254,0.24)"
                                      : "rgba(255,255,255,0.22)",
                                  borderColor: isWinning
                                    ? "rgba(250,204,21,0.95)"
                                    : aiFocused
                                      ? "rgba(96,165,250,0.95)"
                                      : "rgba(15,23,42,0.08)",
                                  boxShadow: isWinning
                                    ? "0 0 0 6px rgba(250, 204, 21, 0.22), 0 18px 40px rgba(250, 204, 21, 0.18)"
                                    : aiFocused
                                      ? "0 0 0 6px rgba(96,165,250,0.18), 0 18px 36px rgba(37,99,235,0.14)"
                                      : undefined,
                                  minHeight: 0,
                                }}
                              >
                                <div
                                  className={`absolute inset-0 rounded-[18px] bg-[linear-gradient(180deg,#2563eb,#1d4ed8)] ${
                                    isWinning || aiFocused ? "animate-pulse" : ""
                                  }`}
                                />
                                {(isWinning || aiFocused) && (
                                  <div className="absolute inset-0 rounded-[18px] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.42),transparent_58%)] animate-pulse" />
                                )}
                                <div
                                  className={`absolute inset-0 rounded-[18px] flex items-center justify-center transition-transform duration-300 ${
                                    isDropped ? "scale-100" : "scale-95"
                                  }`}
                                >
                                  <div
                                    className={`rounded-full shadow-[0_10px_25px_rgba(15,23,42,0.12)] ${
                                      isWinning || aiFocused ? "animate-pulse" : ""
                                    }`}
                                    style={{
                                      width: isWinning || aiFocused ? "76%" : "72%",
                                      height: isWinning || aiFocused ? "76%" : "72%",
                                      background: cell === 0 ? "rgba(255,255,255,0.92)" : cell === 1 ? "#ef4444" : "#facc15",
                                      border: isWinning || aiFocused ? "6px solid rgba(255,255,255,0.98)" : "4px solid rgba(255,255,255,0.85)",
                                    }}
                                  />
                                </div>
                                {(isWinning || aiFocused) && (
                                  <div className="pointer-events-none absolute inset-0 rounded-[18px] border-2 border-amber-200/80" />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>

                      {falling && (
                        <motion.div
                          key={`${falling.col}-${falling.player}-${falling.row}`}
                          className="absolute z-20 pointer-events-none"
                          initial={false}
                          animate={{
                            left: `${((falling.col + 0.5) / boardCols) * 100}%`,
                            top: `${Math.max(8, 6 + ((Math.max(falling.row, 0) + 0.5) / boardRows) * 86)}%`,
                          }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          style={{ width: "10%", aspectRatio: "1 / 1", transform: "translate(-50%, -50%)" }}
                        >
                          <div
                            className="w-full h-full rounded-full shadow-[0_12px_30px_rgba(15,23,42,0.18)]"
                            style={{ background: falling.player === 1 ? "#ef4444" : "#facc15", border: "4px solid rgba(255,255,255,0.9)" }}
                          />
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <AnimatePresence>
          {selectedColForModal !== null && learningCard && (
            <KaboomStyleDecisionModal
              open
              title="Identify the image"
              description="Click the image to reveal the word. ✅ lets you drop; ❌ misses your turn. Timer continues while modal is open."
              onCorrect={confirmLearningAndDrop}
              onIncorrect={denyLearningAndMissTurn}
              incorrectLabel="❌"
              correctLabel="⭕"
              incorrectAriaLabel="Miss turn"
              correctAriaLabel="Correct and drop"
            >
              <motion.div
                initial={{ scale: 0.98 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.98 }}
                className="flex min-h-0 w-full flex-1 flex-col items-center gap-3"
              >
                <div className="w-full flex justify-center">
                  <div
                    className="flex h-[min(48vh,32rem)] min-h-0 w-[min(82vw,40rem)] max-h-full items-center justify-center overflow-hidden rounded-[2rem] border border-black/5 bg-gray-100 shadow cursor-pointer"
                    onClick={() => setShowLearningLabel((s) => !s)}
                  >
                    {modalDisplayMode !== "text" && learningCard.image ? (
                      <div className="flex h-full w-full items-center justify-center p-4 md:p-6">
                        <img
                          src={learningCard.image}
                          alt={learningCard.word}
                          className={`h-auto w-auto max-h-full max-w-full object-contain ${modalDisplayMode === "image" ? "scale-100" : ""}`}
                        />
                      </div>
                    ) : modalDisplayMode !== "text" ? (
                      <div className="text-gray-400">No image available</div>
                    ) : null}
                    {modalDisplayMode === "text" && (
                      <div className="w-full h-full flex items-center justify-center px-6 py-8">
                        <div className="text-5xl md:text-6xl font-extrabold text-center leading-tight">
                          {learningCard.word}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="min-h-[2rem]">
                  {modalDisplayMode === "image+text" && showLearningLabel && (
                    <div className="text-2xl md:text-3xl font-semibold text-center">{learningCard.word}</div>
                  )}
                  {modalDisplayMode === "image" && showLearningLabel && (
                    <div className="text-2xl md:text-3xl font-semibold text-center">{learningCard.word}</div>
                  )}
                </div>

                <div className="text-xs text-gray-500 mt-3">Selected column: {selectedColForModal + 1}</div>
              </motion.div>
            </KaboomStyleDecisionModal>
          )}
        </AnimatePresence>

        {/* Missed-turn message */}
        <AnimatePresence>
          {showMissedTurn && (
            <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="fixed inset-x-0 top-24 z-50 flex items-center justify-center pointer-events-none">
              <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} exit={{ scale: 0.98 }} className="bg-white/95 backdrop-blur rounded-xl p-4 shadow-lg flex items-center gap-3">
                <div className="text-3xl">😢</div>
                <div>
                  <div className="font-semibold">Missed turn</div>
                  <div className="text-sm text-gray-600">That team missed their turn — play continues.</div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* No-cards modal */}
        <AnimatePresence>
          {showNoCardsModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
              <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -8, opacity: 0 }} className="bg-white rounded-xl p-6 w-full max-w-md text-center">
                <h3 className="text-xl font-bold mb-2">No cards selected</h3>
                <p className="text-sm text-gray-600 mb-4">This game expects lesson cards to be selected. Please select cards to use with classroom activities.</p>
                <div className="flex justify-center gap-3">
                  <button className={CBUTTON} onClick={() => router.push("/flashcards")}>Go to Flashcards</button>
                  <button className={CBUTTON} onClick={() => router.push("/")}>Return to My Lessons</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings modal */}
        <AnimatePresence>
          {showSettings && !showNoCardsModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GameSettingsModal className="max-w-3xl">
                <h2 className="text-xl font-bold mb-3">Connect Four — Settings</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm font-medium mb-2">Board</div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm">Cols</label>
                      <input type="number" min={5} max={12} value={boardCols} onChange={(e) => setBoardCols(Number(e.target.value || DEFAULT_COLS))} className="w-20 border px-2 py-1 rounded" />
                      <label className="text-sm">Rows</label>
                      <input type="number" min={4} max={10} value={boardRows} onChange={(e) => setBoardRows(Number(e.target.value || DEFAULT_ROWS))} className="w-20 border px-2 py-1 rounded" />
                    </div>
                    <div className="mt-3">
                      <div className="text-sm font-medium">First to (match wins)</div>
                      <input type="number" min={1} max={10} value={firstToWins} onChange={(e) => setFirstToWins(Number(e.target.value || 3))} className="w-20 border px-2 py-1 rounded" />
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-2">Opponent</div>
                    <div className="flex gap-2 mb-3">
                      <label className={`px-3 py-1 rounded border cursor-pointer ${aiLevel === "none" ? "bg-[var(--color-accent)] text-white" : "bg-white"}`}><input type="radio" name="ai" hidden checked={aiLevel === "none"} onChange={() => { setAiLevel("none"); setAiPlaysAs(2); }} />Human</label>
                      <label className={`px-3 py-1 rounded border cursor-pointer ${aiLevel === "easy" ? "bg-[var(--color-accent)] text-white" : "bg-white"}`}><input type="radio" name="ai" hidden checked={aiLevel === "easy"} onChange={() => { setAiLevel("easy"); setAiPlaysAs(2); }} />AI Easy</label>
                      <label className={`px-3 py-1 rounded border cursor-pointer ${aiLevel === "medium" ? "bg-[var(--color-accent)] text-white" : "bg-white"}`}><input type="radio" name="ai" hidden checked={aiLevel === "medium"} onChange={() => { setAiLevel("medium"); setAiPlaysAs(2); }} />AI Medium</label>
                      <label className={`px-3 py-1 rounded border cursor-pointer ${aiLevel === "hard" ? "bg-[var(--color-accent)] text-white" : "bg-white"}`}><input type="radio" name="ai" hidden checked={aiLevel === "hard"} onChange={() => { setAiLevel("hard"); setAiPlaysAs(2); }} />AI Hard</label>
                    </div>

                    <div className="mt-3">
                      <div className="text-sm font-medium mb-2">Game controls</div>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => restartMatch()} className={CBUTTON}>
                          Restart Match
                        </button>
                        <button onClick={() => toggleMusic()} className={CBUTTON}>
                          {musicOn ? "Music On" : "Music Off"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="text-sm font-medium mb-2">Card display</div>
                      <div className="flex flex-col gap-1">
                        <label className={`px-3 py-2 rounded border cursor-pointer ${modalDisplayMode === "image+text" ? "bg-[var(--color-accent)] text-white border-transparent" : "bg-white"}`}>
                          <input type="radio" name="modal-display" hidden checked={modalDisplayMode === "image+text"} onChange={() => setModalDisplayMode("image+text")} />
                          Image + text
                        </label>
                        <label className={`px-3 py-2 rounded border cursor-pointer ${modalDisplayMode === "image" ? "bg-[var(--color-accent)] text-white border-transparent" : "bg-white"}`}>
                          <input type="radio" name="modal-display" hidden checked={modalDisplayMode === "image"} onChange={() => setModalDisplayMode("image")} />
                          Image only
                        </label>
                        <label className={`px-3 py-2 rounded border cursor-pointer ${modalDisplayMode === "text" ? "bg-[var(--color-accent)] text-white border-transparent" : "bg-white"}`}>
                          <input type="radio" name="modal-display" hidden checked={modalDisplayMode === "text"} onChange={() => setModalDisplayMode("text")} />
                          Text only
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowSettings(false)} className={CBUTTON}>Close</motion.button>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => { didTrackMatchStartRef.current = false; setShowSettings(false); setBoard(createEmptyBoard(boardRows, boardCols)); }} className={CBUTTON}>Start</motion.button>
                </div>
              </GameSettingsModal>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Non-blocking match over panel */}
        <AnimatePresence>
          {(winnerLine || gameOverDraw) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className="fixed right-6 bottom-6 z-40"
            >
              <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} exit={{ scale: 0.98 }} className="bg-white rounded-xl p-4 shadow-lg w-80">
                {winnerLine ? (
                  <>
                    <div className="text-lg font-bold mb-1">Player {board[winnerLine[0][0]][winnerLine[0][1]]} wins!</div>
                    <div className="text-sm text-gray-600 mb-3">Winning line is highlighted on the board.</div>
                  </>
                ) : gameOverDraw ? (
                  <>
                    <div className="text-lg font-bold mb-1">Draw</div>
                    <div className="text-sm text-gray-600 mb-3">No more moves available.</div>
                  </>
                ) : null}

                <div className="flex justify-center gap-3 mt-2">
                  <button onClick={() => { didTrackMatchStartRef.current = false; setBoard(createEmptyBoard(boardRows, boardCols)); setWinnerLine(null); setGameOverDraw(false); setCurrentPlayer(1); }} className={CBUTTON}>Play Again</button>
                  <button onClick={() => { restartMatch(); }} className={CBUTTON}>Restart Match</button>
                  <button onClick={() => router.push(isDemo ? "/demo/animals" : "/games")} className={CBUTTON}>{isDemo ? "Back to home" : "Back to Games"}</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {matchWinner && matchWinnerModalOpen && !isDemo && (
          <GameWinnerModal
            title={aiLevel !== "none" && matchWinner === aiPlaysAs ? "Better luck next time!" : `Congratulations, Player ${matchWinner}!`}
            message={aiLevel !== "none" && matchWinner === aiPlaysAs
              ? `The AI reached ${firstToWins} wins first. Try another match!`
              : `First to ${firstToWins} wins — Player ${matchWinner} takes the match.`}
            onClose={() => setMatchWinnerModalOpen(false)}
            onPlayAgain={restartMatch}
            onReturnToGames={() => router.push("/games")}
          />
        )}

        {isDemo && showDemoWorksheetPrompt ? (
          <DemoTutorial
            title="One game down — keep the match going!"
            description="That was one complete Connect Four game. Keep playing until a team reaches three wins, or preview how the same Animals lesson becomes a Bullseye speaking worksheet."
            nextHref="/demo/animals/bullseye"
            nextLabel="Preview Bullseye"
            onClose={() => {
              setShowDemoWorksheetPrompt(false);
              setDemoRoundPromptDismissed(true);
              setDemoWorksheetLinkVisible(true);
            }}
          />
        ) : null}

        {isDemo && demoWorksheetLinkVisible ? (
          <DemoNextStep href="/demo/animals/bullseye">Next: Preview Bullseye →</DemoNextStep>
        ) : null}

        {isDemo && showDemoFinalWorksheetPrompt ? (
          <DemoTutorial
            title="Match complete — ready for the next activity?"
            description="You have finished a first-to-three Connect Four match with the Animals lesson. Now see those same cards as a ready-to-print Bullseye speaking activity."
            nextHref="/demo/animals/bullseye"
            nextLabel="Go to Bullseye"
            onClose={() => undefined}
            showClose={false}
          />
        ) : null}
      </div>
    </div>
  );
}
