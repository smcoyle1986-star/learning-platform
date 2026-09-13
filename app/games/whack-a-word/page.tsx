"use client";

import { readGameTrayRaw } from "@/lib/games/session";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GameHeader from "@/components/games/GameHeader";
import { GameSettingsDropdown } from "@/components/games/GameSettingsSurface";
import PhaserGameHost from "@/components/games/phaser/PhaserGameHost";
import { ResponsiveStorageImage } from "@/components/images/ResponsiveStorageImage";
import { resolveLessonImageUrl } from "@/lib/lessons/image";
import {
  createWhackWordGame,
  type WhackDifficulty,
  type WhackSceneApi,
  type WhackSceneEvent,
} from "@/lib/games/phaser/whack-a-word";

/*
  Classendo — Kawaii Whack-a-Word (ready-to-play page)

  A focused Phaser classroom game with a configurable timed round.
*/

type Card = { id: string; word: string; image?: string | null; imageFallback?: string | null };
type Team = { id: string; name: string; score: number };

const DEFAULT_ROUND_SECONDS = 30;
const MALLET_CURSOR = "url('/games/whack-a-word-mallet.png') 56 20, auto";

export default function WhackAWordPage() {
  const router = useRouter();
  // basic UI / routing hooks (router not required here)
  const [isFullscreen, setIsFullscreen] = useState(false);
  // data
  const [cards, setCards] = useState<Card[]>([]);
  // game config
  const [useImages, setUseImages] = useState<boolean>(true); // default images for younger learners
  const [difficulty, setDifficulty] = useState<WhackDifficulty>("medium");
  const [roundSeconds, setRoundSeconds] = useState(DEFAULT_ROUND_SECONDS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [teams, setTeams] = useState<Team[]>([
    { id: "team-1", name: "Team 1", score: 0 },
    { id: "team-2", name: "Team 2", score: 0 },
  ]);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);

  // game state
  const [gameState, setGameState] = useState<"ready" | "playing" | "summary">("ready");
  const [targetCard, setTargetCard] = useState<Card | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(roundSeconds);
  const [roundHits, setRoundHits] = useState<number>(0);
  const [roundMisses, setRoundMisses] = useState<number>(0);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  const timerIntervalRef = useRef<number | null>(null);
  const sceneApiRef = useRef<WhackSceneApi | null>(null);
  const targetDeckRef = useRef<Card[]>([]);
  const musicTimerRef = useRef<number | null>(null);
  const musicStepRef = useRef(0);
  const activeTeam = teams[activeTeamIndex] ?? teams[0];
  const rankedTeams = [...teams].sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));

  useEffect(() => {
    function onFullChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFullChange);
    return () => document.removeEventListener("fullscreenchange", onFullChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  // sounds - small web audio helper
  const audioCtxRef = useRef<AudioContext | null>(null);
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
  function playTone(freq = 440, dur = 0.08, type: OscillatorType = "sine", gain = 0.02) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
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

  function stopWhackMusic() {
    if (musicTimerRef.current) window.clearInterval(musicTimerRef.current);
    musicTimerRef.current = null;
  }

  function startWhackMusic() {
    if (!musicEnabled || musicTimerRef.current) return;
    const melody = [523, 659, 784, 659, 587, 698, 880, 698];
    const playBeat = () => {
      const step = musicStepRef.current % melody.length;
      playTone(melody[step], 0.12, "triangle", 0.012);
      if (step % 4 === 0) playTone(131, 0.08, "sine", 0.018);
      musicStepRef.current += 1;
    };
    playBeat();
    musicTimerRef.current = window.setInterval(playBeat, 260) as unknown as number;
  }

  function shuffledCards(sourceCards: Card[]) {
    return [...sourceCards].sort(() => Math.random() - 0.5);
  }

  function nextTarget(sourceCards: Card[]) {
    if (!sourceCards.length) return null;
    if (!targetDeckRef.current.length) targetDeckRef.current = shuffledCards(sourceCards);
    return targetDeckRef.current.pop() ?? null;
  }

  function stopRound() {
    setGameState("summary");
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }

  function startRound() {
    setRoundHits(0);
    setRoundMisses(0);
    setTimeLeft(roundSeconds);
    setGameState("playing");
    setSettingsOpen(false);

    if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = window.setInterval(() => {
      setTimeLeft((time) => {
        if (time <= 1) {
          stopRound();
          return 0;
        }
        return time - 1;
      });
    }, 1000) as unknown as number;
  }

  function prepareRound(sourceCards = cards) {
    if (sourceCards.length === 0) return;
    if (timerIntervalRef.current) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    targetDeckRef.current = [];
    setCards(sourceCards);
    setTargetCard(nextTarget(sourceCards));
    setTimeLeft(roundSeconds);
    setRoundHits(0);
    setRoundMisses(0);
    setGameState("ready");
    setSettingsOpen(false);
  }

  function setTeamCount(count: number) {
    setTeams((currentTeams) => Array.from({ length: count }, (_, index) => (
      currentTeams[index] ?? { id: `team-${index + 1}`, name: `Team ${index + 1}`, score: 0 }
    )));
    setActiveTeamIndex((index) => Math.min(index, count - 1));
  }

  function advanceTeam() {
    if (activeTeamIndex >= teams.length - 1) return;
    setActiveTeamIndex((index) => index + 1);
    prepareRound();
  }

  function keepPlaying() {
    setActiveTeamIndex(0);
    prepareRound();
  }

  function restartGame() {
    setTeams((currentTeams) => currentTeams.map((team) => ({ ...team, score: 0 })));
    setActiveTeamIndex(0);
    prepareRound();
  }

  function vibrate(pattern: number | number[]) {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  }

  // load vocabulary from localStorage (Classendo lesson tray) or fallback sample
  useEffect(() => {
    try {
      const raw = readGameTrayRaw();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          const normalized: Card[] = parsed.map((c: Record<string, unknown>, i: number) => {
            const sourceImage = typeof c.image === "string" ? c.image : null;
            return {
              id: String(c.id ?? c.word ?? `c-${i}`),
              word: String(c.word ?? c.text ?? c.label ?? ""),
              // The enlarged, high-DPI board can display artwork near 240 CSS
              // pixels wide, so use the largest static WebP derivative.
              image: sourceImage ? resolveLessonImageUrl(sourceImage, 1024) : null,
              imageFallback: sourceImage ? resolveLessonImageUrl(sourceImage) : null,
            };
          });
          queueMicrotask(() => {
            setCards(normalized);
            targetDeckRef.current = [];
            setTargetCard(nextTarget(normalized));
            setGameState("ready");
          });
          return;
        }
      }
    } catch {
      // ignore parse errors
    }
    // fallback sample set (small)
    const fallbackCards: Card[] = [
      { id: "apple", word: "apple", image: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=600&q=60" },
      { id: "ball", word: "ball", image: "https://images.unsplash.com/photo-1533134486753-c1e2b9b4d3d2?w=600&q=60" },
      { id: "cat", word: "cat", image: "https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=600&q=60" },
      { id: "dog", word: "dog", image: "https://images.unsplash.com/photo-1507149833265-60c372daea22?w=600&q=60" },
      { id: "fish", word: "fish", image: "https://images.unsplash.com/photo-1503602642458-232111445657?w=600&q=60" },
    ];
    queueMicrotask(() => {
      setCards(fallbackCards);
      targetDeckRef.current = [];
      setTargetCard(nextTarget(fallbackCards));
      setGameState("ready");
    });
  // The vocabulary tray is intentionally read once when this game page mounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
      stopWhackMusic();
    };
  }, []);

  useEffect(() => {
    if (gameState !== "playing" || !musicEnabled) {
      stopWhackMusic();
      return;
    }

    // Browsers require a student/teacher gesture before audio may play.
    const unlockMusic = () => startWhackMusic();
    window.addEventListener("pointerdown", unlockMusic, { once: true });
    return () => window.removeEventListener("pointerdown", unlockMusic);
  // Music is deliberately unlocked by the next student/teacher pointer gesture.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, musicEnabled]);

  useEffect(() => {
    sceneApiRef.current?.sync({
      cards,
      targetCard,
      mode: gameState === "playing" ? "playing" : "idle",
      useImages,
      difficulty,
      reducedMotion,
      teacherMarkedCorrect: false,
    });
  }, [cards, targetCard, gameState, useImages, difficulty, reducedMotion]);

  function handleSceneEvent(event: WhackSceneEvent) {
    if (event.type !== "hit" || gameState !== "playing") return;
    if (event.isTarget) {
      setTeams((currentTeams) => currentTeams.map((team, index) => (
        index === activeTeamIndex ? { ...team, score: team.score + 1 } : team
      )));
      setRoundHits((h) => h + 1);
      vibrate([18, 28, 46]);
      playTone(900, 0.08, "sine", 0.03);
      const followingTarget = nextTarget(cards);
      if (followingTarget) setTargetCard(followingTarget);
      return;
    }

    setRoundMisses((m) => m + 1);
    vibrate([55, 35, 55]);
    playTone(300, 0.12, "sine", 0.02);
  }

  // UI components & markup
  return (
    <div className={`${isFullscreen ? "game-whack-fullscreen game-fullscreen-shell px-3 pt-[64px]" : "min-h-screen p-6"} bg-gradient-to-b from-[#F6F9FF] to-[#EAF7FF] text-[#0B2545]`}>
      <div className={`${isFullscreen ? "mx-auto flex min-h-0 w-full max-w-none flex-1 flex-col" : "max-w-6xl mx-auto"}`}>
        <GameHeader
          title="Whack-a-Word"
          onExit={() => router.push("/games")}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          settingsOpen={settingsOpen}
          onToggleSettings={() => setSettingsOpen((open) => !open)}
        />

        {gameState === "playing" && settingsOpen && <div className="fixed right-4 top-[72px] z-[70]" aria-label="Game settings">
          <GameSettingsDropdown className="w-[340px]">
          <div className="grid gap-4">
            <div className="grid gap-2 text-sm font-semibold text-slate-700">
              <span>Teams</span>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map((count) => <button key={count} className={`rounded-lg px-2 py-2 font-bold ${teams.length === count ? "bg-[#79a961] text-white" : "bg-[#edf6e7] text-[#45663a]"}`} onClick={() => setTeamCount(count)}>{count} teams</button>)}
              </div>
            </div>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Difficulty
              <select className="rounded-lg border border-slate-200 bg-white px-3 py-2" value={difficulty} onChange={(e) => setDifficulty(e.target.value as WhackDifficulty)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Round timer
              <select className="rounded-lg border border-slate-200 bg-white px-3 py-2" value={roundSeconds} onChange={(e) => {
                const seconds = Number(e.target.value);
                setRoundSeconds(seconds);
                setTimeLeft(seconds);
              }}>
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds</option>
                <option value={90}>90 seconds</option>
                <option value={120}>2 minutes</option>
              </select>
            </label>
            <div className="grid gap-2 text-sm font-semibold text-slate-700">
              <span>Mode</span>
              <div className="flex rounded-lg bg-[#edf6e7] p-1">
                <button className={`rounded-md px-3 py-1.5 ${useImages ? "bg-white shadow-sm" : ""}`} onClick={() => setUseImages(true)}>Images</button>
                <button className={`rounded-md px-3 py-1.5 ${!useImages ? "bg-white shadow-sm" : ""}`} onClick={() => setUseImages(false)}>Words</button>
              </div>
            </div>
            <label className="inline-flex items-center gap-2 pb-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={musicEnabled} onChange={(e) => setMusicEnabled(e.target.checked)} />
              Music
            </label>
            <label className="inline-flex items-center gap-2 pb-2 text-sm font-semibold text-slate-700">
              <input type="checkbox" checked={reducedMotion} onChange={(e) => setReducedMotion(e.target.checked)} />
              Reduce motion
            </label>
            <div className="flex justify-end gap-2">
              <button className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600" onClick={() => setSettingsOpen(false)}>Close</button>
              <button className="rounded-lg bg-[#8cbf73] px-4 py-2 text-sm font-bold text-white shadow-sm" onClick={() => prepareRound()}>New round</button>
            </div>
          </div>
          </GameSettingsDropdown>
        </div>}

        <div className={`${isFullscreen ? "mb-2 pt-1" : "mb-3 pt-20"} relative mb-3 h-[122px] md:h-[104px]`}>
          <div className="hidden h-full grid-cols-[minmax(220px,1fr)_minmax(360px,2fr)_112px] gap-3 md:grid">
            <div className="motion-safe:animate-pulse flex min-w-0 items-center gap-3 rounded-2xl bg-[#FFF4E6] px-3 py-2 shadow-sm ring-1 ring-[#f6d9b8]">
              {targetCard?.image && <ResponsiveStorageImage
                src={targetCard.imageFallback ?? targetCard.image}
                alt={targetCard.word}
                className="h-16 w-16 shrink-0 object-contain md:h-20 md:w-20"
                sizes="80px"
                widths={[160, 480]}
                loading="eager"
              />}
              <div className="min-w-0"><div className="text-xs font-bold tracking-[0.18em] text-[#9a5c24]">FIND</div><div className="truncate text-xl font-black uppercase tracking-wide md:text-3xl">{targetCard?.word || "…"}</div></div>
            </div>
            <div className="grid h-full gap-2" style={{ gridTemplateColumns: `repeat(${teams.length}, minmax(0, 1fr))` }} aria-label="Team scores">
              {teams.map((team, index) => <div key={team.id} className={`flex min-w-0 flex-col justify-center rounded-2xl px-3 shadow-sm ring-1 ${index === activeTeamIndex ? "bg-[#edf6e7] text-[#45663a] ring-[#b6cfa8]" : "bg-white/90 text-slate-600 ring-black/5"}`}>
                <div className="truncate text-xs font-black uppercase tracking-wide">{team.name}</div><div className="mt-1 text-3xl font-black leading-none">{team.score}</div>
              </div>)}
            </div>
            <div className="flex h-full flex-col items-center justify-center rounded-2xl bg-[#0B2545] px-2 text-white shadow-sm ring-1 ring-[#0B2545]">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-white/70">Time</div><div className="mt-1 text-3xl font-black leading-none tabular-nums">{timeLeft}s</div>
            </div>
          </div>

          <div className="md:hidden">
            <div className="motion-safe:animate-pulse absolute left-0 top-0 flex max-w-[calc(100%-84px)] min-w-0 items-center gap-3 rounded-2xl bg-[#FFF4E6] px-3 py-2 shadow-sm ring-1 ring-[#f6d9b8]">
              {targetCard?.image && <ResponsiveStorageImage src={targetCard.imageFallback ?? targetCard.image} alt={targetCard.word} className="h-16 w-16 shrink-0 object-contain" sizes="64px" widths={[160, 480]} loading="eager" />}
              <div className="min-w-0"><div className="text-xs font-bold tracking-[0.18em] text-[#9a5c24]">FIND</div><div className="truncate text-xl font-black uppercase">{targetCard?.word || "…"}</div></div>
            </div>
            <div className="absolute right-0 top-0 flex h-[76px] w-[76px] flex-col items-center justify-center rounded-2xl bg-[#0B2545] text-white shadow-sm"><div className="text-[10px] font-black uppercase tracking-wide text-white/70">Time</div><div className="text-2xl font-black tabular-nums">{timeLeft}s</div></div>
            <div className="absolute bottom-0 left-0 right-0 grid gap-1" style={{ gridTemplateColumns: `repeat(${teams.length}, minmax(0, 1fr))` }} aria-label="Team scores">
              {teams.map((team, index) => <div key={team.id} className={`truncate rounded px-2 py-1 text-xs font-bold ${index === activeTeamIndex ? "bg-[#edf6e7] text-[#45663a]" : "bg-white/90 text-slate-600"}`}>{team.name} <span className="float-right font-black">{team.score}</span></div>)}
            </div>
          </div>
        </div>

        <div data-game-stage className={`rounded-3xl bg-white/80 shadow-xl ring-1 ring-white ${isFullscreen ? "flex min-h-0 flex-1 p-2" : "p-3 md:p-5"}`}>
          <div
            className={`rounded-2xl overflow-hidden border border-[#d7e7d0] bg-[#eaf5df] ${isFullscreen ? "h-full min-h-0 flex-1" : "h-[440px] md:h-[560px]"}`}
          >
            <PhaserGameHost
              className="w-full h-full"
              style={{ cursor: gameState === "playing" ? MALLET_CURSOR : "auto" }}
              createGame={createWhackWordGame}
              onEvent={handleSceneEvent}
              onApiReady={(api) => {
                sceneApiRef.current = api as WhackSceneApi | null;
              }}
            />
          </div>
        </div>

      </div>

      {gameState === "ready" && targetCard && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0b2545]/45 p-4 backdrop-blur-sm">
        <section className="w-full max-w-lg rounded-3xl border border-white/70 bg-[#fffdf8] p-6 text-center shadow-2xl" role="dialog" aria-modal="true" aria-label="Start Whack-a-Word round">
          <div className="text-sm font-black tracking-[0.2em] text-[#8a623d]">{activeTeam?.name.toUpperCase() ?? "TEAM 1"} ROUND</div>
          <h2 className="mt-2 text-3xl font-black text-[#0B2545]">Ready to play?</h2>
          <p className="mt-2 text-slate-600">Find each picture before time runs out.</p>

          <div className="mx-auto mt-4 flex max-w-full flex-wrap justify-center gap-2" aria-label="Team scores">
            {teams.map((team, index) => <div key={team.id} className={`rounded-full px-3 py-1 text-xs font-bold ${index === activeTeamIndex ? "bg-[#79a961] text-white" : "bg-[#edf6e7] text-[#45663a]"}`}>
              {team.name}: {team.score}
            </div>)}
          </div>

          <div className="mx-auto mt-4 flex w-fit items-center gap-4 rounded-2xl bg-[#fff4e6] px-5 py-3 ring-1 ring-[#f6d9b8]">
            {targetCard.image && <ResponsiveStorageImage
              src={targetCard.imageFallback ?? targetCard.image}
              alt={targetCard.word}
              className="h-24 w-24 object-contain"
              sizes="96px"
              widths={[160, 480]}
              loading="eager"
            />}
            <div className="text-left">
              <div className="text-xs font-bold tracking-[0.18em] text-[#9a5c24]">FIRST FIND</div>
              <div className="text-2xl font-black uppercase text-[#0B2545]">{targetCard.word}</div>
            </div>
          </div>

          {settingsOpen && <div className="mt-5 grid gap-3 rounded-2xl bg-[#edf6e7] p-4 text-left sm:grid-cols-2">
            <div className="grid gap-1 text-sm font-bold text-slate-700 sm:col-span-2">
              <span>Teams</span>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map((count) => <button key={count} className={`rounded-lg px-3 py-2 ${teams.length === count ? "bg-[#79a961] text-white" : "bg-white text-[#45663a]"}`} onClick={() => setTeamCount(count)}>{count} teams</button>)}
              </div>
            </div>
            <label className="grid gap-1 text-sm font-bold text-slate-700">
              Difficulty
              <select className="rounded-lg border border-slate-200 bg-white px-3 py-2" value={difficulty} onChange={(e) => setDifficulty(e.target.value as WhackDifficulty)}>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-slate-700">
              Round timer
              <select className="rounded-lg border border-slate-200 bg-white px-3 py-2" value={roundSeconds} onChange={(e) => {
                const seconds = Number(e.target.value);
                setRoundSeconds(seconds);
                setTimeLeft(seconds);
              }}>
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds</option>
                <option value={90}>90 seconds</option>
                <option value={120}>2 minutes</option>
              </select>
            </label>
            <div className="grid gap-1 text-sm font-bold text-slate-700">
              <span>Mode</span>
              <div className="flex rounded-lg bg-white/70 p-1">
                <button className={`rounded-md px-3 py-1.5 ${useImages ? "bg-white shadow-sm" : ""}`} onClick={() => setUseImages(true)}>Images</button>
                <button className={`rounded-md px-3 py-1.5 ${!useImages ? "bg-white shadow-sm" : ""}`} onClick={() => setUseImages(false)}>Words</button>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-4 pb-1 text-sm font-bold text-slate-700">
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={musicEnabled} onChange={(e) => setMusicEnabled(e.target.checked)} />Music</label>
              <label className="inline-flex items-center gap-2"><input type="checkbox" checked={reducedMotion} onChange={(e) => setReducedMotion(e.target.checked)} />Reduce motion</label>
            </div>
          </div>}

          <div className="mt-6 flex justify-center gap-3">
            <button className="rounded-xl border border-[#b6cfa8] bg-white px-4 py-3 font-bold text-[#45663a]" onClick={() => setSettingsOpen((open) => !open)}>
              {settingsOpen ? "Hide settings" : "Settings"}
            </button>
            <button className="rounded-xl bg-[#79a961] px-6 py-3 text-lg font-black text-white shadow-[0_8px_0_#5a833f] transition hover:-translate-y-0.5" onClick={() => { startRound(); startWhackMusic(); }}>
              Start game
            </button>
          </div>
        </section>
      </div>}

      {gameState === "summary" && activeTeam && <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#0b2545]/45 p-4 backdrop-blur-sm">
        <section className="w-full max-w-md rounded-3xl border border-white/70 bg-[#fffdf8] p-6 text-center shadow-2xl" role="dialog" aria-modal="true" aria-label="Team round results">
          {activeTeamIndex < teams.length - 1 ? <>
            <div className="text-sm font-black tracking-[0.2em] text-[#8a623d]">{activeTeam.name.toUpperCase()} COMPLETE</div>
            <h2 className="mt-2 text-3xl font-black text-[#0B2545]">Score: {activeTeam.score}</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-[#edf6e7] p-3"><div className="text-xs font-bold uppercase text-[#45663a]">Hits</div><div className="text-3xl font-black text-[#0B2545]">{roundHits}</div></div>
              <div className="rounded-2xl bg-[#fff0ef] p-3"><div className="text-xs font-bold uppercase text-[#b24b43]">Misses</div><div className="text-3xl font-black text-[#0B2545]">{roundMisses}</div></div>
            </div>
            <p className="mt-5 text-slate-600">Pass the screen to {teams[activeTeamIndex + 1]?.name}.</p>
            <button className="mt-5 w-full rounded-xl bg-[#79a961] px-6 py-3 text-lg font-black text-white shadow-[0_8px_0_#5a833f]" onClick={advanceTeam}>Next team ready</button>
          </> : <>
            <div className="text-sm font-black tracking-[0.2em] text-[#8a623d]">ROUND COMPLETE</div>
            <h2 className="mt-2 text-3xl font-black text-[#0B2545]">Final scores</h2>
            <div className="mt-5 space-y-2 text-left" aria-label="Final team rankings">
              {rankedTeams.map((team, index) => <div key={team.id} className={`flex items-center justify-between rounded-2xl font-black ${index === 0 ? "bg-[#fff4bf] px-5 py-4 text-2xl text-[#76530a] shadow-sm ring-1 ring-[#f1ca4f]" : index === 1 ? "bg-[#edf6e7] px-4 py-3 text-xl text-[#45663a]" : index === 2 ? "bg-[#eef4fb] px-3 py-2.5 text-lg text-[#45627f]" : "bg-slate-100 px-3 py-2 text-base text-slate-600"}`}>
                <span className="min-w-0 truncate"><span className="mr-2 opacity-70">{index + 1}.</span>{team.name}</span>
                <span className="ml-4 shrink-0">{team.score}</span>
              </div>)}
            </div>
            <p className="mt-5 text-slate-600">Every team has played. Keep scores and begin another turn, or reset the match.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button className="rounded-xl bg-[#79a961] px-4 py-3 font-black text-white shadow-[0_6px_0_#5a833f]" onClick={keepPlaying}>Keep playing</button>
              <button className="rounded-xl border border-[#b6cfa8] bg-white px-4 py-3 font-black text-[#45663a]" onClick={restartGame}>Restart game</button>
            </div>
          </>}
          <button className="mt-4 text-sm font-bold text-slate-500 underline" onClick={() => router.push("/games")}>Exit game</button>
        </section>
      </div>}

    </div>
  );
}
