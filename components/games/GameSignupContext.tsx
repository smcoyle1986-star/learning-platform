"use client";
import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { GAME_NAMES } from "@/lib/games/topics";
export default function GameSignupContext() { return <Suspense><SignupContext /></Suspense>; }
function SignupContext() {
  const params = useSearchParams();
  const next = params.get("next");
  const id = next?.startsWith("/games/custom?") ? new URLSearchParams(next.split("?")[1]).get("game") : null;
  const game = id && Object.hasOwn(GAME_NAMES, id) ? id : null;
  if (!game) return null;
  return <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6"><div className="rounded-2xl border border-[#dce5d8] bg-[#edf4e9] px-5 py-4"><p className="font-bold">Use your own vocabulary in {GAME_NAMES[game]}</p><p className="mt-1 text-sm text-[#65705f]">Start with a free account. Confirm your email to unlock two weeks of Premium. We’ll keep your game selection.</p><Link href="/games?source=topics" className="mt-2 inline-block text-sm font-semibold text-[#617857]">Back to free games</Link></div></div>;
}
