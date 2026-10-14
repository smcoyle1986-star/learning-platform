"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";
import { verificationSendOutcome } from "@/lib/auth/verification-notice";

const SIGNUP_EMAIL_SEND_FAILED_KEY = "classendo-verification-email-pending";

export default function EmailVerificationNotice() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [verified, setVerified] = useState<boolean | null>(null);
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
      setVerified(null);
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
        const isVerified = result?.verified === true;
        setVerified(isVerified);
        if (isVerified) setNotice("");
      } catch {
        if (active && requestId === latestRequest) setVerified(null);
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

  if (loading || !user || verified !== false || pathname.startsWith("/games/")) return null;

  async function resend() {
    setSending(true);
    setNotice("");
    try {
      const response = await fetch("/api/auth/verification/send", { method: "POST" });
      const result = await response.json().catch(() => null);
      const outcome = verificationSendOutcome(response.ok, result);
      setNotice(outcome.message);
      if (outcome.verified) setVerified(true);
    } catch {
      setNotice("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <aside data-site-chrome className="border-b border-[#d5e2cf] bg-[#f3f8ef] px-4 py-2 text-center text-sm text-[#496143]">
      <span>Verify your email to activate your 14-day Premium trial and unlock publishing, Creator uploads, and billing. </span>
      <button onClick={() => void resend()} disabled={sending} className="font-semibold underline underline-offset-2 disabled:opacity-60">
        {sending ? "Sending…" : "Send verification email"}
      </button>
      {notice && <span className="ml-2" role="status" aria-live="polite">{notice}</span>}
      <Link href="/verify-email" className="sr-only">Verify email</Link>
    </aside>
  );
}
