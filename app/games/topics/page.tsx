"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Eye, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { GAME_NAMES, GAME_TOPICS, TOPIC_FILTERS, TOPICS_PAGE_SIZE, type GameTopic } from "@/lib/games/topics";
import { GameFlowDialog } from "@/components/games/GameFlowDialog";
import { useTopicLaunch } from "@/components/games/useTopicLaunch";
import { trackFreeGameEvent } from "@/lib/games/free-analytics";

export default function GameTopicsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const requestedGame = params.get("game") ?? "";
  const gameId = Object.hasOwn(GAME_NAMES, requestedGame) ? requestedGame : "";
  const selected = params.get("topic");
  const filter = TOPIC_FILTERS.find((item) => item.id === params.get("filter"))?.id ?? "all";
  const topics = GAME_TOPICS.filter((topic) => filter === "all" || topic.category === filter);
  const pages = Math.ceil(topics.length / TOPICS_PAGE_SIZE);
  const page = Math.min(pages, Math.max(1, Math.floor(Number(params.get("page"))) || 1));
  const [preview, setPreview] = useState<GameTopic | null>(null);
  const { launch, loading, confirmation } = useTopicLaunch(gameId);
  useEffect(() => { if (gameId) void trackFreeGameEvent({ eventType: "game_selected", gameKey: gameId, source: "public_topic" }); }, [gameId]);
  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString()); next.set(key, value);
    if (key === "filter") next.delete("page");
    router.replace(`/games/topics?${next}`, { scroll: false });
  }
  if (!GAME_NAMES[gameId]) return <main className="mx-auto max-w-7xl px-6 py-16"><h1 className="text-3xl font-bold">Pick a game first</h1><Link href="/games" className="btn btn-primary mt-6">Choose a game</Link></main>;
  return <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10">
    <Link href={`/games?source=topics${selected ? `&topic=${selected}` : ""}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[#617857]"><ArrowLeft size={16} /> Change game</Link>
    <div className="mt-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#718267]">Game ✓ <span className="px-2">/</span> Topic <span className="px-2">/</span> Play</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Choose a topic for {GAME_NAMES[gameId]}</h1>
      <p className="mt-2 text-sm text-[#65705f]">Ready-made vocabulary. Every topic is free to play.</p></div>
      <span className="rounded-full border border-[#dce5d8] bg-white px-4 py-2 text-sm font-semibold">{topics.length} topics</span></div>
    {(gameId === "yes-or-no" || gameId === "choose-your-side") && <p className="mt-4 rounded-xl border border-[#e8dfc6] bg-[#fffaf0] px-4 py-3 text-sm text-[#78653f]">Teacher setup: write your sentences and choose the answers before playing.</p>}
    <div className="my-6 flex flex-wrap gap-2" role="group" aria-label="Filter topics by category">{TOPIC_FILTERS.map((item) => <button key={item.id} aria-pressed={filter === item.id} onClick={() => update("filter", item.id)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${filter === item.id ? "border-[#73965e] bg-[#73965e] text-white" : "border-[#dce5d8] bg-white text-[#52634a] hover:bg-[#eef4e9]"}`}>{item.label}</button>)}</div>
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Vocabulary topics">
      {topics.slice((page - 1) * TOPICS_PAGE_SIZE, page * TOPICS_PAGE_SIZE).map((topic) => <article key={topic.id} className={`flex flex-col rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md ${selected === topic.id ? "border-[#73965e] ring-2 ring-[#dcebd4]" : "border-[#dce5d8]"}`}>
          <button onClick={() => { void trackFreeGameEvent({ eventType: "topic_previewed", gameKey: gameId, topicId: topic.id, topicLabel: topic.title, topicCategory: topic.category, source: "public_topic" }); setPreview(topic); }} aria-label={`Preview ${topic.title}`} className="group relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border border-[#edf0e9] bg-white">
          <img src={topic.cards[0].image ?? ""} alt={topic.cards[0].word} className="h-full w-full object-contain p-3 transition-transform group-hover:scale-105" />
          <span className="absolute bottom-2 right-2 rounded-full bg-white/95 p-2 text-[#617857] shadow-sm"><Eye size={16} /></span>
        </button>
        <div className="py-3"><h2 className="text-base font-bold">{topic.title}</h2><p className="mt-1 text-xs text-[#718267]">{TOPIC_FILTERS.find((item) => item.id === topic.category)?.label} · {topic.cards.length} cards{selected === topic.id ? " · Current topic" : ""}</p></div>
        <div className="mt-auto flex gap-2"><button className="btn btn-secondary px-3 py-2.5 text-xs" onClick={() => { void trackFreeGameEvent({ eventType: "topic_previewed", gameKey: gameId, topicId: topic.id, topicLabel: topic.title, topicCategory: topic.category, source: "public_topic" }); setPreview(topic); }} aria-label={`Preview cards in ${topic.title}`}>Preview</button><button disabled={loading} className="btn btn-primary flex-1 gap-1 px-3 py-2.5 text-xs" onClick={() => launch(topic)} aria-label={`Start game with ${topic.title}`}><Play size={13} /> Start Game</button></div>
      </article>)}
    </div>
    <nav aria-label="Topic pages" className="mt-7 flex items-center justify-center gap-2"><button className="btn btn-secondary p-2.5" disabled={page === 1} aria-label="Previous page" onClick={() => update("page", String(page - 1))}><ChevronLeft size={18} /></button>
      {Array.from({ length: pages }, (_, i) => i + 1).map((number) => <button key={number} aria-label={`Page ${number}`} aria-current={number === page ? "page" : undefined} onClick={() => update("page", String(number))} className={`btn h-10 w-10 ${number === page ? "btn-primary" : "btn-secondary"}`}>{number}</button>)}
      <button className="btn btn-secondary p-2.5" disabled={page === pages} aria-label="Next page" onClick={() => update("page", String(page + 1))}><ChevronRight size={18} /></button></nav>
    <p className="mt-3 text-center text-xs text-[#718267]" aria-live="polite">Page {page} of {pages} · Showing {(page - 1) * TOPICS_PAGE_SIZE + 1}–{Math.min(page * TOPICS_PAGE_SIZE, topics.length)} of {topics.length}</p>
    {preview && <GameFlowDialog title={preview.title} onClose={() => setPreview(null)}><p className="mb-4 text-sm text-[#718267]">{preview.cards.length} cards · Previewing does not change your lesson tray.</p><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{preview.cards.map((card) => <div key={card.id} className="rounded-xl border border-[#e2e8dc] p-2 text-center"><img src={card.image ?? ""} alt={card.word} className="aspect-square w-full object-contain" /><p className="mt-2 text-sm font-semibold">{card.word}</p></div>)}</div><div className="mt-6 flex justify-end"><button className="btn btn-primary" disabled={loading} onClick={() => { setPreview(null); launch(preview); }}>Start Game</button></div></GameFlowDialog>}
    {confirmation}
  </main>;
}
