"use client";
import Link from "next/link";
import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";
import { GAME_NAMES, getGameTopic, topicsUrl, customGameUrl } from "@/lib/games/topics";
import { GameFlowContext } from "./GameFlowContext";
import { trackFreeGameEvent } from "@/lib/games/free-analytics";
import { hasAnalyticsConsent } from "@/lib/privacy/consent";
import { getAnalyticsSessionKey } from "@/lib/analytics/client";

function FreeGameStartTracker({ gameId, topicId, topicLabel, topicCategory }: { gameId: string; topicId: string; topicLabel: string; topicCategory: string }) {
  useEffect(() => {
    void trackFreeGameEvent({ eventType: "game_started", gameKey: gameId, topicId, topicLabel, topicCategory, source: "public_topic" });
  }, [gameId, topicCategory, topicId, topicLabel]);
  return null;
}

function MeaningfulInteractionTracker({ gameId, topicId, topicLabel, topicCategory }: { gameId: string; topicId?: string; topicLabel?: string; topicCategory?: string }) {
  useEffect(() => {
    const sessionKey = getAnalyticsSessionKey();
    const contextKey = `classendo-free-game-actions:${sessionKey}:${gameId}:${topicId ?? "tray"}`;
    const ignored = /^(help|how to play|settings|pause|resume|exit|close|back|change game|change topic|fullscreen|sound|mute|restart|play again|start|start game|start round|begin|finish|done)(\b|$)/i;
    const onClick = (event: MouseEvent) => {
      if (!hasAnalyticsConsent()) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const action = target.closest("button, canvas");
      if (!action || !action.closest("main") || action.closest("[role=dialog]")) return;
      if (action.matches("button")) {
        const label = (action.getAttribute("aria-label") || action.textContent || "").trim().replace(/\s+/g, " ");
        if (!label || ignored.test(label)) return;
      }
      try {
        const count = Number(window.sessionStorage.getItem(contextKey) ?? "0") + 1;
        window.sessionStorage.setItem(contextKey, String(count));
        if (count === 3) {
          void trackFreeGameEvent({ eventType: "meaningful_interaction", gameKey: gameId, topicId, topicLabel, topicCategory, source: "public_topic" });
        }
      } catch {
        // Analytics storage is optional; do not interrupt gameplay.
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
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
  if (topic) return <GameFlowContext.Provider key={`${gameId}:${topic.id}`} value={{ gameId, topic }}><FreeGameStartTracker gameId={gameId} topicId={topic.id} topicLabel={topic.title} topicCategory={topic.category} /><MeaningfulInteractionTracker gameId={gameId} topicId={topic.id} topicLabel={topic.title} topicCategory={topic.category} />{children}</GameFlowContext.Provider>;
  if (loading) return <div className="min-h-[50vh]" />;
  if (!user) return <AccessMessage title="Choose a free topic to play" gameId={gameId} />;
  if (!access || access.userId !== user.id) return <AccessMessage title="Checking your game access" gameId={gameId} />;
  if (!canAccessGame(gameId)) return <AccessMessage title="Play free with a ready-made topic" gameId={gameId} custom />;
  return <GameFlowContext.Provider key={`${gameId}:tray`} value={{ gameId }}><MeaningfulInteractionTracker gameId={gameId} />{children}</GameFlowContext.Provider>;
}
function AccessMessage({ title, gameId, custom = false }: { title: string; gameId: string; custom?: boolean }) {
  return <main className="mx-auto max-w-xl px-6 py-20 text-center"><h1 className="text-3xl font-bold">{title}</h1>
    <p className="mt-4 text-[var(--color-text-muted)]">Every game is free with ready-made topics. Use your own vocabulary in the weekly featured game with a free account, or in every game with Premium.</p>
    <div className="mt-7 flex flex-wrap justify-center gap-3"><Link className="btn btn-primary" href={topicsUrl(gameId)}>Choose topic</Link>
      {custom && <Link onClick={() => void trackFreeGameEvent({ eventType: "use_own_vocabulary_clicked", gameKey: gameId, source: "free_games", action: "use_own_vocabulary" })} className="btn btn-secondary" href={customGameUrl(gameId)}>Use my vocabulary</Link>}
      <Link className="btn btn-secondary" href="/games">Change game</Link></div></main>;
}
