"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GameHeader from "@/components/games/GameHeader";
import { GameSettingsModal } from "@/components/games/GameSettingsSurface";
import { GameWinnerModal } from "@/components/games/GameWinnerModal";
import { trackGameStart } from "@/lib/games/track-game-start";

/*
  Four Corners — blackout selection with optional bomb animation (v-update)
  - When the 10s countdown reaches 0 three of the four quarters are blacked out
    one-by-one over ~3 seconds leaving a single visible quarter.
  - After the blackout sequence we roll for a bomb using the runtime Settings slider
    (bombProb). If bomb occurs we show a big bomb animation (no confetti). Bomb does
    NOT permanently eliminate any quarters (just a visual). Quarters remain blacked
    out until the teacher presses Next.
  - If no bomb, we play success SFX, show confetti, then reveal the first unused
    flashcard in the center. Quarters still remain blacked out until Next.
  - Next clears the blackouts and the center content and returns to idle so teacher
    can start the next round.
  - Small non-intrusive card counter added to header showing used / total.
*/

type TrayCard = {
  id: string;
  word: string;
  partOfSpeech: "noun" | "verb" | "adjective" | "preposition" | "phonics";
  countability?: "count" | "uncount";
  prepositionType?: "place" | "movement";
  image?: string | null;
};

const LESSON_TRAY_KEY = "classendo-lesson-tray";
const CONFETTI_CDN = "https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.4/dist/confetti.browser.min.js";

export default function FourCornersPage() {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onFullChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFullChange);
    return () => document.removeEventListener("fullscreenchange", onFullChange);
  }, []);

  /* ---------- Lesson tray load (preserve) ---------- */
  const [tray, setTray] = useState<TrayCard[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LESSON_TRAY_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const normalized = parsed.map((c: Record<string, unknown>) => {
          const pos =
            normalizePOS(c) ??
            normalizePOS(c?.partOfSpeech) ??
            normalizePOS(c?.pos) ??
            inferPOSFromFields(c) ??
            null;
          const finalPos = (pos as TrayCard["partOfSpeech"]) ?? "noun";
          return {
            id: String(c.id ?? c.word ?? Math.random().toString(36).slice(2)),
            word: String(c.word ?? c.text ?? c.label ?? ""),
            partOfSpeech: finalPos,
            countability: c.countability,
            prepositionType: c.prepositionType,
            image: c.image ?? null,
          } as TrayCard;
        });
        setTray(normalized);
      }
    } catch (e) {
      console.error("Failed to load lesson tray", e);
    }
  }, []);

  const presentPOS = useMemo(() => {
    const s = new Set<TrayCard["partOfSpeech"]>();
    for (const t of tray) s.add(t.partOfSpeech);
    return s;
  }, [tray]);

  /* ---------- Audio / SFX ---------- */
  const audioCtxRef = useRef<AudioContext | null>(null);
  const musicIntervalRef = useRef<number | null>(null);
  const [musicOn, setMusicOn] = useState(false);

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

  const audio = {
    musicOn,
    toggleMusic: () => {
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
        }, 360);
      } else {
        if (musicIntervalRef.current) { clearInterval(musicIntervalRef.current); musicIntervalRef.current = null; }
        ctx.suspend().catch(() => {});
      }
    },
    stopMusic: () => {
      if (musicIntervalRef.current) { clearInterval(musicIntervalRef.current); musicIntervalRef.current = null; }
      const ctx = getAudioCtx();
      if (ctx) ctx.suspend().catch(() => {});
      setMusicOn(false);
    },
    playStart: () => { playTone(660, 0.08, "sine", 0.04); setTimeout(() => playTone(880, 0.06, "sine", 0.03), 90); },
    playTick: () => { playTone(880, 0.02, "sine", 0.02); },
    playGong: () => { playTone(160, 0.5, "sine", 0.12); setTimeout(()=>playTone(90,0.4,"sine",0.08),120); },
    playSuccess: () => { playTone(880, 0.08, "sine", 0.06); setTimeout(()=>playTone(1100,0.06,"sine",0.05),90); },
    playBomb: () => { playTone(120,0.28,"sawtooth",0.12); setTimeout(()=>playTone(80,0.36,"sawtooth",0.10),80); }
  };

  /* ---------- Game state ---------- */
  const [usedIndices, setUsedIndices] = useState<number[]>([]);
  const [eliminated, setEliminated] = useState<boolean[]>([false, false, false, false]); // persistent dimming if you use that elsewhere

  type Phase = "idle" | "countdown" | "animating" | "bomb" | "showcard" | "finished";
  const [phase, setPhase] = useState<Phase>("idle");

  const COUNT_START = 10;
  const [count, setCount] = useState<number>(COUNT_START);
  const countRef = useRef<number>(COUNT_START);
  const countdownIntervalRef = useRef<number | null>(null);

  const [spotlightIndex, setSpotlightIndex] = useState<number | null>(null);
  const [previousSpotlightIndex, setPreviousSpotlightIndex] = useState<number | null>(null);
  const spotlightIntervalRef = useRef<number | null>(null);
  const spotlightCurrentRef = useRef<number | null>(null);

  // blackout animation state (temporary per-round)
  const [blackedOut, setBlackedOut] = useState<boolean[]>([false, false, false, false]);
  const blackoutTimeoutsRef = useRef<number[]>([]);

  // shown card when phase === 'showcard'
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState<number | null>(null);

  /* ---------- Variants & Settings ---------- */
  const [variants, setVariants] = useState<Record<string, boolean>>({
    noun_count: false, noun_uncount: false, noun_singular: false, noun_plural: false,
    verb_present_simple: false, verb_present_cont: false, verb_past_simple: false, verb_past_cont: false, verb_present_perfect: false,
    adj_base: false, adj_comparative: false, adj_superlative: false,
    prep_place: false, prep_movement: false,
    phonicsIncluded: false,
  });
  function toggleVariantSimple(k: string) { setVariants(s => ({ ...s, [k]: !s[k] })); }
  function anyVariantSelected() { return Object.values(variants).some(Boolean); }

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bombProb, setBombProb] = useState<number>(0.20); // default 20%

  /* ---------- helpers: cards ---------- */
  function cardAllowedByVariants(card: TrayCard) {
    if (!card) return false;
    if (!Object.values(variants).some(v => v === true)) return true;
    if (card.partOfSpeech === "phonics") return !!variants.phonicsIncluded;
    if (card.partOfSpeech === "noun") {
      return variants.noun_count || variants.noun_uncount || variants.noun_singular || variants.noun_plural;
    }
    if (card.partOfSpeech === "verb") {
      return variants.verb_present_simple || variants.verb_present_cont || variants.verb_past_simple || variants.verb_past_cont || variants.verb_present_perfect;
    }
    if (card.partOfSpeech === "adjective") {
      return variants.adj_base || variants.adj_comparative || variants.adj_superlative;
    }
    if (card.partOfSpeech === "preposition") {
      return variants.prep_place || variants.prep_movement;
    }
    return false;
  }

  function pickNextCardIndex(): number | null {
    if (tray.length === 0) return null;
    const all = tray.map((_, i) => i);
    const unused = all.filter(i => !usedIndices.includes(i));
    const allowed = unused.filter(i => cardAllowedByVariants(tray[i]));
    const pool = allowed.length ? allowed : unused;
    if (pool.length === 0) return null;
    return pool[0];
  }

  /* ---------- countdown & spotlight ---------- */
  function startCountdown() {
    if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
    countRef.current = COUNT_START;
    setCount(COUNT_START);
    countdownIntervalRef.current = window.setInterval(() => {
      countRef.current -= 1;
      setCount(countRef.current);
      if (countRef.current <= 3) audio.playTick();
      if (countRef.current <= 0) {
        if (countdownIntervalRef.current) { window.clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
        onCountdownFinished();
      }
    }, 1000);
  }

  function startSpotlight() {
    if (spotlightIntervalRef.current) window.clearInterval(spotlightIntervalRef.current);
    const tick = () => {
      const active = eliminated.map((e,i) => !e ? i : -1).filter(i => i>=0);
      if (active.length === 0) {
        setPreviousSpotlightIndex(null);
        setSpotlightIndex(null);
        spotlightCurrentRef.current = null;
        return;
      }
      const nextSpotlight = active[Math.floor(Math.random() * active.length)];
      setPreviousSpotlightIndex(spotlightCurrentRef.current);
      spotlightCurrentRef.current = nextSpotlight;
      setSpotlightIndex(nextSpotlight);
    };
    tick();
    spotlightIntervalRef.current = window.setInterval(tick, 350 + Math.floor(Math.random()*350));
  }

  function clearCountdownAndSpotlight() {
    if (countdownIntervalRef.current) { window.clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    if (spotlightIntervalRef.current) { window.clearInterval(spotlightIntervalRef.current); spotlightIntervalRef.current = null; }
    setPreviousSpotlightIndex(null);
    setSpotlightIndex(null);
    spotlightCurrentRef.current = null;
  }

  /* ---------- blackout animation & bomb handling ---------- */
  function onCountdownFinished() {
    clearCountdownAndSpotlight();
    audio.playGong();
    runBlackoutAnimation();
  }

  function runBlackoutAnimation() {
    // clear prior timeouts
    blackoutTimeoutsRef.current.forEach(t => clearTimeout(t));
    blackoutTimeoutsRef.current = [];
    setBlackedOut([false, false, false, false]);

    // determine active quarters (not permanently eliminated)
    const active = eliminated.map((e,i) => !e ? i : -1).filter(i => i >= 0);
    if (active.length === 0) {
      setPhase("finished");
      return;
    }

    // choose one safe quarter randomly (the visible one)
    const safe = active[Math.floor(Math.random() * active.length)];
    // choose three indices to blackout (distinct from safe)
    const allIndices = [0,1,2,3].filter(i => i !== safe);
    const shuffled = shuffle(allIndices);
    const toBlackout = shuffled.slice(0, 3);

    setPhase("animating");

    // blackout one at a time
    toBlackout.forEach((q, i) => {
      const t = window.setTimeout(() => {
        setBlackedOut(prev => {
          const next = prev.slice();
          next[q] = true;
          return next;
        });
        audio.playTick();
      }, (i + 1) * 900); // ~0.9s apart -> ~2.7s total
      blackoutTimeoutsRef.current.push(t);
    });

    // after blackout sequence finish, decide bomb or not
    const finishT = window.setTimeout(async () => {
      const isBomb = Math.random() < bombProb;
      if (isBomb) {
        // show bomb animation (no confetti), keep blackouts until teacher presses Next
        setPhase("bomb");
        audio.playBomb();
        // do NOT change usedIndices or show a card
      } else {
        // success: confetti + show first unused flashcard in center; keep blackouts until Next
        audio.playSuccess();
        await loadConfettiScript();
        const confettiFn = (window as typeof window & {
          confetti?: (options: Record<string, unknown>) => void;
        }).confetti;
        if (typeof confettiFn === "function") confettiFn({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

        const nextCard = pickNextCardIndex();
        if (nextCard === null) {
          setPhase("finished");
          return;
        }
        setUsedIndices(prev => [...prev, nextCard]);
        setCurrentFlashcardIndex(nextCard);
        setPhase("showcard");
        // DO NOT clear blackedOut here — teacher must press Next to continue
      }
    }, 3200);
    blackoutTimeoutsRef.current.push(finishT);
  }

  /* ---------- Next / Reset ---------- */
  function onNextPressedByTeacher() {
    // Teacher pressed Next after bomb or after seeing flashcard. Clear blackouts and center, go to idle.
    blackoutTimeoutsRef.current.forEach(t => clearTimeout(t));
    blackoutTimeoutsRef.current = [];
    setBlackedOut([false, false, false, false]);
    setCurrentFlashcardIndex(null);
    setPhase("idle");
  }

  function resetAll() {
    blackoutTimeoutsRef.current.forEach(t => clearTimeout(t));
    blackoutTimeoutsRef.current = [];
    setUsedIndices([]);
    setEliminated([false,false,false,false]);
    setBlackedOut([false,false,false,false]);
    setCurrentFlashcardIndex(null);
    setPhase("idle");
    setCount(COUNT_START);
    audio.stopMusic();
  }

  /* ---------- confetti loader via CDN ---------- */
  const confettiLoadedRef = useRef<boolean>(false);
  const confettiLoadingRef = useRef<Promise<void> | null>(null);
  function loadConfettiScript(): Promise<void> {
    if (confettiLoadedRef.current) return Promise.resolve();
    if (confettiLoadingRef.current) return confettiLoadingRef.current;
    confettiLoadingRef.current = new Promise<void>((resolve) => {
      try {
        const s = document.createElement("script");
        s.src = CONFETTI_CDN;
        s.async = true;
        s.onload = () => { confettiLoadedRef.current = true; resolve(); };
        s.onerror = () => { console.warn("Failed to load confetti script"); resolve(); };
        document.head.appendChild(s);
      } catch {
        resolve();
      }
    });
    return confettiLoadingRef.current;
  }

  /* ---------- cleanup ---------- */
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) window.clearInterval(countdownIntervalRef.current);
      if (spotlightIntervalRef.current) window.clearInterval(spotlightIntervalRef.current);
      blackoutTimeoutsRef.current.forEach(t => clearTimeout(t));
      if (musicIntervalRef.current) clearInterval(musicIntervalRef.current);
    };
  }, []);

  function handleStartGameClick() {
    if (phase !== "idle") return;
    trackGameStart("four-corners");
    setPhase("countdown");
    startCountdown();
    startSpotlight();
    audio.playStart();
  }

  function handleNextClick() {
    if (phase !== "bomb" && phase !== "showcard") return;
    onNextPressedByTeacher();
  }

  /* ---------- render UI ---------- */

  // If game selected but lesson tray empty -> show message with two buttons
  const trayIsEmpty = tray.length === 0;
  const currentCard = currentFlashcardIndex !== null ? tray[currentFlashcardIndex] : null;

  return (
    <div className="min-h-screen bg-gray-50 text-black">
      <GameHeader
        title="Four Corners"
        onExit={() => router.push("/games")}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => {
          if (document.fullscreenElement) document.exitFullscreen();
          else document.documentElement.requestFullscreen();
        }}
        settingsOpen={settingsOpen}
        onToggleSettings={() => setSettingsOpen((s) => !s)}
        trackGameKey="four-corners"
      />

      {trayIsEmpty ? (
        <main data-game-stage style={{ paddingTop: 80 }} className="max-w-7xl mx-auto px-6 pb-12">
          <div className="min-h-[calc(100vh-120px)] flex items-center justify-center">
            <div className="bg-white rounded-xl p-8 shadow-lg text-center">
              <h2 className="text-2xl font-bold mb-3">No cards selected</h2>
              <p className="text-sm text-gray-600 mb-6">Please add cards to the lesson tray before starting this game.</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => router.push("/flashcards")} className="btn btn-primary px-3 py-1">Go to Flashcards</button>
                <button onClick={() => router.push("/dashboard")} className="btn btn-secondary px-3 py-1">Return to Dashboard</button>
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main data-game-stage style={{ paddingTop: 80 }} className="max-w-7xl mx-auto px-6 pb-12">
          <div className="relative rounded-2xl shadow-xl overflow-hidden bg-[#f8fafc]" style={{ height: "calc(100vh - 120px)" }}>
            <div className="relative w-full h-full p-4 md:p-5">
              <div className="relative w-full h-full rounded-[28px] border border-slate-200 bg-[#f7faf7] shadow-inner overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                  {[
                    { title: "Make a sentence", caption: "Create a sentence", icon: "📝", color: "#6366f1" },
                    { title: "Make a question", caption: "Turn it into a question", icon: "❓", color: "#10b981" },
                    { title: "Do an action", caption: "Act it out", icon: "🎭", color: "#f59e0b" },
                    { title: "Make a negative", caption: "Say the negative form", icon: "🚫", color: "#f43f5e" },
                  ].map((quarter, index) => {
                    const isSpotlight = phase === "countdown" && spotlightIndex === index;
                    const wasSpotlight = phase === "countdown" && previousSpotlightIndex === index && !isSpotlight;
                    const isBlack = blackedOut[index];
                    return (
                      <div
                        key={quarter.title}
                        className={`relative flex items-center justify-center border border-white/70 transition-all duration-500 ease-out ${
                          isSpotlight ? "scale-[1.04] brightness-110" : wasSpotlight ? "scale-[0.99] brightness-90" : "scale-100"
                        }`}
                        style={{ backgroundColor: quarter.color }}
                      >
                        <div className={`absolute inset-0 transition-opacity duration-500 ${isSpotlight ? "opacity-100" : "opacity-0"}`}>
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.28),transparent_64%)]" />
                          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.22),transparent_35%,rgba(255,255,255,0.06)_65%,transparent)] animate-pulse" />
                        </div>
                        <div className="absolute left-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/28 text-2xl font-black text-white shadow-[0_10px_20px_rgba(15,23,42,0.08)] backdrop-blur-sm md:h-14 md:w-14 md:text-3xl">
                          {index + 1}
                        </div>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center px-6">
                          <div className={`transition-transform duration-500 ${isSpotlight ? "scale-110" : "scale-100"}`}>
                            <div className="text-5xl md:text-6xl mb-2">{quarter.icon}</div>
                          </div>
                          <div className="text-2xl md:text-3xl font-extrabold leading-tight max-w-[260px]">{quarter.title}</div>
                          <div className="mt-1 text-sm md:text-base opacity-90 max-w-[260px]">{quarter.caption}</div>
                        </div>
                        <div className={`absolute inset-0 transition-opacity duration-500 ${wasSpotlight ? "opacity-100" : "opacity-0"}`}>
                          <div className="absolute inset-0 ring-4 ring-white/60" />
                        </div>
                        <div className={`absolute inset-0 bg-black transition-opacity duration-300 ${isBlack ? "opacity-[0.96]" : "opacity-0"}`} />
                        <div className={`absolute inset-0 ring-4 ring-yellow-200/0 transition-opacity duration-300 ${isSpotlight ? "ring-yellow-200/90" : ""}`} />
                      </div>
                    );
                  })}
                </div>

                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-full max-w-[920px] flex flex-col items-center justify-center px-8">
                    {phase === "idle" && (
                      <button
                        onClick={handleStartGameClick}
                        className="pointer-events-auto w-48 h-48 rounded-full bg-[linear-gradient(180deg,#60a5fa,#2563eb)] text-white shadow-2xl border-[10px] border-white/85 flex items-center justify-center text-center px-6 hover:scale-105 hover:shadow-[0_18px_50px_rgba(37,99,235,0.35)] transition-transform"
                        title="Start"
                      >
                        <span className="text-3xl font-extrabold leading-tight">Start</span>
                      </button>
                    )}

                    {phase === "countdown" && (
                      <div className="pointer-events-none flex flex-col items-center justify-center">
                        <div
                          className={`inline-flex items-center justify-center min-w-[180px] px-8 py-6 rounded-[28px] text-white font-extrabold text-[56px] md:text-[72px] shadow-2xl transition-transform ${
                            count <= 3
                              ? "bg-[linear-gradient(90deg,#ff2d55,#ff0000)] animate-pulse"
                              : "bg-[linear-gradient(90deg,#ff7a18,#ff2d55)]"
                          }`}
                        >
                          {count}
                        </div>
                        <div className="mt-4 text-2xl md:text-3xl font-bold text-slate-700">Quick! Find a corner!</div>
                      </div>
                    )}

                    {phase === "animating" && (
                      <div className="pointer-events-none rounded-[32px] border border-white/30 bg-[rgba(15,23,42,0.76)] px-10 py-6 shadow-2xl text-white text-3xl md:text-4xl font-extrabold">
                        Selecting...
                      </div>
                    )}

                    {phase === "bomb" && (
                      <div className="pointer-events-auto flex flex-col items-center justify-center gap-6">
                        <div className="w-56 h-56 md:w-64 md:h-64 rounded-full bg-[linear-gradient(180deg,#fb923c,#ef4444)] border-[10px] border-white shadow-2xl flex items-center justify-center text-white text-5xl md:text-6xl font-extrabold">
                          BOOM!
                        </div>
                        <button
                          onClick={handleNextClick}
                          className="w-44 h-44 rounded-full bg-[linear-gradient(180deg,#60a5fa,#2563eb)] text-white shadow-2xl border-[10px] border-white/85 flex items-center justify-center text-center px-6 hover:scale-105 transition-transform"
                        >
                          <span className="text-3xl font-extrabold leading-tight">Next</span>
                        </button>
                      </div>
                    )}

                    {phase === "showcard" && (
                      <div className="pointer-events-auto flex flex-col items-center justify-center gap-4">
                        <div className="w-[min(76vw,720px)] h-[min(42vh,330px)] rounded-[32px] border-2 border-slate-200 bg-white shadow-2xl flex items-center justify-center overflow-hidden">
                          {currentCard?.image ? (
                            <img
                              src={currentCard.image}
                              alt={currentCard.word}
                              className="w-full h-full object-contain select-none"
                              draggable={false}
                            />
                          ) : (
                            <div className="px-8 text-center">
                              <div className="text-4xl md:text-6xl font-extrabold text-slate-800">{currentCard?.word ?? ""}</div>
                            </div>
                          )}
                        </div>
                        {currentCard?.word && (
                          <div className="max-w-[min(90vw,760px)] rounded-[24px] border-2 border-slate-200 bg-white/96 px-6 py-3 shadow-xl">
                            <div className="text-2xl md:text-4xl font-extrabold text-slate-800 text-center leading-tight">
                              {currentCard.word}
                            </div>
                          </div>
                        )}
                        <button
                          onClick={handleNextClick}
                          className="w-44 h-44 rounded-full bg-[linear-gradient(180deg,#60a5fa,#2563eb)] text-white shadow-2xl border-[10px] border-white/85 flex items-center justify-center text-center px-6 hover:scale-105 transition-transform"
                        >
                          <span className="text-3xl font-extrabold leading-tight">Next</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="absolute top-4 right-4 z-20">
                  <div className="rounded-2xl border-2 border-white bg-white/95 shadow-xl px-4 py-2 text-sm md:text-base font-semibold text-slate-800">
                    Bomb: {(bombProb * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* Settings modal */}
      {settingsOpen && (
        <GameSettingsModal className="max-w-md">
            <h3 className="text-lg font-bold mb-2">Settings</h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-4">
              Adjust how often the bomb animation appears.
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              <button onClick={resetAll} className="btn btn-secondary px-3 py-2 text-sm">Reset game</button>
              <button
                onClick={() => audio.toggleMusic()}
                className={`btn px-3 py-2 text-sm ${audio.musicOn ? "btn-primary" : "btn-secondary"}`}
              >
                {audio.musicOn ? "Music On" : "Music Off"}
              </button>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm mb-4">
              <label className="block text-sm font-semibold text-[var(--color-text-main)]">
                Bomb probability: {(bombProb * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min={0}
                max={50}
                value={Math.round(bombProb * 100)}
                onChange={(e) => setBombProb(Number(e.target.value) / 100)}
                className="w-full mt-3"
              />
              <div className="text-xs text-[var(--color-text-muted)] mt-2">
                Adjust how often a bomb animation appears (0% - 50%). Default 20%.
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setSettingsOpen(false)} className="btn btn-secondary px-3 py-1">Close</button>
            </div>
        </GameSettingsModal>
      )}

      {/* Finished modal */}
      {phase === "finished" && (
        <GameWinnerModal
          title="Congratulations!"
          message="You survived Four Corners. All flashcards have been used or all corners were eliminated."
          onClose={() => setPhase("idle")}
          onPlayAgain={() => { setUsedIndices([]); setEliminated([false, false, false, false]); setPhase("idle"); }}
          onReturnToGames={() => router.push("/games")}
        />
      )}
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
