"use client";
import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useGameFlow } from "./GameFlowContext";
import { GameFlowDialog } from "./GameFlowDialog";
import { customGameUrl, topicsUrl } from "@/lib/games/topics";
import { freeGamesSignupUrl, trackFreeGameEvent } from "@/lib/games/free-analytics";

type GameWinnerModalProps = {
  title: string; message: string; onClose: () => void; onPlayAgain: () => void;
  onReturnToGames: () => void; children?: ReactNode; scoreTeams?: { name: string; score: number }[];
};
/** Dismissal leaves the finished board available; replay is always explicit. */
export function GameWinnerModal({ title, message, onClose, onPlayAgain, onReturnToGames, children, scoreTeams }: GameWinnerModalProps) {
  const flow = useGameFlow();
  const { user } = useAuth();
  const best = scoreTeams?.length ? Math.max(...scoreTeams.map((team) => team.score)) : null;
  const leaders = scoreTeams?.filter((team) => team.score === best) ?? [];
  const tied = leaders.length > 1;
  const custom = flow ? customGameUrl(flow.gameId, flow.topic?.id) : "";
  useEffect(() => {
    if (flow?.topic) void trackFreeGameEvent({ eventType: "game_completed", gameKey: flow.gameId, topicId: flow.topic.id, topicLabel: flow.topic.title, topicCategory: flow.topic.category, source: "public_topic" });
  }, [flow]);
  const finishAction = (action: "play_again" | "change_topic" | "change_game" | "use_own_vocabulary") => {
    if (flow?.topic) void trackFreeGameEvent({ eventType: "finish_action", gameKey: flow.gameId, topicId: flow.topic.id, topicLabel: flow.topic.title, topicCategory: flow.topic.category, source: "public_topic", action });
  };
  return <GameFlowDialog title={tied ? "It’s a tie!" : title} onClose={onClose}>
    <div className="text-center"><Trophy size={42} className="mx-auto mb-4 text-[#73965e]" />
      <p className="text-base leading-6 text-[#65705f]">{tied ? `${leaders.map((team) => team.name).join(" and ")} finished with ${best} points.` : message}</p>
      {children && <div className="mt-5">{children}</div>}
      <div className="mt-7 flex flex-wrap justify-center gap-3"><button onClick={() => { finishAction("play_again"); onPlayAgain(); }} className="btn btn-primary px-5 py-3 text-sm">Play Again</button>
        {flow ? <><Link onClick={() => finishAction("change_topic")} className="btn btn-secondary px-5 py-3 text-sm" href={topicsUrl(flow.gameId, flow.topic?.id)}>Change Topic</Link><Link onClick={() => finishAction("change_game")} className="btn btn-secondary px-5 py-3 text-sm" href={`/games?source=${flow.topic ? "topics" : "tray"}${flow.topic ? `&topic=${flow.topic.id}` : ""}`}>Change Game</Link></> : <button onClick={onReturnToGames} className="btn btn-secondary px-5 py-3 text-sm">Return to Games</button>}
      </div>
      {flow && <div className="mt-6 border-t border-[#e3e9dd] pt-5"><p className="mb-3 text-sm text-[#718267]">Want to teach your own words?</p><Link onClick={() => finishAction("use_own_vocabulary")} className="font-semibold text-[#587d45] underline underline-offset-4" href={user ? custom : freeGamesSignupUrl(custom, { gameKey: flow.gameId, topicId: flow.topic?.id })}>Use Your Own Vocabulary</Link></div>}
    </div>
  </GameFlowDialog>;
}
