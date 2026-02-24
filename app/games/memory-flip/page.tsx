"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Maximize } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/*
  Memory Flip — final small change:
  - When the teacher presses the green O (onGreenO / onGreenO handler),
    the enlarged matched-pair modal now closes (setMatchedPair(null)) BEFORE
    opening the score generator or bomb modal. Red X behavior unchanged.
  - No other behavior changed.
*/

type TrayCard = {
  id: string;
  word: string;
  image?: string | null;
  // added optional partOfSpeech to satisfy helper functions that reference it in other files / shared helpers
  partOfSpeech?: "noun" | "verb" | "adjective" | "preposition" | "phonics";
};
type Card = {
  id: string;
  pairId: string;
  faceText?: string;
  faceImage?: string | null;
  matched: boolean;
  revealed: boolean;
};
type Team = { id: string; name: string; score: number };

const LESSON_TRAY_KEY = "classbloom-lesson-tray";
const CONFETTI_CDN = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.browser.min.js";

export default function MemoryFlipPage() {
  const router = useRouter();

  // Header controls
  const [musicOn, setMusicOn] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicIntervalRef = useRef<number | null>(null);

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

  function playTone(freq = 440, dur = 0.12, type: OscillatorType = "sine", gain = 0.03) {
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
    g.gain.linearRampToValueAtTime(0.0001, now + dur);
    o.stop(now + dur + 0.02);
  }

  function toggleMusic() {
    const will = !musicOn;
    setMusicOn(will);
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (will) {
      ctx.resume().catch(() => {});
      if (musicIntervalRef.current) return;
      const melody = [330, 392, 494, 523];
      let step = 0;
      musicIntervalRef.current = window.setInterval(() => {
        playTone(melody[step % melody.length], 0.12, "sine", 0.02);
        step++;
      }, 420) as unknown as number;
    } else {
      if (musicIntervalRef.current) {
        clearInterval(musicIntervalRef.current);
        musicIntervalRef.current = null;
      }
      ctx.suspend().catch(() => {});
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  }

  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gridSize, setGridSize] = useState<number>(16); // 8 / 12 / 16 / 20
  const [bombInsteadProb, setBombInsteadProb] = useState<number>(0.15);
  const [bombPairProb, setBombPairProb] = useState<number>(0.10);
  const [gameStyle, setGameStyle] = useState<"image-image" | "text-text" | "image-text">("image-text");

  // Teams / scoreboard
  const [teams, setTeams] = useState<Team[]>([{ id: "team-1", name: "Team 1", score: 0 }]);
  const [activeTeamIndex, setActiveTeamIndex] = useState<number>(0);
  const activeTeamIndexRef = useRef<number>(activeTeamIndex);
  useEffect(() => {
    activeTeamIndexRef.current = activeTeamIndex;
  }, [activeTeamIndex]);

  function addTeam() {
    if (teams.length >= 6) return;
    setTeams((prev) => [...prev, { id: `team-${prev.length + 1}`, name: `Team ${prev.length + 1}`, score: 0 }]);
  }
  function resetScores() {
    setTeams((prev) => prev.map((t) => ({ ...t, score: 0 })));
    setActiveTeamIndex(0);
  }

  // Lesson tray
  const [trayCards, setTrayCards] = useState<TrayCard[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LESSON_TRAY_KEY);
      if (!raw) {
        // If no saved lesson tray, treat as empty — user requested to show "no cards selected" message
        setTrayCards([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        // Explicitly keep tray empty to allow the "no cards selected" message
        setTrayCards([]);
        return;
      }
      const normalized = parsed
        .map((c: any, i: number) => {
          const word = String(c.word ?? c.text ?? c.label ?? c.name ?? c.title ?? "");
          const id = String(c.id ?? word ?? `tray-${i}`);
          const image = c.image ?? c.img ?? null;
          return { id, word, image };
        })
        .filter((x) => x.word);
      setTrayCards(normalized.length ? normalized : []);
    } catch {
      setTrayCards([]);
    }
  }, []);

  function defaultTray(): TrayCard[] {
    return [
      { id: "cat", word: "Cat" },
      { id: "dog", word: "Dog" },
      { id: "apple", word: "Apple" },
      { id: "ball", word: "Ball" },
      { id: "car", word: "Car" },
      { id: "fish", word: "Fish" },
      { id: "tree", word: "Tree" },
      { id: "book", word: "Book" },
      { id: "sun", word: "Sun" },
      { id: "moon", word: "Moon" },
    ];
  }

  // Game deck & state
  const [cards, setCards] = useState<Card[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [locked, setLocked] = useState(false);
  const [matchedPair, setMatchedPair] = useState<{ a: number; b: number } | null>(null);
  const pairTypeRef = useRef<Record<string, "bomb" | "normal">>({});

  // Generator / overlays
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorValue, setGeneratorValue] = useState<number | null>(null);
  const [generatorSpinning, setGeneratorSpinning] = useState(false);
  const [showBomb, setShowBomb] = useState(false);
  const generatorIntervalRef = useRef<number | null>(null);
  const generatorTimeoutRef = useRef<number | null>(null);
  const confettiLoadedRef = useRef<boolean>(false);
  const confettiLoadingRef = useRef<Promise<void> | null>(null);

  // Layout helpers
  const gridCols = gridSize === 20 ? 5 : 4;
  const gridRows = Math.ceil(gridSize / gridCols);
  const rowBackColors = ["#e6fffa", "#ecfccb", "#fef3c7", "#fee2e2", "#ede9fe", "#fff7ed"];

  // Single buildDeck
  function buildDeck() {
    const pairsNeeded = Math.floor(gridSize / 2);
    const source = trayCards.length ? trayCards : defaultTray();
    const chosen: TrayCard[] = [];
    for (let i = 0; i < pairsNeeded; i++) chosen.push(source[i % source.length]);

    const pairIds = chosen.map((c) => c.id);
    const bombCount = Math.round(pairIds.length * bombPairProb);
    const bombPairIds = shuffle(pairIds).slice(0, bombCount);
    pairTypeRef.current = {};
    pairIds.forEach((pid) => (pairTypeRef.current[pid] = bombPairIds.includes(pid) ? "bomb" : "normal"));

    const created: Card[] = [];
    chosen.forEach((s) => {
      created.push({
        id: `${s.id}-a-${Math.random().toString(36).slice(2)}`,
        pairId: s.id,
        faceText: s.word,
        faceImage: s.image ?? null,
        matched: false,
        revealed: false,
      });
      created.push({
        id: `${s.id}-b-${Math.random().toString(36).slice(2)}`,
        pairId: s.id,
        faceText: s.word,
        faceImage: s.image ?? null,
        matched: false,
        revealed: false,
      });
    });

    setCards(shuffle(created));
    setFlipped([]);
    setLocked(false);
    setMatchedPair(null);
    setShowGenerator(false);
    setGeneratorValue(null);
    setShowBomb(false);
  }

  // Build on mount / settings change
  useEffect(() => {
    buildDeck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trayCards, gridSize, bombPairProb, gameStyle]);

  // Flip / match
  function flipCard(index: number) {
    if (locked) return;
    const c = cards[index];
    if (!c || c.matched || c.revealed) return;
    setCards((prev) => {
      const cp = prev.slice();
      cp[index] = { ...cp[index], revealed: true };
      return cp;
    });
    const next = [...flipped, index].slice(0, 2);
    setFlipped(next);
    if (next.length === 2) {
      setLocked(true);
      setTimeout(() => evaluateMatch(next[0], next[1]), 600);
    }
  }

  function evaluateMatch(a: number, b: number) {
    const A = cards[a],
      B = cards[b];
    if (!A || !B) {
      setLocked(false);
      setFlipped([]);
      return;
    }
    if (A.pairId === B.pairId) {
      setCards((prev) => {
        const cp = prev.slice();
        cp[a] = { ...cp[a], matched: true };
        cp[b] = { ...cp[b], matched: true };
        return cp;
      });
      setMatchedPair({ a, b });
      setFlipped([]);
      setLocked(false);
      return;
    }
    setTimeout(() => {
      setCards((prev) => {
        const cp = prev.slice();
        cp[a] = { ...cp[a], revealed: false };
        cp[b] = { ...cp[b], revealed: false };
        return cp;
      });
      setFlipped([]);
      setLocked(false);
    }, 700);
  }

  // Teacher actions
  function onRedX() {
    // Close modal only; matched cards remain face-up
    setMatchedPair(null);
  }

  async function onGreenO() {
    // Close the matched-pair modal first so the enlarged cards disappear and the grid shows
    setMatchedPair(null);

    // Then continue to generator or bomb
    setTimeout(() => {
      const matchedPairCard = cards.find((c) => c.matched);
      const pairId = matchedPairCard ? matchedPairCard.pairId : undefined;

      const isBomb = pairId ? (Math.random() < bombInsteadProb || pairTypeRef.current[pairId] === "bomb") : (Math.random() < bombInsteadProb);

      if (isBomb) {
        setShowBomb(true);
        // animate -5 on current team
        const idx = activeTeamIndexRef.current;
        const prev = teams[idx].score;
        const target = Math.max(0, prev - 5);
        const steps = 25;
        let step = 0;
        const timer = window.setInterval(() => {
          step++;
          const val = Math.round(prev - ((prev - target) * (step / steps)));
          setTeams((prevArr) => prevArr.map((t, i) => (i === idx ? { ...t, score: val } : t)));
          if (step >= steps) clearInterval(timer);
        }, 60);
      } else {
        setShowGenerator(true);
        setGeneratorValue(null);
      }
    }, 200); // 200ms delay to let the matched-pair modal close
  }

  // Generator: slower cycle, dramatic final
  function startGenerator() {
    setGeneratorSpinning(true);
    setGeneratorValue(null);

    generatorIntervalRef.current = window.setInterval(() => {
      setGeneratorValue(1 + Math.floor(Math.random() * 10));
    }, 220) as unknown as number;

    generatorTimeoutRef.current = window.setTimeout(async () => {
      if (generatorIntervalRef.current) {
        clearInterval(generatorIntervalRef.current);
        generatorIntervalRef.current = null;
      }
      const weights = [8, 12, 12, 12, 8, 6, 4, 3, 2, 1]; // 1..10 weights
      const total = weights.reduce((s, w) => s + w, 0);
      let r = Math.floor(Math.random() * total);
      let final = 1;
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r < 0) {
          final = i + 1;
          break;
        }
      }
      setGeneratorSpinning(false);
      setGeneratorValue(final);

      await loadConfetti();
      const confettiFn = (window as any).confetti;
      if (typeof confettiFn === "function") confettiFn({ particleCount: 80, spread: 90, origin: { y: 0.5 } });

      const idx = activeTeamIndexRef.current;
      const prev = teams[idx].score;
      const target = prev + final;
      let step = 0;
      const stepsAnim = 25;
      const timer = window.setInterval(() => {
        step++;
        const val = Math.round(prev + ((target - prev) * (step / stepsAnim)));
        setTeams((prevArr) => prevArr.map((t, i) => (i === idx ? { ...t, score: val } : t)));
        if (step >= stepsAnim) clearInterval(timer);
      }, 60);
    }, 4000) as unknown as number;
  }

  // Close generator modal and clear timers
  function closeGenerator() {
    if (generatorIntervalRef.current) {
      clearInterval(generatorIntervalRef.current);
      generatorIntervalRef.current = null;
    }
    if (generatorTimeoutRef.current) {
      clearTimeout(generatorTimeoutRef.current as number);
      generatorTimeoutRef.current = null;
    }
    setGeneratorSpinning(false);
    setGeneratorValue(null);
    setShowGenerator(false);
  }

  function onNext() {
    setMatchedPair(null);
    setShowBomb(false);
    setShowGenerator(false);
    setGeneratorValue(null);
    setActiveTeamIndex((prev) => (prev + 1) % teams.length);
  }

  // Confetti loader
  function loadConfetti(): Promise<void> {
    if (confettiLoadedRef.current) return Promise.resolve();
    if (confettiLoadingRef.current) return confettiLoadingRef.current!;
    confettiLoadingRef.current = new Promise<void>((resolve) => {
      try {
        const s = document.createElement("script");
        s.src = CONFETTI_CDN;
        s.async = true;
        s.onload = () => {
          confettiLoadedRef.current = true;
          resolve();
        };
        s.onerror = () => resolve();
        document.head.appendChild(s);
      } catch {
        resolve();
      }
    });
    return confettiLoadingRef.current!;
  }

  // Reset
  function resetGame() {
    setTeams((prev) => prev.map((t) => ({ ...t, score: 0 })));
    setActiveTeamIndex(0);
    buildDeck();
  }

  // Utilities
  function shuffle<T>(arr: T[]) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Render helpers
  function renderFace(card: Card) {
    if (gameStyle === "text-text") return <div style={{ fontWeight: 700 }}>{card.faceText}</div>;
    if (gameStyle === "image-image")
      return (
        <img
          src={card.faceImage ?? ""}
          alt={card.faceText}
          style={{ maxWidth: "92%", maxHeight: "92%", objectFit: "contain", borderRadius: 8 }}
        />
      );
    return card.faceImage ? (
      <img src={card.faceImage} alt={card.faceText} style={{ maxWidth: "92%", maxHeight: "92%", objectFit: "contain", borderRadius: 8 }} />
    ) : (
      <div style={{ fontWeight: 700 }}>{card.faceText}</div>
    );
  }

  function CardElement({ card, idx }: { card: Card; idx: number }) {
    const revealed = card.revealed || card.matched;
    const row = Math.floor(idx / gridCols);
    const backColor = rowBackColors[row % rowBackColors.length];
    return (
      <motion.div key={card.id} layout style={{ display: "flex", justifyContent: "center" }}>
        <motion.button
          onClick={() => flipCard(idx)}
          disabled={locked || card.matched}
          aria-pressed={revealed}
          aria-label={revealed ? `Card ${card.faceText ?? "image"}` : `Face-down card ${idx + 1}`}
          initial={{ perspective: 600 }}
          whileTap={{ scale: 0.98 }}
          style={{
            width: `calc(min(880px, 80vh) / ${Math.max(2, gridCols)})`,
            height: `calc(min(660px, 60vh) / ${Math.max(2, gridRows)})`,
            borderRadius: 12,
            border: "2px solid rgba(0,0,0,0.06)",
            background: revealed ? "#fff" : backColor,
            color: revealed ? "#111827" : "#000",
            fontWeight: 800,
            fontSize: revealed ? 18 : 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: revealed ? "0 12px 30px rgba(0,0,0,0.12)" : "0 6px 12px rgba(0,0,0,0.06)",
          }}
          whileHover={{ scale: card.matched ? 1 : 1.02 }}
          transition={{ duration: 0.28 }}
        >
          <motion.div animate={{ scale: matchedPair && (matchedPair.a === idx || matchedPair.b === idx) ? 1.05 : 1 }} style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {revealed ? renderFace(card) : <div style={{ fontSize: 34, fontWeight: 900 }}>{idx + 1}</div>}
          </motion.div>
        </motion.button>
      </motion.div>
    );
  }

  const trayIsEmpty = trayCards.length === 0;

  // JSX
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f0fdf4", fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" }}>
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, background: "rgba(255,255,255,0.94)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <a href="/" style={{ color: "#2563eb", fontSize: 20, fontWeight: 800 }}>
          ClassBloom
        </a>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Memory Flip</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={toggleFullscreen} className="btn btn-secondary p-2">
            <Maximize size={14} />
          </button>
          <button
            onClick={toggleMusic}
            className={`btn px-3 py-1 ${musicOn ? "btn-primary" : "btn-secondary"}`}
          >
            {musicOn ? "Music On" : "Music Off"}
          </button>
          <button onClick={resetGame} className="btn btn-secondary px-3 py-1">
            Reset game
          </button>
          {/* Exit game button changed to site green */}
          <button onClick={() => router.push("/games")} className="btn btn-secondary px-3 py-1">
            Return
          </button>

          <div style={{ position: "relative" }}>
            <button onClick={() => setSettingsOpen((s) => !s)} className="btn btn-secondary px-3 py-1">
              Settings ▾
            </button>

            <AnimatePresence>
              {settingsOpen && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ position: "absolute", right: 0, marginTop: 8, width: 420, background: "white", borderRadius: 10, padding: 12, boxShadow: "0 12px 40px rgba(2,6,23,0.12)", zIndex: 900 }}>
                  <div style={{ fontWeight: 700 }}>Grid size</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {[8, 12, 16, 20].map((n) => (
                      <button
                        key={n}
                        onClick={() => setGridSize(n)}
                        className={`btn px-2 py-2 ${gridSize === n ? "btn-primary" : "btn-secondary"}`}
                      >
                        {n} cards
                      </button>
                    ))}
                  </div>

                  <div style={{ marginTop: 12, fontWeight: 700 }}>Bomb (after O) probability</div>
                  <input type="range" min={0} max={50} value={Math.round(bombInsteadProb * 100)} onChange={(e) => setBombInsteadProb(Number(e.target.value) / 100)} style={{ width: "100%" }} />

                  <div style={{ marginTop: 12, fontWeight: 700 }}>Bomb pair probability (deck)</div>
                  <input type="range" min={0} max={50} value={Math.round(bombPairProb * 100)} onChange={(e) => setBombPairProb(Number(e.target.value) / 100)} style={{ width: "100%" }} />

                  <div style={{ marginTop: 12, fontWeight: 700 }}>Game style</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      onClick={() => setGameStyle("image-image")}
                      className={`btn px-2 py-2 ${gameStyle === "image-image" ? "btn-primary" : "btn-secondary"}`}
                    >
                      Image - Image
                    </button>
                    <button
                      onClick={() => setGameStyle("text-text")}
                      className={`btn px-2 py-2 ${gameStyle === "text-text" ? "btn-primary" : "btn-secondary"}`}
                    >
                      Text - Text
                    </button>
                    <button
                      onClick={() => setGameStyle("image-text")}
                      className={`btn px-2 py-2 ${gameStyle === "image-text" ? "btn-primary" : "btn-secondary"}`}
                    >
                      Image - Text
                    </button>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                    <button onClick={() => setSettingsOpen(false)} className="btn btn-secondary px-3 py-2">
                      Done
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* If the lesson tray is empty show message and two buttons */}
      {trayIsEmpty ? (
        <main style={{ padding: 24, flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", padding: 28, borderRadius: 12, boxShadow: "0 12px 40px rgba(2,6,23,0.08)", textAlign: "center", maxWidth: 720 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>No cards selected</h2>
            <p style={{ color: "#6b7280", marginBottom: 18 }}>There are no cards in the lesson tray. Add cards in Flashcards or choose a saved lesson in Dashboard before starting the game.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={() => router.push("/flashcards")} className="btn btn-primary px-3 py-1">
                Go to Flashcards
              </button>
              <button onClick={() => router.push("/dashboard")} className="btn btn-secondary px-3 py-1">
                Return to Dashboard
              </button>
            </div>
          </div>
        </main>
      ) : (
        <>
          {/* Scoreboard */}
          <div style={{ display: "flex", gap: 12, padding: 12, alignItems: "center", background: "rgba(255,255,255,0.9)" }}>
            {teams.map((t, i) => (
              <div key={t.id} style={{ minWidth: 140, padding: 10, borderRadius: 12, background: activeTeamIndex === i ? "#111827" : "white", color: activeTeamIndex === i ? "white" : "#111827", boxShadow: activeTeamIndex === i ? "0 12px 30px rgba(2,6,23,0.12)" : "0 6px 12px rgba(2,6,23,0.06)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: activeTeamIndex === i ? "pulse 1.2s infinite" : "none" }}>
                <div style={{ fontSize: 12, opacity: 0.85 }}>{t.name}</div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{t.score}</div>
              </div>
            ))}
            <div style={{ marginLeft: "auto" }}>
              <button
                onClick={() => setTeams((t) => t.map((p, i) => ({ ...p, name: `Team ${i + 1}` })))}
                className="btn btn-secondary px-3 py-2"
              >
                Rename default
              </button>
              <button
                onClick={addTeam}
                disabled={teams.length >= 6}
                className="btn btn-secondary px-3 py-2 ml-2"
              >
                Add team
              </button>
              <button onClick={resetScores} className="btn btn-secondary px-3 py-2 ml-2">
                Reset scores
              </button>
            </div>
          </div>

          {/* Grid */}
          <div style={{ padding: 20, display: "flex", justifyContent: "center" }}>
            <div style={{ width: "min(1200px, 92vw)", background: "#dff6e9", borderRadius: 14, padding: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: 12 }}>
                {cards.slice(0, gridSize).map((c, idx) => (
                  <CardElement key={c.id} card={c} idx={idx} />
                ))}
              </div>
            </div>
          </div>

          {/* Matched pair modal */}
          <AnimatePresence>
            {matchedPair && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150 }}>
                <div style={{ width: "80%", maxWidth: 980, background: "white", padding: 20, borderRadius: 12, boxShadow: "0 30px 80px rgba(2,6,23,0.2)" }}>
                  <div style={{ display: "flex", gap: 20, alignItems: "center", justifyContent: "center" }}>
                    <motion.div layoutId={`card-${cards[matchedPair.a].id}`} style={{ width: 260, height: 180, borderRadius: 12, background: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {renderFace(cards[matchedPair.a])}
                    </motion.div>
                    <motion.div layoutId={`card-${cards[matchedPair.b].id}`} style={{ width: 260, height: 180, borderRadius: 12, background: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {renderFace(cards[matchedPair.b])}
                    </motion.div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <button onClick={onGreenO} style={{ padding: "14px 18px", borderRadius: 10, background: "#10b981", color: "white", fontWeight: 800 }}>
                        ✔ Get Points!
                      </button>
                      <button onClick={onRedX} style={{ padding: "12px 16px", borderRadius: 10, background: "#ef4444", color: "white", fontWeight: 800 }}>
                        ✕ Go Back
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Generator modal — pastel green + footer buttons */}
          <AnimatePresence>
            {showGenerator && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
                <div style={{ width: "min(1100px, 95vw)", height: "min(720px, 80vh)", background: "#e6ffef", borderRadius: 16, padding: 24, textAlign: "center", boxShadow: "0 30px 120px rgba(2,6,23,0.28)", display: "flex", flexDirection: "column" }}>
                  <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 0.5 }}>Score generator</div>

                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 18 }}>
                    <motion.div key={String(generatorValue) + String(generatorSpinning)} initial={{ scale: 0.9, opacity: 0 }} animate={generatorSpinning ? { scale: 1, opacity: 0.9 } : { scale: 1.6, opacity: 1 }} transition={generatorSpinning ? { duration: 0.25 } : { type: "spring", stiffness: 650, damping: 18 }} style={{ fontSize: generatorSpinning ? 72 : 160, fontWeight: 900, minWidth: 240, textAlign: "center", color: "#0f172a" }}>
                      {generatorValue === null ? (generatorSpinning ? "…" : "?") : generatorValue}
                    </motion.div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8 }}>
                    <button onClick={startGenerator} style={{ padding: "14px 28px", borderRadius: 12, background: "#10b981", color: "white", fontWeight: 900, fontSize: 18 }}>
                      Go!
                    </button>

                    <button onClick={closeGenerator} style={{ padding: "14px 28px", borderRadius: 12, background: "#6b7280", color: "white", fontWeight: 700, fontSize: 16 }}>
                      Back
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bomb modal */}
          <AnimatePresence>
            {showBomb && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
                <div style={{ width: 520, background: "radial-gradient(circle at 30% 30%, rgba(255,200,0,0.95), rgba(255,80,0,0.9) 40%, rgba(80,0,0,0.85) 70%)", borderRadius: 999, padding: 40, textAlign: "center", boxShadow: "0 30px 80px rgba(0,0,0,0.45)" }}>
                  <div style={{ fontSize: 48, fontWeight: 900, color: "white" }}>💣 BOOM!</div>
                  <div style={{ marginTop: 12, color: "white", fontWeight: 700 }}>-5 points</div>
                  <div style={{ marginTop: 18 }}>
                    <button onClick={onNext} style={{ padding: "10px 18px", borderRadius: 8, background: "#111827", color: "white" }}>Next</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <style jsx>{`
        .pulse { animation: pulse 1.2s infinite; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.04); } 100% { transform: scale(1); } }
      `}</style>
    </div>
  );
}

/* ---------- helpers (single definitions) ---------- */

function normalizePOS(raw: any): TrayCard["partOfSpeech"] | null {
  if (!raw) return null;
  const candidates: string[] = [];
  const keys = ["partOfSpeech", "part_of_speech", "pos", "type", "category", "tag", "posTag", "pos_tag"];
  for (const k of keys) if (raw[k]) candidates.push(String(raw[k]));
  if (typeof raw === "string") candidates.push(raw);
  for (let c of candidates) {
    c = c.toLowerCase().trim();
    if (["noun", "n"].includes(c)) return "noun";
    if (["verb", "v"].includes(c)) return "verb";
    if (["adjective", "adj"].includes(c)) return "adjective";
    if (["preposition", "prep"].includes(c)) return "preposition";
    if (["phonics", "phonic", "phoneme"].includes(c)) return "phonics";
  }
  return null;
}

function inferPOSFromFields(obj: any): TrayCard["partOfSpeech"] | null {
  if (!obj) return null;
  if (obj.prepositionType) return "preposition";
  if (obj.countability) return "noun";
  return null;
}

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
