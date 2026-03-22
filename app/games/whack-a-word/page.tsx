"use client";

import React, { useEffect, useRef, useState } from "react";

/*
  Classendo — Kawaii Whack-a-Word (ready-to-play page)

  Features implemented (MVP):
  - Pre-round teacher prompt: shows a card (image or word). Teacher presses Correct/Incorrect to start round.
  - Configurable mode: images (default) or words.
  - 6 holes, 90s round by default, three difficulty levels.
  - Items pop up at intervals; teacher-marked target is the correct item to "whack".
  - Gentle incorrect feedback; correct gives points and positive animation.
  - Summary screen at end and placeholder hook to save results.
  - Uses only React + TypeScript + minimal inline CSS (Tailwind-friendly classes).
*/

type Card = { id: string; word: string; image?: string | null };

const DEFAULT_HOLES = 6;
const DEFAULT_ROUND_SECONDS = 90;

export default function WhackAWordPage() {
  // basic UI / routing hooks (router not required here)
  // data
  const [cards, setCards] = useState<Card[]>([]);
  // game config
  const [useImages, setUseImages] = useState<boolean>(true); // default images for younger learners
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const holesCount = DEFAULT_HOLES;
  const roundSeconds = DEFAULT_ROUND_SECONDS;

  // game state
  const [gameState, setGameState] = useState<"idle" | "preprompt" | "playing" | "summary">("idle");
  const [targetCard, setTargetCard] = useState<Card | null>(null);
  const [teacherMarkedCorrect, setTeacherMarkedCorrect] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(roundSeconds);
  const [score, setScore] = useState<number>(0);
  const [roundHits, setRoundHits] = useState<number>(0);
  const [roundMisses, setRoundMisses] = useState<number>(0);
  const [holes, setHoles] = useState<(Card | null)[]>(Array(holesCount).fill(null));
  const [showCardReveal, setShowCardReveal] = useState<boolean>(false);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  // refs for intervals / timeouts
  const spawnIntervalRef = useRef<number | null>(null);
  const hideTimeoutsRef = useRef<Record<number, number>>({});
  const timerIntervalRef = useRef<number | null>(null);

  // sounds - small web audio helper
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
  function playTone(freq = 440, dur = 0.08, type: OscillatorType = "sine", gain = 0.02) {
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

  // load vocabulary from localStorage (Classendo lesson tray) or fallback sample
  useEffect(() => {
    try {
      const raw = localStorage.getItem("classendo-lesson-tray");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          const normalized: Card[] = parsed.map((c: any, i: number) => ({
            id: String(c.id ?? c.word ?? `c-${i}`),
            word: String(c.word ?? c.text ?? c.label ?? ""),
            image: c.image ?? null,
          }));
          setCards(normalized);
          setGameState("preprompt"); // if cards exist, go to preprompt automatically
          return;
        }
      }
    } catch {
      // ignore parse errors
    }
    // fallback sample set (small)
    setCards([
      { id: "apple", word: "apple", image: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=600&q=60" },
      { id: "ball", word: "ball", image: "https://images.unsplash.com/photo-1533134486753-c1e2b9b4d3d2?w=600&q=60" },
      { id: "cat", word: "cat", image: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=600&q=60" },
      { id: "dog", word: "dog", image: "https://images.unsplash.com/photo-1507149833265-60c372daea22?w=600&q=60" },
      { id: "fish", word: "fish", image: "https://images.unsplash.com/photo-1503602642458-232111445657?w=600&q=60" },
    ]);
    setGameState("preprompt");
  }, []);

  // choose a random target and show pre-prompt
  useEffect(() => {
    if (gameState !== "preprompt") return;
    if (!cards || cards.length === 0) return;
    const idx = Math.floor(Math.random() * cards.length);
    setTargetCard(cards[idx]);
    setTeacherMarkedCorrect(null);
    setShowCardReveal(false);
  }, [gameState, cards]);

  // difficulty params
  function getSpawnParams() {
    if (difficulty === "easy") return { minSpawn: 900, maxSpawn: 1400, visible: 1400, basePoints: 2 };
    if (difficulty === "hard") return { minSpawn: 350, maxSpawn: 700, visible: 800, basePoints: 1 };
    return { minSpawn: 500, maxSpawn: 900, visible: 1100, basePoints: 1 }; // medium
  }

  // helper random
  const randInt = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));

  // start round
  function startRound(teacherSaysCorrect: boolean) {
    setTeacherMarkedCorrect(teacherSaysCorrect);
    setScore(0);
    setRoundHits(0);
    setRoundMisses(0);
    setTimeLeft(roundSeconds);
    setGameState("playing");

    // start timer
    if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // stop round
          if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
          stopRound();
          return 0;
        }
        return t - 1;
      });
    }, 1000) as unknown as number;

    // start spawn loop
    const { minSpawn, maxSpawn } = getSpawnParams();
    // spawn function called recursively using setTimeout to allow randomized intervals
    const spawnLoop = () => {
      if (gameState !== "playing") return;
      spawnOne();
      const delay = randInt(minSpawn, maxSpawn);
      spawnIntervalRef.current = window.setTimeout(spawnLoop, delay) as unknown as number;
    };
    spawnLoop();
  }

  // stop round
  function stopRound() {
    setGameState("summary");
    // clear spawn timers
    if (spawnIntervalRef.current) {
      window.clearTimeout(spawnIntervalRef.current);
      spawnIntervalRef.current = null;
    }
    // clear hide timeouts for holes
    Object.values(hideTimeoutsRef.current).forEach((id) => window.clearTimeout(id));
    hideTimeoutsRef.current = {};
    // clear timer interval
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    // hide all holes
    setHoles(Array(holesCount).fill(null));
    // placeholder: save result
    saveResult();
  }

  // spawn one item into a random empty hole
  function spawnOne() {
    // choose an empty hole
    const emptyIndexes = holes.map((h, i) => (h ? -1 : i)).filter((i) => i >= 0);
    if (emptyIndexes.length === 0) return;
    const holeIdx = emptyIndexes[Math.floor(Math.random() * emptyIndexes.length)];

    // choose a candidate: include target sometimes to ensure target appears
    // weight target higher if teacher marked correct
    const pool = [...cards];
    // chance to pick target: 30% + (teacherCorrect ? 20% : 0)
    const chanceTarget = 0.3 + (teacherMarkedCorrect ? 0.2 : 0);
    const pickTarget = Math.random() < chanceTarget;
    let chosen: Card;
    if (pickTarget && targetCard) chosen = targetCard;
    else {
      // choose a distractor (not always excluding target to keep variety)
      const others = pool.filter((c) => c.id !== (targetCard?.id ?? ""));
      chosen = others.length ? others[Math.floor(Math.random() * others.length)] : pool[Math.floor(Math.random() * pool.length)];
    }

    // set hole visible
    setHoles((h) => {
      const copy = [...h];
      copy[holeIdx] = chosen;
      return copy;
    });

    // hide after visible duration
    const { visible } = getSpawnParams();
    const hideId = window.setTimeout(() => {
      setHoles((h) => {
        const copy = [...h];
        copy[holeIdx] = null;
        return copy;
      });
      delete hideTimeoutsRef.current[holeIdx];
    }, visible) as unknown as number;
    hideTimeoutsRef.current[holeIdx] = hideId;
  }

  // handle tap/click on a hole
  function handleHit(holeIndex: number) {
    const card = holes[holeIndex];
    if (!card || gameState !== "playing") return;

    // hide clicked immediately
    setHoles((h) => {
      const copy = [...h];
      copy[holeIndex] = null;
      return copy;
    });
    if (hideTimeoutsRef.current[holeIndex]) {
      window.clearTimeout(hideTimeoutsRef.current[holeIndex]);
      delete hideTimeoutsRef.current[holeIndex];
    }

    // is it the target?
    if (targetCard && card.id === targetCard.id) {
      // correct
      const base = teacherMarkedCorrect ? 2 : 1; // teacher-correct boosts points this round
      setScore((s) => s + base);
      setRoundHits((h) => h + 1);
      // positive sound & small animation (playTone)
      playTone(900, 0.08, "sine", 0.03);
      // optional quick effect: show reveal for a moment
      setShowCardReveal(true);
      window.setTimeout(() => setShowCardReveal(false), 500);
    } else {
      // incorrect: gentle feedback
      setRoundMisses((m) => m + 1);
      playTone(300, 0.12, "sine", 0.02);
      // no points, no harsh penalty
    }
  }

  // placeholder: save result to backend (hook up to Classendo / Supabase)
  async function saveResult() {
    const accuracy = roundHits + roundMisses > 0 ? roundHits / (roundHits + roundMisses) : 0;
    const stars = accuracy >= 0.9 ? 3 : accuracy >= 0.75 ? 2 : accuracy >= 0.5 ? 1 : 0;
    const payload = {
      score,
      hits: roundHits,
      misses: roundMisses,
      accuracy,
      stars,
      target: targetCard?.id ?? null,
      timestamp: new Date().toISOString(),
    };
    // TODO: POST /api/games/whack-a-word/results
    console.log("Save result (placeholder):", payload);
    // If you integrate with Supabase / Classendo, call API here.
  }

  // helper: start new round from summary or idle
  function beginPreprompt() {
    setGameState("preprompt");
  }

  // cleanup intervals/timeouts on unmount
  useEffect(() => {
    return () => {
      if (spawnIntervalRef.current) window.clearTimeout(spawnIntervalRef.current);
      Object.values(hideTimeoutsRef.current).forEach((id) => window.clearTimeout(id));
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
    };
  }, []);

  // UI components & markup
  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-[#F6F9FF] to-[#EAF7FF] text-[#0B2545]">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Kawaii Whack-a-Word</h1>
            <div className="text-sm text-slate-600">Cute classroom vocabulary practice — Classendo</div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-600">Mode:</div>
            <div className="flex gap-2">
              <button className={`px-2 py-1 rounded ${useImages ? "bg-[#A7F3D0]" : "bg-white/80"}`} onClick={() => setUseImages(true)}>Images</button>
              <button className={`px-2 py-1 rounded ${!useImages ? "bg-[#A7F3D0]" : "bg-white/80"}`} onClick={() => setUseImages(false)}>Words</button>
            </div>
            <div className="text-sm text-slate-600">Difficulty:</div>
            <select className="px-2 py-1 rounded" value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
            <button className="px-3 py-1 rounded bg-white/90" onClick={() => beginPreprompt()}>New Round</button>
          </div>
        </header>

        {/* HUD */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/90 px-3 py-2 rounded shadow-sm">
              <div className="text-xs text-slate-500">Team Score</div>
              <div className="text-lg font-semibold">{score}</div>
            </div>

            <div className="bg-white/90 px-3 py-2 rounded shadow-sm">
              <div className="text-xs text-slate-500">Time</div>
              <div className="text-lg font-semibold">{timeLeft}s</div>
            </div>

            <div className="bg-white/90 px-3 py-2 rounded shadow-sm">
              <div className="text-xs text-slate-500">Hits</div>
              <div className="text-lg font-semibold">{roundHits}</div>
            </div>
          </div>

          <div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={reducedMotion} onChange={(e) => setReducedMotion(e.target.checked)} />
              Reduce motion
            </label>
          </div>
        </div>

        {/* Board */}
        <div className="bg-white/80 rounded-lg p-6 shadow-lg">
          {/* target display */}
          <div className="mb-4 flex items-center justify-center">
            <div className="text-center">
              <div className="text-sm text-slate-600">Target</div>
              <div className="mt-2">
                {targetCard ? (
                  <div className="inline-flex items-center gap-3 bg-[#FFF4E6] px-4 py-2 rounded-full shadow-sm">
                    {useImages && targetCard.image ? (
                      <img src={targetCard.image} alt={targetCard.word} className="w-12 h-12 object-cover rounded-md" />
                    ) : (
                      <div className="w-12 h-12 flex items-center justify-center rounded-md bg-[#C7E7FF] text-lg font-semibold">{targetCard.word[0].toUpperCase()}</div>
                    )}
                    <div className="text-lg font-semibold">{useImages ? "" : targetCard.word}</div>
                    {showCardReveal && <div className="ml-2 text-sm text-green-600">✔</div>}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">No card chosen</div>
                )}
              </div>
            </div>
          </div>

          {/* holes grid */}
          <div className="grid grid-cols-3 gap-4 justify-center">
            {holes.map((card, idx) => (
              <button
                key={idx}
                onClick={() => handleHit(idx)}
                className="relative bg-[#FFEFEF] rounded-xl h-36 flex items-end justify-center overflow-hidden shadow-md hover:brightness-95"
                aria-label={`Hole ${idx + 1}`}
                style={{
                  transition: reducedMotion ? "none" : "transform 120ms ease",
                }}
              >
                {/* hole rim */}
                <div className="absolute top-0 left-0 right-0 h-12 bg-[#FFF4E6] rounded-t-xl" />
                {/* content */}
                {card ? (
                  <div className="z-10 mb-2 w-full flex items-center justify-center px-2">
                    {useImages && card.image ? (
                      <img src={card.image} alt={card.word} className="w-28 h-24 object-cover rounded-md" />
                    ) : (
                      <div className="px-3 py-2 bg-white rounded-md text-lg font-semibold">{card.word}</div>
                    )}
                  </div>
                ) : (
                  <div className="z-10 mb-2 w-full flex items-center justify-center px-2">
                    <div className="w-28 h-24 rounded-md bg-[#FFF4E6]" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom controls / Summary */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-slate-600">Rounds are short and calm — teacher marks the pre-round prompt.</div>
          <div className="flex items-center gap-3">
            {gameState === "idle" && (
              <button className="px-4 py-2 bg-[#A7F3D0] rounded" onClick={() => setGameState("preprompt")}>Prepare Round</button>
            )}

            {gameState === "summary" && (
              <button
                className="px-4 py-2 bg-[#C7E7FF] rounded"
                onClick={() => {
                  // new round: pick a new target
                  setGameState("preprompt");
                }}
              >
                New Round
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pre-round modal (teacher prompt) */}
      {gameState === "preprompt" && targetCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full text-center shadow-lg">
            <h2 className="text-xl font-bold mb-2">Pre‑Round: Is this correct?</h2>
            <p className="text-sm text-slate-600 mb-4">Show the student this card and mark whether they identified it.</p>

            <div className="mb-4">
              {useImages && targetCard.image ? (
                <img src={targetCard.image} alt={targetCard.word} className="mx-auto w-44 h-36 object-cover rounded-md shadow" />
              ) : (
                <div className="mx-auto w-44 h-36 flex items-center justify-center bg-[#C7E7FF] rounded-md text-2xl font-semibold">{targetCard.word}</div>
              )}
            </div>

            <div className="flex gap-4 justify-center">
              <button
                className="px-4 py-2 bg-green-500 text-white rounded-lg"
                onClick={() => {
                  // teacher says student got it right: start playing with a points boost
                  setTeacherMarkedCorrect(true);
                  startRound(true);
                }}
              >
                ✅ Correct — Start Round
              </button>
              <button
                className="px-4 py-2 bg-yellow-400 text-black rounded-lg"
                onClick={() => {
                  // teacher marks not correct but still start
                  setTeacherMarkedCorrect(false);
                  startRound(false);
                }}
              >
                ❌ Not Yet — Start (Weaker)
              </button>
              <button
                className="px-4 py-2 bg-gray-100 text-black rounded-lg"
                onClick={() => {
                  // pick another target
                  if (cards.length > 1) {
                    const next = cards[Math.floor(Math.random() * cards.length)];
                    setTargetCard(next);
                    setShowCardReveal(false);
                  }
                }}
              >
                🔁 Next Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary modal */}
      {gameState === "summary" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full text-center shadow-lg">
            <h2 className="text-2xl font-bold mb-2">Round Summary</h2>
            <div className="text-sm text-slate-600 mb-4">Nice work! Here are the results:</div>
            <div className="flex gap-4 justify-center mb-4">
              <div className="bg-[#FFFAF0] p-3 rounded">
                <div className="text-xs text-slate-500">Score</div>
                <div className="text-lg font-semibold">{score}</div>
              </div>
              <div className="bg-[#F0FFF4] p-3 rounded">
                <div className="text-xs text-slate-500">Hits</div>
                <div className="text-lg font-semibold">{roundHits}</div>
              </div>
              <div className="bg-[#FFF0F0] p-3 rounded">
                <div className="text-xs text-slate-500">Misses</div>
                <div className="text-lg font-semibold">{roundMisses}</div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button
                className="px-4 py-2 bg-green-600 text-white rounded"
                onClick={() => {
                  // prepare new round
                  setGameState("preprompt");
                }}
              >
                New Round
              </button>
              <button
                className="px-4 py-2 bg-gray-200 rounded"
                onClick={() => {
                  // back to teacher config (idle)
                  setGameState("idle");
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}