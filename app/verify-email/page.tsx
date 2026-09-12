"use client";

import Link from "next/link";
import { safeGameReturnPath } from "@/lib/games/return-path";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";
import { trackGoogleAdsSignup } from "@/lib/analytics/google-ads";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function VerifyEmailContent() {
  const params = useSearchParams();
  const { refresh } = useBillingAccess();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<"ready" | "working" | "verified" | "error">("ready");
  const [message, setMessage] = useState("");
  const returnPath = "/flashcards?onboarding=1&email_verified=1";
  async function verify() {
    setState("working"); setMessage("");
    const response = await fetch("/api/auth/verification/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    const result = await response.json().catch(() => null);
    if (!response.ok) { setState("error"); setMessage(String(result?.error ?? "This verification link could not be used.")); return; }
    trackGoogleAdsSignup(result?.signupConversionId);
    await refresh();
    setState("verified"); setMessage(result?.trialStarted ? "Your email is verified and your 14-day Premium trial is now active." : "Your email is verified.");
  }
  return <main className="min-h-screen bg-[#f7f6f2] px-4 py-16 text-[#2f3a2f]"><section className="mx-auto max-w-lg rounded-[2rem] border border-[#e2e6da] bg-white p-8 shadow-[0_18px_40px_rgba(54,64,46,0.10)]"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6d8160]">Classendo account</p><h1 className="mt-3 text-3xl font-semibold">Verify your email</h1><p className="mt-4 leading-7 text-[#5c665c]">Verify this email to activate your Premium welcome trial and unlock publishing, Creator uploads, and billing.</p>{state === "verified" ? <><p className="mt-6 rounded-2xl bg-[#f1f7ed] p-4 text-[#496143]">{message}</p><Link href={safeGameReturnPath(params.get("next")) ?? returnPath} className="btn btn-primary mt-6 inline-flex px-5 py-3">Return to Classendo</Link></> : <><button disabled={!token || state === "working"} onClick={() => void verify()} className="btn btn-primary mt-7 px-5 py-3 disabled:opacity-60">{state === "working" ? "Verifying…" : "Verify my email"}</button>{state === "error" && <p className="mt-5 rounded-2xl bg-[#fff1ee] p-4 text-[#a45d49]">{message}</p>}<p className="mt-6 text-sm text-[#5c665c]">Already verified or need a new email? <Link href="/login" className="font-semibold underline">Sign in</Link> and request another link.</p></>}</section></main>;
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f7f6f2] px-4 py-16 text-center text-[#5c665c]">Loading verification…</main>}><VerifyEmailContent /></Suspense>;
}
