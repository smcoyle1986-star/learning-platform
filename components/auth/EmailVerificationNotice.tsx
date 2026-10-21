"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";
import { verificationSendOutcome } from "@/lib/auth/verification-notice";
import type { VerificationGrace } from "@/lib/auth/verification-grace";
import { hasAnalyticsConsent } from "@/lib/privacy/consent";
import { supabase } from "@/lib/supabase/client";

const SIGNUP_EMAIL_SEND_FAILED_KEY = "classendo-verification-email-pending";

export default function EmailVerificationNotice() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [status, setStatus] = useState<VerificationGrace | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [urgentOpen, setUrgentOpen] = useState(false);
  const [modalId, setModalId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SIGNUP_EMAIL_SEND_FAILED_KEY) === "1") {
        window.sessionStorage.removeItem(SIGNUP_EMAIL_SEND_FAILED_KEY);
        setNotice("We couldn't send your verification email. Use this button to try again.");
      }
    } catch {
      // The resend button remains available if session storage cannot be read.
    }
  }, [pathname, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setStatus(null);
      return;
    }

    let active = true;
    let latestRequest = 0;
    let lastRefreshAt = 0;

    const refreshStatus = async (force = false) => {
      if (document.visibilityState === "hidden" && !force) return;
      const now = Date.now();
      if (!force && now - lastRefreshAt < 1000) return;
      lastRefreshAt = now;
      const requestId = ++latestRequest;

      try {
        const response = await fetch("/api/auth/verification/status", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not read verification status.");
        const result = await response.json();
        if (!active || requestId !== latestRequest) return;
        const next = result as VerificationGrace;
        setStatus(next);
        if (next.verified) setNotice("");
        if (next.phase === "urgent") {
          const claim = await fetch("/api/auth/verification/urgent-reminder", { method: "POST" });
          const reminder = await claim.json().catch(() => null);
          if (active && requestId === latestRequest && claim.ok && reminder?.show === true) {
            setModalId(crypto.randomUUID());
            setUrgentOpen(true);
          }
        }
      } catch {
        if (active && requestId === latestRequest) setStatus(null);
      }
    };

    const refreshWhenVisible = () => void refreshStatus();
    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") void refreshStatus();
    };

    void refreshStatus(true);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshOnVisibility);

    return () => {
      active = false;
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
    };
  }, [user?.id]);

  const trackModal = useCallback(async (eventType: "modal_viewed" | "resend_clicked" | "remind_later_clicked", impressionId: string, eventId: string) => {
    if (!hasAnalyticsConsent() || navigator.doNotTrack === "1") return false;
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) return false;
      const response = await fetch("/api/analytics/verification-modal", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ eventType, impressionId, eventId }),
      });
      return response.ok;
    } catch { return false; }
  }, []);

  useEffect(() => {
    if (urgentOpen && modalId) void trackModal("modal_viewed", modalId, modalId);
  // The impression ID changes for each actual opening; the server deduplicates retries.
  }, [urgentOpen, modalId, trackModal]);

  if (loading || !user || !status || status.verified || status.phase === "expired" || pathname === "/verification-required") return null;
  const showBanner = !dismissed && (status.phase === "reminder" || status.phase === "urgent");

  async function resend() {
    setSending(true);
    setNotice("");
    try {
      const clickId = urgentOpen && modalId ? crypto.randomUUID() : null;
      const tracked = clickId && modalId
        ? await trackModal("modal_viewed", modalId, modalId) && await trackModal("resend_clicked", modalId, clickId)
        : false;
      const response = await fetch("/api/auth/verification/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tracked ? { analyticsImpressionId: modalId, analyticsClickId: clickId } : {}),
      });
      const result = await response.json().catch(() => null);
      const outcome = verificationSendOutcome(response.ok, result);
      setNotice(outcome.message);
      if (outcome.verified) setStatus((previous) => previous ? { ...previous, verified: true, phase: "verified" } : null);
    } catch {
      setNotice("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return <>
    {showBanner && <aside data-site-chrome className="border-b border-[#d5e2cf] bg-[#f3f8ef] px-4 py-2 text-center text-sm text-[#496143]">
      <span>Verify your email within {status.daysRemaining ?? 21} days to keep using your account. Your 14-day Premium trial starts after verification. </span>
      <button onClick={() => void resend()} disabled={sending} className="font-semibold underline underline-offset-2 disabled:opacity-60">{sending ? "Sending…" : "Resend verification email"}</button>
      <button onClick={() => setDismissed(true)} className="ml-3 font-semibold underline underline-offset-2" aria-label="Dismiss verification reminder">Dismiss</button>
      {notice && <span className="ml-2" role="status" aria-live="polite">{notice}</span>}
      <Link href="/verify-email" className="sr-only">Verify email</Link>
    </aside>}
    {urgentOpen && <div className="fixed inset-0 z-[230] flex items-center justify-center bg-black/50 px-4" role="dialog" aria-modal="true" aria-labelledby="verification-urgent-title">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 text-[#2f3a2f] shadow-xl">
        <h2 id="verification-urgent-title" className="text-2xl font-semibold">Verify your email soon</h2>
        <p className="mt-4 leading-7">{status.daysRemaining} {status.daysRemaining === 1 ? "day" : "days"} left to verify your email before account features pause. Your saved work will remain available after verification.</p>
        <button onClick={() => void resend()} disabled={sending} className="btn btn-primary mt-6 px-5 py-3 disabled:opacity-60">{sending ? "Sending…" : "Resend verification email"}</button>
        <button onClick={() => { if (modalId) void trackModal("modal_viewed", modalId, modalId).then((viewed) => { if (viewed) void trackModal("remind_later_clicked", modalId, crypto.randomUUID()); }); setUrgentOpen(false); }} className="ml-3 font-semibold underline">Remind me later</button>
        {notice && <p role="status" className="mt-4 text-sm">{notice}</p>}
      </section>
    </div>}
  </>;
}
