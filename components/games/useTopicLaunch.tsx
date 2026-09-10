"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { readLessonTray, writeLessonTray, setEditingLessonSetId } from "@/lib/lessons/tray";
import { gameUrl, type GameTopic } from "@/lib/games/topics";
import { GAME_SOURCE_KEY } from "@/lib/games/session";
import { trackFreeGameEvent } from "@/lib/games/free-analytics";
import { GameFlowDialog } from "./GameFlowDialog";
export function useTopicLaunch(gameId: string) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState<GameTopic | null>(null);
  function start(topic: GameTopic) {
    void trackFreeGameEvent({ eventType: "topic_selected", gameKey: gameId, topicId: topic.id, topicLabel: topic.title, topicCategory: topic.category, source: "public_topic" });
    if (user) { writeLessonTray(topic.cards); setEditingLessonSetId(null); }
    try { sessionStorage.setItem(GAME_SOURCE_KEY, "topics"); } catch {}
    setPending(null);
    router.push(gameUrl(gameId, topic.id));
  }
  function launch(topic: GameTopic) {
    if (loading) return;
    const tray = user ? readLessonTray() : [];
    const sameCards = tray.length === topic.cards.length && tray.every((card) => topic.cards.some((item) => item.id === card.id && item.image === card.image));
    if (tray.length && !sameCards) setPending(topic);
    else start(topic);
  }
  return { launch, loading, confirmation: pending ? <GameFlowDialog title="Replace your lesson tray?" onClose={() => setPending(null)}>
    <p className="leading-7 text-[#65705f]">Load {pending.cards.length} cards from <strong>{pending.title}</strong> into your lesson tray? They will also be ready in Classroom Mode and your other lesson tools. Any saved lesson stays unchanged.</p>
    <div className="mt-6 flex justify-end gap-3"><button className="btn btn-secondary" onClick={() => setPending(null)}>Cancel</button><button className="btn btn-primary" onClick={() => start(pending)}>Replace tray & start</button></div>
  </GameFlowDialog> : null };
}
