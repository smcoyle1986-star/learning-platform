"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";

export default function EmailVerificationNotice() {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [verified, setVerified] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    fetch("/api/auth/verification/status", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => { if (active) setVerified(result?.verified === true); })
      .catch(() => { if (active) setVerified(null); });
    return () => { active = false; };
  }, [user?.id]);

  if (loading || !user || verified !== false || pathname.startsWith("/games/")) return null;
  async function resend() {
    setSending(true); setNotice("");
    const response = await fetch("/api/auth/verification/send", { method: "POST" });
    const result = await response.json().catch(() => null);
    setNotice(response.ok ? "Verification email sent. Check your inbox." : String(result?.error ?? "Could not send email."));
    setSending(false);
  }
  return <aside data-site-chrome className="border-b border-[#d5e2cf] bg-[#f3f8ef] px-4 py-2 text-center text-sm text-[#496143]">
    <span>Verify your email to activate your 14-day Premium trial and unlock publishing, Creator uploads, and billing. </span>
    <button onClick={() => void resend()} disabled={sending} className="font-semibold underline underline-offset-2 disabled:opacity-60">{sending ? "Sending…" : "Send verification email"}</button>
    {notice && <span className="ml-2">{notice}</span>}
    <Link href="/verify-email" className="sr-only">Verify email</Link>
  </aside>;
}
