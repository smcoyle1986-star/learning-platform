"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";
import { GAME_NAMES, customGameUrl, getGameTopic, topicsUrl } from "@/lib/games/topics";
import { GAME_SOURCE_KEY } from "@/lib/games/session";
import { freeGamesSignupUrl } from "@/lib/games/free-analytics";
export default function CustomGamePage() {
  const params = useSearchParams();
  const game = Object.hasOwn(GAME_NAMES, params.get("game") ?? "") ? params.get("game")! : "image-reveal";
  const topic = getGameTopic(params.get("topic"));
  const { user, loading } = useAuth();
  const { access, canAccessGame } = useBillingAccess();
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  useEffect(() => {
    if (!user) return;
    let active = true;
    fetch("/api/auth/verification/status", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((result) => { if (active && result) setConfirmed(result.verified); }).catch(() => {});
    return () => { active = false; };
  }, [user]);
  async function sendVerification() {
    setSending(true);
    try {
      const response = await fetch("/api/auth/verification/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nextPath: returnPath }) });
      const result = await response.json();
      setNotice(response.ok ? "Verification email sent. Check your inbox to activate your trial." : result.error ?? "Please try again.");
    } catch { setNotice("Could not send the email. Please try again."); }
    finally { setSending(false); }
  }
  const usable = Boolean(user && access?.userId === user.id && canAccessGame(game));
  const returnPath = customGameUrl(game, topic?.id);
  const buildUrl = (gameId: string) => `/flashcards?gameReturn=${gameId}`;
  const prepare = () => { try { sessionStorage.setItem(GAME_SOURCE_KEY, "tray"); } catch {} };
  return <main className="mx-auto max-w-2xl px-6 py-12 sm:py-20"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#718267]">Your vocabulary · {GAME_NAMES[game]}</p><h1 className="mt-3 text-3xl font-bold">Make this game fit your lesson</h1>
    <p className="mt-4 leading-7 text-[#65705f]">Choose your own cards, then bring them into {GAME_NAMES[game]}.{topic ? ` Your ${topic.title} topic is still available.` : ""}</p>
    <section className="mt-7 rounded-2xl border border-[#dce5d8] bg-white p-6">
      {loading ? <p>Loading your account…</p> : !user ? <><p>Create a free account. Confirm your email to unlock two weeks of Premium, including custom vocabulary in every game.</p><Link className="btn btn-primary mt-5" href={freeGamesSignupUrl(returnPath, { gameKey: game, topicId: topic?.id })}>Create free account</Link></> : usable ? <><p>{access?.isPremium ? "Your Premium access includes custom vocabulary in every game." : "This week’s featured game includes your own vocabulary for free."}</p><Link onClick={prepare} className="btn btn-primary mt-5" href={buildUrl(game)}>Choose my vocabulary</Link></> : <>
        <p className="leading-7">{confirmed === false && !access?.welcomeTrial.used ? "Confirm your email to activate your two-week Premium trial and use your own words in every game." : "Premium lets you use your own vocabulary in every game and save your preparation."}</p>
        <div className="mt-5 flex flex-wrap gap-3">{confirmed === false && !access?.welcomeTrial.used ? <button disabled={sending} onClick={() => void sendVerification()} className="btn btn-primary">{sending ? "Sending…" : "Send confirmation email"}</button> : <Link href={`/upgrade?next=${encodeURIComponent(returnPath)}`} className="btn btn-primary">Get Premium</Link>}
        {access && <Link onClick={prepare} href={buildUrl(access.featuredGameId)} className="btn btn-secondary">Use my words in {GAME_NAMES[access.featuredGameId]}</Link>}</div>
      </>}
      {user && !confirmed && usable && <p className="mt-4 text-sm text-[#718267]">Confirm your email to unlock two weeks of Premium.</p>}
      {notice && <p role="status" className="mt-4 text-sm">{notice}</p>}
    </section><Link href={topicsUrl(game, topic?.id)} className="mt-6 inline-block text-sm font-semibold text-[#617857]">Back to free topics</Link>
  </main>;
}
