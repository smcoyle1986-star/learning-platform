"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Maximize, Music, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

export default function ConnectFourPage() {
  const router = useRouter();

  // lesson-tray
  const [tray, setTray] = useState<TrayCard[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("classendo-lesson-tray");
      if (!raw) { setTray([]); return; }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const normalized = parsed.map((c: any, i: number) => ({
          id: String(c.id ?? c.word ?? `t-${i}`),
          word: String(c.word ?? c.text ?? c.label ?? ""),
          image: c.image ?? null,
          audio: c.audio ?? null,
        })).filter((x) => x.word);
        setTray(normalized);
      } else setTray([]);
    } catch {
      setTray([]);
    }
  }, []);

  // fullscreen expansion
  const [inFullscreen, setInFullscreen] = useState<boolean>(false);
  useEffect(() => {
    function onFull() { setInFullscreen(!!document.fullscreenElement); }
    document.addEventListener("fullscreenchange", onFull);
    return () => document.removeEventListener("fullscreenchange", onFull);
  }, []);

  // settings
  const [showSettings, setShowSettings] = useState<boolean>(true);
  const [showNoCardsModal, setShowNoCardsModal] = useState<boolean>(false);
  const [aiLevel, setAiLevel] = useState<AiLevel>("none");
  const [firstToWins, setFirstToWins] = useState<number>(3);
  const [perMoveSeconds, setPerMoveSeconds] = useState<number>(20);
  const [boardCols, setBoardCols] = useState<number>(DEFAULT_COLS);
  const [boardRows, setBoardRows] = useState<number>(DEFAULT_ROWS);

  // runtime
  const [board, setBoard] = useState<Cell[][]>(() => createEmptyBoard(DEFAULT_ROWS, DEFAULT_COLS));
  const [currentPlayer, setCurrentPlayer] = useState<Player>(1);
  const [cursorCol, setCursorCol] = useState<number>(Math.floor(DEFAULT_COLS / 2));
  const [winnerLine, setWinnerLine] = useState<[number, number][] | null>(null);
  const [matchWins, setMatchWins] = useState<Record<number, number>>({ 1: 0, 2: 0 });
  const [isAiThinking, setIsAiThinking] = useState<boolean>(false);

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
      try { audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); } catch { audioCtxRef.current = null; }
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

  // timer / AI
  const [turnTimer, setTurnTimer] = useState<number>(perMoveSeconds);
  const turnTimerRef = useRef<number | null>(null);
  const [aiPlaysAs, setAiPlaysAs] = useState<Player>(2);
  const aiTimeoutsRef = useRef<number[]>([]);

  // LEARNING modal state
  const [selectedColForModal, setSelectedColForModal] = useState<number | null>(null);
  const [learningCard, setLearningCard] = useState<TrayCard | null>(null);
  const [showLearningLabel, setShowLearningLabel] = useState<boolean>(false);
  const [showMissedTurn, setShowMissedTurn] = useState<boolean>(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardCols, boardRows]);

  // keyboard controls
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (showSettings || showNoCardsModal || winnerLine || isAiThinking) return;
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
  }, [showSettings, showNoCardsModal, boardCols, cursorCol, winnerLine, isAiThinking]);

  // per-move countdown — NOTE: we intentionally DO NOT pause when learning modal is open.
  useEffect(() => {
    if (showSettings || showNoCardsModal || winnerLine || isAiThinking) {
      if (turnTimerRef.current) { clearInterval(turnTimerRef.current); turnTimerRef.current = null; }
      return;
    }
    setTurnTimer(perMoveSeconds);
    if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    turnTimerRef.current = window.setInterval(() => {
      setTurnTimer((t) => {
        if (t <= 1) {
          if (turnTimerRef.current) { clearInterval(turnTimerRef.current); turnTimerRef.current = null; }
          handleTimeout();
          return perMoveSeconds;
        }
        return t - 1;
      });
    }, 1000) as unknown as number;
    return () => { if (turnTimerRef.current) { clearInterval(turnTimerRef.current); turnTimerRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, showSettings, showNoCardsModal, winnerLine, perMoveSeconds, isAiThinking]);

  function handleTimeout() {
    setSelectedColForModal(null); // dismiss any learning action
    setLearningCard(null);
    setCurrentPlayer((p) => (p === 1 ? 2 : 1) as Player);
  }

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
    if (showSettings || showNoCardsModal || winnerLine || isAiThinking) return;
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
    if (showSettings || showNoCardsModal || winnerLine || isAiThinking || falling) return;
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
    if (showSettings || showNoCardsModal || winnerLine) return;
    if (aiLevel !== "none" && aiPlaysAs === currentPlayer) {
      doAiMoveWithDrama();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayer, aiLevel, aiPlaysAs, showSettings, showNoCardsModal, winnerLine]);

  async function doAiMoveWithDrama() {
    if (isAiThinking) return;
    setIsAiThinking(true);
    if (turnTimerRef.current) { clearInterval(turnTimerRef.current); turnTimerRef.current = null; }

    const chosen = selectAiMove(board, boardRows, boardCols, aiLevel, aiPlaysAs);
    const avail = availableCols(board);
    if (chosen < 0 || avail.length === 0) {
      setIsAiThinking(false);
      return;
    }

    const seqLen = Math.min(6, Math.max(3, avail.length));
    const seq: number[] = [];
    for (let i = 0; i < seqLen - 1; i++) seq.push(avail[Math.floor(Math.random() * avail.length)]);
    seq.push(chosen);

    aiTimeoutsRef.current.forEach((t) => clearTimeout(t));
    aiTimeoutsRef.current = [];
    let accumulated = 0;
    const baseDelay = aiLevel === "hard" ? 360 : aiLevel === "medium" ? 320 : 240;
    for (let i = 0; i < seq.length; i++) {
      const col = seq[i];
      accumulated += baseDelay + i * 60;
      const t = window.setTimeout(() => setCursorCol(col), accumulated) as unknown as number;
      aiTimeoutsRef.current.push(t);
    }

    const finalDelay = accumulated + 260;
    const finalT = window.setTimeout(() => {
      handleDropAnimated(chosen);
      setIsAiThinking(false);
      setTurnTimer(perMoveSeconds);
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      turnTimerRef.current = window.setInterval(() => {
        setTurnTimer((t) => {
          if (t <= 1) {
            if (turnTimerRef.current) { clearInterval(turnTimerRef.current); turnTimerRef.current = null; }
            handleTimeout();
            return perMoveSeconds;
          }
          return t - 1;
        });
      }, 1000) as unknown as number;
    }, finalDelay) as unknown as number;
    aiTimeoutsRef.current.push(finalT);
  }

  function cancelAiTimeouts() {
    aiTimeoutsRef.current.forEach((t) => clearTimeout(t));
    aiTimeoutsRef.current = [];
  }

  // restart match — now strictly restart (does NOT open settings)
  function restartMatch() {
    cancelAiTimeouts();
    setBoard(createEmptyBoard(boardRows, boardCols));
    setWinnerLine(null);
    setGameOverDraw(false);
    setMatchWins({ 1: 0, 2: 0 });
    setCurrentPlayer(1);
    setIsAiThinking(false);
    setFalling(null);
    setSelectedColForModal(null);
    // do not auto-open settings here
  }

  useEffect(() => {
    if ((matchWins[1] ?? 0) >= firstToWins || (matchWins[2] ?? 0) >= firstToWins) {
      setWinnerLine(null);
      setShowSettings(true);
      cancelAiTimeouts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchWins]);

  function renderTokenDisc(player: Player) {
    return <div className={`w-8 h-8 rounded-full ${player === 1 ? "bg-red-500" : "bg-yellow-400"}`} />;
  }

  // TimerBadge - dramatic when <= 5
  const TimerBadge = () => {
    const danger = turnTimer <= 5;
    const colorClass = currentPlayer === 1 ? (danger ? "bg-red-600 text-white" : "bg-red-500 text-white") : (danger ? "bg-yellow-400 text-black" : "bg-yellow-400 text-black");
    const sizeClass = danger ? "text-4xl font-extrabold animate-pulse" : "text-2xl font-bold";
    const ring = danger ? "ring-4 ring-red-300" : "";
    return (
      <div className={`flex items-center gap-3`}>
        <div className={`${colorClass} px-4 py-2 rounded-full flex items-center justify-center ${ring}`}>
          <div className={sizeClass}>{turnTimer}</div>
        </div>
      </div>
    );
  };

  const TurnBadge = () => (
    <div className="flex items-center gap-4">
      <div className={`px-3 py-1 rounded-full font-semibold ${currentPlayer === 1 ? "bg-red-500 text-white" : "bg-yellow-400 text-black"}`}>
        {currentPlayer === 1 ? "Red's turn" : "Yellow's turn"}
      </div>
      <TimerBadge />
    </div>
  );

  useEffect(() => {
    return () => {
      cancelAiTimeouts();
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      if (musicIntervalRef.current) clearInterval(musicIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // UI
  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)] p-6">
      <div className={`mx-auto ${inFullscreen ? "max-w-full" : "max-w-6xl"}`}>
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <a href="/" className="text-2xl font-extrabold text-blue-700">Classendo</a>
            <h1 className="text-xl font-semibold">Connect Four</h1>
            <div className="ml-3 text-sm text-gray-500">{boardCols} × {boardRows}</div>
          </div>

          <div className="flex items-center gap-3">
            <TurnBadge />
            <button onClick={() => restartMatch()} className={CBUTTON}><RefreshCw size={14} />Restart</button>
            <button onClick={() => router.push("/games")} className={CBUTTON}>Return</button>
            <button onClick={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }} className={CBUTTON}><Maximize size={14} />Fullscreen</button>
            <button onClick={() => toggleMusic()} className={CBUTTON}><Music size={14} />{musicOn ? "Music On" : "Music Off"}</button>
          </div>
        </header>

        <div className="flex items-start gap-6">
          {/* Left: scoreboard + Settings button (moved under scoreboard) */}
          <div className="w-56 bg-white rounded p-3 shadow flex flex-col">
            <div>
              <div className="font-semibold mb-2">Match (first to {firstToWins})</div>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><div>Player 1</div><div className="font-bold">{matchWins[1] ?? 0}</div></div>
                <div className="flex justify-between"><div>{aiLevel === "none" ? "Player 2" : `Player ${aiPlaysAs === 2 ? "AI" : "2"}`}</div><div className="font-bold">{matchWins[2] ?? 0}</div></div>
              </div>
              <div className="mt-3 text-sm">
                <div>Turn time left: <span className="font-semibold">{turnTimer}s</span></div>
                <div className="mt-2 text-xs text-gray-500">Use number keys or arrows to choose column, click number to see image, then ✅/❌.</div>
              </div>
            </div>

            {/* Settings button placed under scoreboard as requested */}
            <div className="mt-4">
              <button onClick={() => setShowSettings(true)} className={CBUTTON} aria-label="Open settings">Settings</button>
            </div>
          </div>

          <div className="flex-1">
            <div className={`bg-gray-100 p-4 rounded shadow ${inFullscreen ? "min-h-[80vh]" : ""}`}>
              {/* Column numbers always visible and bold black (selected becomes blue/white) */}
              <div className="grid mb-2" style={{ gridTemplateColumns: `repeat(${boardCols}, minmax(64px, 1fr))`, gap: 8 }}>
                {Array.from({ length: boardCols }).map((_, ci) => (
                  <button
                    key={`num-${ci}`}
                    onClick={() => handleColumnClick(ci)}
                    onDoubleClick={() => handleColumnClick(ci)}
                    className={`py-2 rounded font-bold border ${
                      ci === cursorCol ? "bg-[var(--color-accent)] text-white" : "bg-white text-black"
                    }`}
                  >
                    {ci + 1}
                  </button>
                ))}
              </div>

              {/* Preview token row */}
              <div className="grid" style={{ gridTemplateColumns: `repeat(${boardCols}, minmax(64px, 1fr))`, gap: 8 }}>
                {Array.from({ length: boardCols }).map((_, ci) => {
                  const isActive = ci === cursorCol;
                  return (
                    <div key={`preview-${ci}`} className="h-10 flex items-center justify-center">
                      <motion.div
                        animate={isActive ? { y: -8, scale: 1.12 } : { y: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 300, damping: 18 }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${isActive ? (currentPlayer === 1 ? "bg-red-500" : "bg-yellow-400") : "opacity-0"}`}
                      >
                        {isActive && renderTokenDisc(currentPlayer)}
                      </motion.div>
                    </div>
                  );
                })}
              </div>

              {/* Board grid + falling overlay */}
              <div className="mt-3 relative" role="grid" aria-label="Connect Four board">
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${boardCols}, minmax(64px, 1fr))`, gap: 8 }}>
                  {board.map((row, r) =>
                    row.map((cell, c) => {
                      const isWinning = winnerLine?.some(([rr, cc]) => rr === r && cc === c) ?? false;
                      return (
                        <div key={`cell-${r}-${c}`} className={`bg-blue-600 rounded flex items-center justify-center p-2`} style={{ minHeight: inFullscreen ? 96 : 64 }}>
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${cell === 0 ? "bg-white" : cell === 1 ? "bg-red-500" : "bg-yellow-400"} ${isWinning ? "ring-4 ring-green-300" : ""}`}>
                            {cell !== 0 ? renderTokenDisc(cell) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* falling token overlay */}
                {falling && (
                  <div className="absolute inset-0 pointer-events-none">
                    <motion.div
                      initial={{ y: "-6%" }}
                      animate={{ y: ((falling.row + 1) / (boardRows + 1)) * 100 + "%" }}
                      transition={{ duration: 0.28 + Math.max(0, falling.row) * 0.06, ease: "easeOut" }}
                      style={{
                        position: "absolute",
                        left: `${(falling.col + 0.5) * (100 / boardCols)}%`,
                        transform: "translate(-50%, -6%)",
                      }}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${falling.player === 1 ? "bg-red-500" : "bg-yellow-400"}`}>
                        {renderTokenDisc(falling.player)}
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Learning modal (timer continues running) */}
        <AnimatePresence>
          {selectedColForModal !== null && learningCard && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
              <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1 }} exit={{ scale: 0.98 }} className="bg-white rounded-xl p-6 w-full max-w-3xl text-center">
                <div className="mb-4">
                  <div className="text-lg font-bold">Identify the image</div>
                  <div className="text-sm text-gray-600">Click the image to reveal the word. ✅ lets you drop; ❌ misses your turn. Timer continues while modal is open.</div>
                </div>

                <div className="flex flex-col items-center gap-3">
                  <div
                    className="w-64 h-48 bg-gray-100 rounded shadow flex items-center justify-center cursor-pointer"
                    onClick={() => setShowLearningLabel((s) => !s)}
                  >
                    {learningCard.image ? (
                      <img src={learningCard.image} alt={learningCard.word} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <div className="text-gray-400">No image available</div>
                    )}
                  </div>

                  <div className="min-h-[2rem]">
                    {showLearningLabel && <div className="text-xl font-semibold">{learningCard.word}</div>}
                  </div>

                  <div className="flex gap-4 mt-4">
                    <button className={CBUTTON} onClick={() => { confirmLearningAndDrop(); }} aria-label="confirm">
                      ✅ Correct — Drop
                    </button>
                    <button className={RBUTTON} onClick={() => { denyLearningAndMissTurn(); }} aria-label="deny">
                      ❌ Miss Turn
                    </button>
                  </div>

                  <div className="text-xs text-gray-500 mt-3">Selected column: {selectedColForModal + 1}</div>
                </div>
              </motion.div>
            </motion.div>
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
                  <button className={CBUTTON} onClick={() => router.push("/")}>Return to Dashboard</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings modal */}
        <AnimatePresence>
          {showSettings && !showNoCardsModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }} transition={{ duration: 0.28 }} className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6">
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
                      <label className="text-sm">Per-move seconds</label>
                      <input type="number" min={5} max={60} value={perMoveSeconds} onChange={(e) => setPerMoveSeconds(Number(e.target.value || 20))} className="ml-2 w-20 border px-2 py-1 rounded" />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowSettings(false)} className={CBUTTON}>Close</motion.button>
                  <motion.button whileTap={{ scale: 0.96 }} onClick={() => { setShowSettings(false); setBoard(createEmptyBoard(boardRows, boardCols)); }} className={CBUTTON}>Start</motion.button>
                </div>
              </motion.div>
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
                  <button onClick={() => { setBoard(createEmptyBoard(boardRows, boardCols)); setWinnerLine(null); setGameOverDraw(false); setCurrentPlayer(1); }} className={CBUTTON}>Play Again</button>
                  <button onClick={() => { restartMatch(); }} className={CBUTTON}>Restart Match</button>
                  <button onClick={() => router.push("/games")} className={CBUTTON}>Back to Games</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
