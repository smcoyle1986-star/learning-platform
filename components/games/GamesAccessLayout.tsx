"use client";
import Link from "next/link";
import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";
import { GAME_NAMES, getGameTopic, topicsUrl, customGameUrl } from "@/lib/games/topics";
import { GameFlowContext } from "./GameFlowContext";
import { trackFreeGameEvent } from "@/lib/games/free-analytics";

function FreeGameStartTracker({ gameId, topicId, topicLabel, topicCategory }: { gameId: string; topicId: string; topicLabel: string; topicCategory: string }) {
  useEffect(() => {
    void trackFreeGameEvent({ eventType: "game_started", gameKey: gameId, topicId, topicLabel, topicCategory, source: "public_topic" });
  }, [gameId, topicCategory, topicId, topicLabel]);
  return null;
}

export default function GamesAccessLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-[50vh]" />}><GamesAccess>{children}</GamesAccess></Suspense>;
}
function GamesAccess({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { user, loading } = useAuth();
  const { access, canAccessGame } = useBillingAccess();
  const gameId = pathname.split("/")[2] ?? "";
  const topic = getGameTopic(params.get("topic"));
  if (!gameId || ["topics", "custom"].includes(gameId)) return <>{children}</>;
  if (!GAME_NAMES[gameId]) return <AccessMessage title="Choose a game from the hub" gameId="image-reveal" />;
  if (params.has("topic") && !topic) return <AccessMessage title="Choose an available topic" gameId={gameId} />;
  if (topic) return <GameFlowContext.Provider key={`${gameId}:${topic.id}`} value={{ gameId, topic }}><FreeGameStartTracker gameId={gameId} topicId={topic.id} topicLabel={topic.title} topicCategory={topic.category} />{children}</GameFlowContext.Provider>;
  if (loading) return <div className="min-h-[50vh]" />;
  if (!user) return <AccessMessage title="Choose a free topic to play" gameId={gameId} />;
  if (!access || access.userId !== user.id) return <AccessMessage title="Checking your game access" gameId={gameId} />;
  if (!canAccessGame(gameId)) return <AccessMessage title="Play free with a ready-made topic" gameId={gameId} custom />;
  return <GameFlowContext.Provider key={`${gameId}:tray`} value={{ gameId }}>{children}</GameFlowContext.Provider>;
}
function AccessMessage({ title, gameId, custom = false }: { title: string; gameId: string; custom?: boolean }) {
  return <main className="mx-auto max-w-xl px-6 py-20 text-center"><h1 className="text-3xl font-bold">{title}</h1>
    <p className="mt-4 text-[var(--color-text-muted)]">Every game is free with ready-made topics. Use your own vocabulary in the weekly featured game with a free account, or in every game with Premium.</p>
    <div className="mt-7 flex flex-wrap justify-center gap-3"><Link className="btn btn-primary" href={topicsUrl(gameId)}>Choose topic</Link>
      {custom && <Link className="btn btn-secondary" href={customGameUrl(gameId)}>Use my vocabulary</Link>}
      <Link className="btn btn-secondary" href="/games">Change game</Link></div></main>;
}
