"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import GameHeader from "@/components/games/GameHeader";
import { GameSettingsDropdown } from "@/components/games/GameSettingsSurface";
import { GameWinnerModal } from "@/components/games/GameWinnerModal";
import { trackGameStart } from "@/lib/games/track-game-start";

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
  faceMode?: "image" | "text";
  matched: boolean;
  revealed: boolean;
};
type Team = { id: string; name: string; score: number };

const LESSON_TRAY_KEY = "classendo-lesson-tray";
const CONFETTI_CDN = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.browser.min.js";

export default function MemoryFlipPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onFullChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFullChange);
    return () => document.removeEventListener("fullscreenchange", onFullChange);
  }, []);

  // Header controls
  const [musicOn, setMusicOn] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicIntervalRef = useRef<number | null>(null);

  function getAudioCtx() {
    if (!audioCtxRef.current) {
      try {
        const audioWindow = window as typeof window & { webkitAudioContext?: typeof AudioContext };
        const AudioContextConstructor = window.AudioContext || audioWindow.webkitAudioContext;
        audioCtxRef.current = AudioContextConstructor ? new AudioContextConstructor() : null;
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
  function removeLastTeam() {
    setTeams((prev) => {
      if (prev.length <= 2) return prev;
      const next = prev.slice(0, -1);
      setActiveTeamIndex((i) => Math.max(0, Math.min(i, next.length - 1)));
      return next;
    });
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
        .map((c: Record<string, unknown>, i: number) => {
          const word = String(c.word ?? c.text ?? c.label ?? c.name ?? c.title ?? "");
          const id = String(c.id ?? word ?? `tray-${i}`);
          const image = typeof c.image === "string" ? c.image : typeof c.img === "string" ? c.img : null;
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
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);

  // Generator / overlays
  const [showGenerator, setShowGenerator] = useState(false);
  const [generatorValue, setGeneratorValue] = useState<number | null>(null);
  const [generatorSpinning, setGeneratorSpinning] = useState(false);
  const [generatorShowingFinal, setGeneratorShowingFinal] = useState(false);
  const [showBomb, setShowBomb] = useState(false);
  const generatorIntervalRef = useRef<number | null>(null);
  const generatorTimeoutRef = useRef<number | null>(null);
  const generatorAwardTimeoutRef = useRef<number | null>(null);
  const generatorAdvanceTimeoutRef = useRef<number | null>(null);
  const confettiLoadedRef = useRef<boolean>(false);
  const confettiLoadingRef = useRef<Promise<void> | null>(null);
  const hasTrackedStartRef = useRef(false);
  const completionShownRef = useRef(false);

  // Layout helpers
  const gridCols = gridSize === 20 ? 5 : 4;
  const gridRows = Math.ceil(gridSize / gridCols);
  const activeTeam = teams[activeTeamIndex] ?? teams[0];
  // Single buildDeck
  function buildDeck() {
    hasTrackedStartRef.current = false;
    const pairsNeeded = Math.floor(gridSize / 2);
    const source = trayCards.length ? trayCards : defaultTray();
    const chosen: TrayCard[] = [];
    for (let i = 0; i < pairsNeeded; i++) chosen.push(source[i % source.length]);

    const created: Card[] = [];
    chosen.forEach((s) => {
      const firstMode: "image" | "text" =
        gameStyle === "image-image" ? "image" : gameStyle === "text-text" ? "text" : Math.random() < 0.5 ? "image" : "text";
      const secondMode: "image" | "text" = firstMode === "image" ? "text" : "image";
      created.push({
        id: `${s.id}-a-${Math.random().toString(36).slice(2)}`,
        pairId: s.id,
        faceText: s.word,
        faceImage: s.image ?? null,
        faceMode: firstMode,
        matched: false,
        revealed: false,
      });
      created.push({
        id: `${s.id}-b-${Math.random().toString(36).slice(2)}`,
        pairId: s.id,
        faceText: s.word,
        faceImage: s.image ?? null,
        faceMode: secondMode,
        matched: false,
        revealed: false,
      });
    });

    setCards(shuffle(created));
    setFlipped([]);
    setLocked(false);
    setMatchedPair(null);
    setWinnerModalOpen(false);
    completionShownRef.current = false;
    setShowGenerator(false);
    setGeneratorValue(null);
    setGeneratorShowingFinal(false);
    setShowBomb(false);
  }

  // Build on mount / settings change
  useEffect(() => {
    buildDeck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trayCards, gridSize, gameStyle]);

  const allCardsMatched = cards.length > 0 && cards.every((card) => card.matched);
  useEffect(() => {
    if (!allCardsMatched || matchedPair || showGenerator || showBomb || completionShownRef.current) return;
    completionShownRef.current = true;
    setWinnerModalOpen(true);
  }, [allCardsMatched, matchedPair, showBomb, showGenerator]);

  // Flip / match
  function flipCard(index: number) {
    if (locked) return;
    const c = cards[index];
    if (!c || c.matched || c.revealed) return;
    if (!hasTrackedStartRef.current) {
      hasTrackedStartRef.current = true;
      trackGameStart("memory-flip");
    }
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
      advanceTeamTurn();
    }, 700);
  }

  // Teacher actions
  function onRedX() {
    // Close modal only; matched cards remain face-up
    setMatchedPair(null);
  }

  function advanceTeamTurn() {
    setActiveTeamIndex((prev) => {
      if (teams.length <= 1) return 0;
      return (prev + 1) % teams.length;
    });
  }

  async function onGreenO() {
    // Close the matched-pair modal first so the enlarged cards disappear and the grid shows
    setMatchedPair(null);

    // Then continue to generator or bomb
    setTimeout(() => {
      const matchedPairCard = cards.find((c) => c.matched);
      const pairId = matchedPairCard ? matchedPairCard.pairId : undefined;

      const isBomb = Math.random() < bombInsteadProb;

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
    if (generatorSpinning) return;
    setGeneratorSpinning(true);
    setGeneratorShowingFinal(false);
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
      setGeneratorShowingFinal(true);

      generatorAwardTimeoutRef.current = window.setTimeout(async () => {
        await loadConfetti();
        const confettiFn = (window as typeof window & {
          confetti?: (options: Record<string, unknown>) => void;
        }).confetti;
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

        generatorAdvanceTimeoutRef.current = window.setTimeout(() => {
          setGeneratorShowingFinal(false);
          onNext();
        }, 900) as unknown as number;
      }, 1500) as unknown as number;
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
    if (generatorAwardTimeoutRef.current) {
      clearTimeout(generatorAwardTimeoutRef.current as number);
      generatorAwardTimeoutRef.current = null;
    }
    if (generatorAdvanceTimeoutRef.current) {
      clearTimeout(generatorAdvanceTimeoutRef.current as number);
      generatorAdvanceTimeoutRef.current = null;
    }
    setGeneratorSpinning(false);
    setGeneratorValue(null);
    setGeneratorShowingFinal(false);
    setShowGenerator(false);
  }

  function onNext() {
    setMatchedPair(null);
    setShowBomb(false);
    setShowGenerator(false);
    setGeneratorValue(null);
    setGeneratorShowingFinal(false);
    advanceTeamTurn();
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
    closeGenerator();
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
    const faceImage = typeof card.faceImage === "string" && card.faceImage.trim().length > 0
      ? card.faceImage
      : null;

    if (gameStyle === "text-text")
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: "clamp(2rem, 3.5vw, 3.4rem)",
              lineHeight: 0.96,
              maxWidth: "92%",
              wordBreak: "break-word",
            }}
          >
            {card.faceText}
          </div>
        </div>
      );
    if (gameStyle === "image-image")
      return (
        faceImage ? (
          <img
            src={faceImage}
            alt={card.faceText}
            style={{
              width: "100%",
              height: "100%",
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              borderRadius: 8,
              display: "block",
              transform: "scale(1.06)",
              transformOrigin: "center center",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 12,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontWeight: 900,
                fontSize: "clamp(2rem, 3.5vw, 3.4rem)",
                lineHeight: 0.96,
                maxWidth: "92%",
                wordBreak: "break-word",
              }}
            >
              {card.faceText}
            </div>
          </div>
        )
      );
    if (gameStyle === "image-text") {
      return card.faceMode === "image" && faceImage ? (
        <img
          src={faceImage}
          alt={card.faceText}
          style={{
            width: "100%",
            height: "100%",
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            borderRadius: 8,
            display: "block",
            transform: "scale(1.06)",
            transformOrigin: "center center",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 12,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: "clamp(2rem, 3.5vw, 3.4rem)",
              lineHeight: 0.96,
              maxWidth: "92%",
              wordBreak: "break-word",
            }}
          >
            {card.faceText}
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: 14,
          textAlign: "center",
        }}
      >
        {card.faceImage ? (
          <img
            src={card.faceImage}
            alt={card.faceText}
            style={{
              width: "100%",
              height: "100%",
              maxWidth: "100%",
              maxHeight: "70%",
              objectFit: "contain",
              borderRadius: 8,
              display: "block",
              transform: "scale(1.02)",
              transformOrigin: "center center",
            }}
          />
        ) : null}
        <div
          style={{
            fontWeight: 900,
            fontSize: "clamp(1.2rem, 2.2vw, 2.2rem)",
            lineHeight: 1,
            maxWidth: "94%",
            wordBreak: "break-word",
          }}
        >
          {card.faceText}
        </div>
      </div>
    );
  }

  const trayIsEmpty = trayCards.length === 0;
  const boardCards = cards.map((card, index) => ({
    card,
    index,
    faceVisible: card.revealed || card.matched,
  }));

  // JSX
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f0fdf4", fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial" }}>
      <GameHeader
        title="Memory Flip"
        onExit={() => router.push("/games")}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((s) => !s)}
        trackGameKey="memory-flip"
      />

      <div style={{ position: "relative" }}>
        <AnimatePresence>
          {settingsOpen && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} style={{ position: "fixed", top: 76, right: 16, zIndex: 900 }}>
              <GameSettingsDropdown className="w-[420px]">
                  <div style={{ fontWeight: 700 }}>Game controls</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={toggleMusic}
                      className={`btn px-2 py-2 ${musicOn ? "btn-primary" : "btn-secondary"}`}
                    >
                      {musicOn ? "Music On" : "Music Off"}
                    </button>
                    <button onClick={resetGame} className="btn btn-secondary px-2 py-2">
                      Reset game
                    </button>
                  </div>

                  <div style={{ height: 1, background: "rgba(15,23,42,0.08)", margin: "14px 0" }} />

                  <div style={{ fontWeight: 700 }}>Teams</div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={addTeam}
                      disabled={teams.length >= 6}
                      className="btn btn-secondary px-2 py-2"
                    >
                      Add team
                    </button>
                    <button
                      onClick={removeLastTeam}
                      disabled={teams.length <= 2}
                      className="btn btn-secondary px-2 py-2"
                    >
                      Remove team
                    </button>
                    <button onClick={resetScores} className="btn btn-secondary px-2 py-2">
                      Reset scores
                    </button>
                  </div>

                  <div style={{ height: 1, background: "rgba(15,23,42,0.08)", margin: "14px 0" }} />

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

                  <div style={{ marginTop: 12, fontWeight: 700 }}>Bomb chance after a correct match</div>
                  <input type="range" min={0} max={50} value={Math.round(bombInsteadProb * 100)} onChange={(e) => setBombInsteadProb(Number(e.target.value) / 100)} style={{ width: "100%" }} />
                  <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                    Sets how often a matched pair turns into a bomb after the team earns the green O.
                  </div>

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
              </GameSettingsDropdown>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* If the lesson tray is empty show message and two buttons */}
      {trayIsEmpty ? (
        <main style={{ padding: 24, paddingTop: 96, flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", padding: 28, borderRadius: 12, boxShadow: "0 12px 40px rgba(2,6,23,0.08)", textAlign: "center", maxWidth: 720 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>No cards selected</h2>
            <p style={{ color: "#6b7280", marginBottom: 18 }}>There are no cards in the lesson tray. Add cards in Flashcards or choose a saved lesson in My Lessons before starting the game.</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button onClick={() => router.push("/flashcards")} className="btn btn-primary px-3 py-1">
                Go to Flashcards
              </button>
              <button onClick={() => router.push("/dashboard")} className="btn btn-secondary px-3 py-1">
                Return to My Lessons
              </button>
            </div>
          </div>
        </main>
      ) : (
        <>
      {/* Scoreboard */}
      <div className="game-mobile-chrome" style={{ maxWidth: "none", margin: 0, padding: "14px 24px 8px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Scoreboard</h2>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Teams</div>
          </div>

          <div
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: "1px solid rgba(15,23,42,0.12)",
              background: "white",
              boxShadow: "0 6px 12px rgba(2,6,23,0.06)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
            }}
          >
            <span style={{ color: "#6b7280" }}>Active</span>
            <span style={{ fontWeight: 700 }}>{activeTeam?.name ?? "Team 1"}</span>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: "#88a96f", boxShadow: "0 0 0 3px rgba(136,169,111,0.18)" }} />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 8, width: "100%" }}>
          {teams.map((t, i) => {
            const isActive = activeTeamIndex === i;
            return (
              <div
                key={t.id}
                style={{
                  width: "100%",
                  minHeight: 52,
                  padding: "7px 10px",
                  borderRadius: 12,
                  background: "white",
                  color: "#111827",
                  border: `1px solid ${isActive ? "rgba(136,169,111,0.65)" : "rgba(15,23,42,0.08)"}`,
                  boxShadow: isActive ? "0 12px 30px rgba(2,6,23,0.10)" : "0 6px 12px rgba(2,6,23,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  animation: isActive ? "pulse 1.2s infinite" : "none",
                }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 900, lineHeight: 1.05 }}>{t.name}</div>
                  </div>

                <div style={{ fontSize: isActive ? 28 : 20, fontWeight: 900, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
                  {t.score}
                </div>
              </div>
            );
          })}
        </div>
      </div>

          {/* Grid */}
          <div data-game-stage style={{ padding: 20, display: "flex", justifyContent: "center" }}>
            <div
              style={{
                width: "min(1200px, 92vw)",
                background: "#dff6e9",
                borderRadius: 18,
                padding: 18,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
              }}
            >
              <div
                className="relative w-full"
                style={{
                  height: isFullscreen
                    ? "min(760px, calc(var(--game-viewport-height, 100dvh) - 190px))"
                    : "min(760px, 68vh)",
                }}
              >
                <div
                  className="grid h-full w-full gap-2 md:gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
                  }}
                >
                  {boardCards.map(({ card, index, faceVisible }) => {
                    const isMatched = card.matched;
                    const isFlipped = faceVisible;
                    const isHighlighted = matchedPair ? matchedPair.a === index || matchedPair.b === index : false;
                    const backTone = [
                      "#e6fffa",
                      "#ecfccb",
                      "#fef3c7",
                      "#fee2e2",
                      "#ede9fe",
                      "#fff7ed",
                    ][Math.floor(index / gridCols) % 6];
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => flipCard(index)}
                        disabled={locked || isMatched || isFlipped}
                        className={`relative min-w-0 min-h-0 rounded-2xl border-2 overflow-hidden shadow-sm transition-all duration-300 ${
                          isHighlighted ? "ring-4 ring-amber-300 scale-[1.02]" : "hover:shadow-md"
                        } ${isMatched ? "cursor-default" : "cursor-pointer"}`}
                        style={{
                          perspective: 1200,
                          background: isFlipped ? "#ffffff" : backTone,
                          borderColor: isFlipped ? "#d1d5db" : "#b8e0c8",
                          transform: isHighlighted ? "translateY(-2px)" : "translateY(0)",
                        }}
                      >
                        <div
                          className="absolute inset-0 transition-transform duration-500"
                          style={{
                            transformStyle: "preserve-3d",
                            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                          }}
                        >
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{
                              backfaceVisibility: "hidden",
                              WebkitBackfaceVisibility: "hidden",
                              background: backTone,
                            }}
                          >
                            <div className="text-3xl md:text-4xl font-black text-slate-900/90">{index + 1}</div>
                          </div>
                          <div
                            className="absolute inset-0 flex items-center justify-center"
                            style={{
                              backfaceVisibility: "hidden",
                              WebkitBackfaceVisibility: "hidden",
                              transform: "rotateY(180deg)",
                              background: "#fff",
                            }}
                          >
                            <div className="w-full h-full flex items-center justify-center p-0">
                              {renderFace(card)}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Matched pair modal */}
          <AnimatePresence>
            {matchedPair && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150 }}>
                <div style={{ width: "88%", maxWidth: 1180, background: "white", padding: 24, borderRadius: 12, boxShadow: "0 30px 80px rgba(2,6,23,0.2)" }}>
                  <div style={{ display: "flex", gap: 20, alignItems: "center", justifyContent: "center" }}>
                    <motion.div layoutId={`card-${cards[matchedPair.a].id}`} style={{ width: 340, height: 240, borderRadius: 12, background: "white", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                      {renderFace(cards[matchedPair.a])}
                    </motion.div>
                    <motion.div layoutId={`card-${cards[matchedPair.b].id}`} style={{ width: 340, height: 240, borderRadius: 12, background: "white", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
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

          {winnerModalOpen && (
            <GameWinnerModal
              title="Memory Flip complete!"
              message={`${teams.reduce((best, team) => team.score > best.score ? team : best, teams[0])?.name ?? "Your class"} matched the most pairs.`}
              onClose={() => setWinnerModalOpen(false)}
              onPlayAgain={resetGame}
              onReturnToGames={() => router.push("/games")}
            />
          )}

          {/* Reward overlay */}
          <AnimatePresence>
            {showGenerator && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, pointerEvents: "none" }}>
                {!generatorSpinning && !generatorShowingFinal ? (
                  <button
                    onClick={startGenerator}
                    className="pointer-events-auto w-52 h-52 rounded-full bg-[var(--color-accent)] text-white shadow-2xl border-[10px] border-white/85 flex items-center justify-center text-center px-6 hover:scale-105 hover:shadow-[0_18px_50px_rgba(37,99,235,0.35)] transition-transform"
                    title="Get points"
                  >
                    <span className="text-3xl font-extrabold leading-tight">Get points!</span>
                  </button>
                ) : (
                  <div className="pointer-events-auto w-52 h-52 rounded-full bg-white/96 border-[10px] border-[var(--color-accent)] shadow-2xl flex flex-col items-center justify-center">
                    <div className="text-[10px] uppercase tracking-[0.35em] text-[var(--color-text-muted)] mb-2">
                      Points
                    </div>
                    <motion.div
                      key={String(generatorValue) + String(generatorSpinning)}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1.6, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 650, damping: 18 }}
                      style={{ fontSize: 96, fontWeight: 900, minWidth: 240, textAlign: "center", color: "var(--color-accent)", lineHeight: 1 }}
                    >
                      {generatorValue === null ? "…" : generatorValue}
                    </motion.div>
                    <div className="mt-2 text-xs font-semibold text-[var(--color-text-muted)]">
                      Spinning...
                    </div>
                  </div>
                )}
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

function normalizePOS(raw: unknown): TrayCard["partOfSpeech"] | null {
  if (!raw) return null;
  const candidates: string[] = [];
  const keys = ["partOfSpeech", "part_of_speech", "pos", "type", "category", "tag", "posTag", "pos_tag"];
  const record = typeof raw === "object" ? raw as Record<string, unknown> : {};
  for (const k of keys) if (record[k]) candidates.push(String(record[k]));
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

function inferPOSFromFields(obj: unknown): TrayCard["partOfSpeech"] | null {
  if (!obj || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;
  if (record.prepositionType) return "preposition";
  if (record.countability) return "noun";
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
