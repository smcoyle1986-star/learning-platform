"use client";

import Link from "next/link";
import Script from "next/script";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { normalizeUsername, suggestUsernameFromEmail } from "@/lib/auth/username";
import { getAnalyticsAnonymousId, getAnalyticsSessionKey, trackAuthenticatedAnalyticsSession } from "@/lib/analytics/client";
import { trackGoogleAdsSignup } from "@/lib/analytics/google-ads";
import { trackConversion } from "@/lib/analytics/vercel";
import { hasAnalyticsConsent } from "@/lib/privacy/consent";
import { getCountryRegionOptions } from "@/lib/auth/countries";

type TurnstileApi = { render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => string; reset: (id?: string) => void };
declare global { interface Window { turnstile?: TurnstileApi } }

const USER_TYPES = ["Teacher", "Online tutor", "Student", "Parent", "Other"];

export default function CompleteGoogleSignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [countryRegion, setCountryRegion] = useState("");
  const [userType, setUserType] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);
  const [session, setSession] = useState<{ access_token: string; user: { email?: string } } | null>(null);
  const [signupAttribution, setSignupAttribution] = useState<unknown>(null);
  const [freeGamesContext, setFreeGamesContext] = useState<unknown>(null);
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const countryOptions = useMemo(() => getCountryRegionOptions(), []);
  const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const nextPathValue = params.get("next");
  const nextPath = nextPathValue?.startsWith("/") && !nextPathValue.startsWith("//") ? nextPathValue : "/flashcards?onboarding=1";

  useEffect(() => {
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace("/login"); return; }
      setSession(data.session);
      const statusResponse = await fetch("/api/auth/google/status", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        cache: "no-store",
      });
      const status = await statusResponse.json().catch(() => null) as { onboardingRequired?: boolean; error?: string } | null;
      if (!statusResponse.ok) {
        setMessage(status?.error ?? "We could not verify your account setup. Please try again.");
        setCheckingOnboarding(false);
        return;
      }
      if (!status?.onboardingRequired) {
        router.replace(nextPath);
        return;
      }
      setUsername(suggestUsernameFromEmail(data.session.user.email ?? ""));
      try {
        const draft = JSON.parse(sessionStorage.getItem("classendo-google-onboarding-draft") ?? "null") as { username?: string; countryRegion?: string; userType?: string; legalAccepted?: boolean; attribution?: unknown; freeGamesContext?: unknown } | null;
        if (draft) {
          if (draft.username) setUsername(draft.username);
          if (draft.countryRegion) setCountryRegion(draft.countryRegion);
          if (draft.userType && USER_TYPES.includes(draft.userType)) setUserType(draft.userType);
          if (draft.legalAccepted) setLegalAccepted(true);
          setSignupAttribution(draft.attribution ?? null);
          setFreeGamesContext(draft.freeGamesContext ?? null);
        }
      } catch { /* Continue with a blank form if browser storage is unavailable. */ }
      setCheckingOnboarding(false);
    });
  }, [nextPath, router]);

  const renderTurnstile = () => {
    if (!siteKey || !container.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(container.current, {
      sitekey: siteKey,
      callback: setTurnstileToken,
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage("");
    const cleanUsername = normalizeUsername(username);
    if (!/^[a-z0-9_-]{3,24}$/.test(cleanUsername) || !countryRegion.trim() || !USER_TYPES.includes(userType) || !legalAccepted) {
      setMessage("Complete each field and accept the legal terms to continue.");
      return;
    }
    if (siteKey && !turnstileToken) { setMessage("Complete the security check to continue."); return; }
    if (!session) { setMessage("Your Google session has expired. Sign in again to continue."); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/google/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          username: cleanUsername, countryRegion: countryRegion.trim(), userType, legalAccepted, turnstileToken,
          guestExitContext: params.get("from") === "guest-exit" && hasAnalyticsConsent(),
          attribution: signupAttribution,
          freeGamesContext: hasAnalyticsConsent() ? freeGamesContext : null,
          analyticsSessionKey: hasAnalyticsConsent() ? getAnalyticsSessionKey() : null,
          analyticsAnonymousId: hasAnalyticsConsent() ? getAnalyticsAnonymousId() : null,
          nextPath,
        }),
      });
      const result = await response.json().catch(() => null) as { error?: string; signupConversionId?: string; trialStarted?: boolean } | null;
      if (!response.ok) { setMessage(result?.error ?? "We could not finish creating your account."); return; }
      if (result?.signupConversionId) trackGoogleAdsSignup(result.signupConversionId);
      if (result?.trialStarted) trackConversion("welcome_trial_started", { destination: nextPath === "/upgrade" ? "upgrade" : "flashcards" });
      try { sessionStorage.removeItem("classendo-google-onboarding-draft"); } catch { /* Storage is optional. */ }
      await trackAuthenticatedAnalyticsSession("signup");
      router.replace(nextPath);
    } catch {
      setMessage("We could not reach the account service. Please retry the security check and try again.");
    } finally { setSubmitting(false); }
  };

  return <main className="fixed inset-0 z-50 flex min-h-screen items-center justify-center overflow-y-auto bg-[#263126]/55 px-4 py-8 text-[#2f3a2f] backdrop-blur-sm sm:px-6" aria-label="Complete your Classendo signup">
    <section role="dialog" aria-modal="true" aria-labelledby="google-onboarding-title" className="my-auto w-full max-w-xl rounded-[2rem] border border-[#e2e6da] bg-white p-6 shadow-[0_24px_80px_rgba(20,30,20,0.28)] sm:p-9">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6d8160]">One last step</p>
      <h1 id="google-onboarding-title" className="mt-3 text-3xl font-semibold">Finish setting up your account</h1>
      <p className="mt-3 leading-7 text-[#5c665c]">Tell us your country or region and how you use Classendo. Your verified Google email is ready to use.</p>
      {checkingOnboarding ? <p role="status" className="mt-6 text-sm text-[#5c665c]">Checking your account…</p> : <form className="mt-7 space-y-5" onSubmit={(event) => void submit(event)}>
        <div><label htmlFor="google-username" className="mb-2 block text-sm font-semibold">Username</label><input id="google-username" required minLength={3} maxLength={24} autoComplete="username" value={username} onChange={(event) => setUsername(normalizeUsername(event.target.value))} className="w-full rounded-2xl border border-[#dfe5d7] bg-[#fbfbf8] px-4 py-3 outline-none focus:border-[#98b37d]" /></div>
        <div><label htmlFor="google-country" className="mb-2 block text-sm font-semibold">Country or region</label><select id="google-country" required value={countryRegion} onChange={(event) => setCountryRegion(event.target.value)} className="w-full rounded-2xl border border-[#dfe5d7] bg-[#fbfbf8] px-4 py-3 outline-none focus:border-[#98b37d]"><option value="">Choose your country or region</option>{countryOptions.map((country) => <option key={country} value={country}>{country}</option>)}</select></div>
        <div><label htmlFor="google-user-type" className="mb-2 block text-sm font-semibold">I am a...</label><select id="google-user-type" required value={userType} onChange={(event) => setUserType(event.target.value)} className="w-full rounded-2xl border border-[#dfe5d7] bg-[#fbfbf8] px-4 py-3 outline-none focus:border-[#98b37d]"><option value="">Choose one</option>{USER_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div>
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#566056]"><input type="checkbox" required checked={legalAccepted} onChange={(event) => setLegalAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-[#6c8f58]" /><span>I confirm I&apos;m 18+ and agree to the <Link href="/legal/terms" target="_blank" className="font-semibold underline">Terms of Service</Link> and <Link href="/legal/refunds" target="_blank" className="font-semibold underline">Cancellation and Refund Policy</Link>. I acknowledge the <Link href="/legal/privacy" target="_blank" className="font-semibold underline">Privacy Notice</Link>.</span></label>
        {siteKey ? <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onReady={renderTurnstile} /><div ref={container} aria-live="polite" /></> : process.env.NODE_ENV === "production" ? <p role="alert" className="text-sm text-[#a45d49]">Signup protection is unavailable. Please try again later.</p> : null}
        {message ? <p role="status" className="rounded-2xl border border-[#ead0c9] bg-[#fff7f4] px-4 py-3 text-sm text-[#a45d49]">{message}</p> : null}
        <button type="submit" disabled={submitting || (process.env.NODE_ENV === "production" && !siteKey) || Boolean(siteKey && !turnstileToken)} className="btn btn-primary w-full px-6 py-4 disabled:opacity-60">{submitting ? "Finishing signup…" : "Create my Classendo account"}</button>
      </form>}
    </section>
  </main>;
}
