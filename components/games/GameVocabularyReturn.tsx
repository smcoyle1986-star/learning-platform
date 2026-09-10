"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GAME_NAMES, gameUrl } from "@/lib/games/topics";
export default function GameVocabularyReturn() { return <Suspense><VocabularyReturn /></Suspense>; }
function VocabularyReturn() {
  const params = useSearchParams();
  const id = params.get("gameReturn");
  const game = id && Object.hasOwn(GAME_NAMES, id) ? id : null;
  if (!game) return null;
  return <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-4"><p className="text-sm font-semibold">Add your vocabulary to the lesson tray, then return to {GAME_NAMES[game]}.</p><Link href={gameUrl(game)} className="btn btn-primary">Open {GAME_NAMES[game]}</Link></div>;
}
