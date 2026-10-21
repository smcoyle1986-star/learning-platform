"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase/client";
import { verificationSendOutcome } from "@/lib/auth/verification-notice";
import type { VerificationGrace } from "@/lib/auth/verification-grace";

export default function VerificationRequiredPage() {
  const router = useRouter();
  const [status, setStatus] = useState<VerificationGrace | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [correcting, setCorrecting] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const response = await fetch("/api/auth/verification/status", { cache: "no-store" });
      if (!active) return;
      if (response.status === 401) { router.replace("/login"); return; }
      if (response.ok) {
        const result = await response.json() as VerificationGrace;
        if (result.verified) { router.replace("/dashboard"); router.refresh(); }
        else setStatus(result);
      }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 30_000);
    window.addEventListener("focus", refresh);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener("focus", refresh); };
  }, [router]);

  async function resend() {
    setSending(true);
    try {
      const response = await fetch("/api/auth/verification/send", { method: "POST" });
      setMessage(verificationSendOutcome(response.ok, await response.json().catch(() => null)).message);
    } catch { setMessage("Could not reach the server. Please try again."); }
    finally { setSending(false); }
  }

  async function correctEmail(event: React.FormEvent) {
    event.preventDefault();
    if (!status?.email || !newEmail.trim() || !password) return;
    setCorrecting(true);
    setMessage("");
    try {
      const normalized = newEmail.trim().toLowerCase();
      if (normalized === status.email.trim().toLowerCase()) { setMessage("Enter a different email address."); return; }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: status.email, password });
      if (signInError) { setMessage("Your current password could not be confirmed."); return; }
      const { error: updateError } = await supabase.auth.updateUser({ email: normalized });
      if (updateError) { setMessage(updateError.message); return; }
      setPassword("");
      setEditingEmail(false);
      setMessage("Check your email for the change confirmation. After it is confirmed, resend your Classendo verification email to the new address.");
    } catch { setMessage("Could not update your email. Please try again or contact support."); }
    finally { setCorrecting(false); }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return <main className="min-h-screen bg-[#f7f6f2] px-4 py-16 text-[#2f3a2f]"><section className="mx-auto max-w-lg rounded-[2rem] border border-[#e2e6da] bg-white p-8 shadow-lg"><h1 className="text-3xl font-semibold">Verify your email to continue</h1><p className="mt-4 leading-7 text-[#5c665c]">Your 21-day verification period has ended. Your work is saved and will be available as soon as you verify your email.</p>{status?.email && <p className="mt-4 text-sm">Email: <strong>{status.email}</strong></p>}<button onClick={() => setEditingEmail((value) => !value)} className="mt-3 text-sm font-semibold underline">Correct my email</button>{editingEmail && <form onSubmit={(event) => void correctEmail(event)} className="mt-4 space-y-3"><label className="block text-sm">New email address<input type="email" required value={newEmail} onChange={(event) => setNewEmail(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label><label className="block text-sm">Current password<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label><button disabled={correcting} className="btn btn-secondary px-4 py-2 disabled:opacity-60">{correcting ? "Checking…" : "Confirm email change"}</button><p className="text-xs text-[#5c665c]">The email change may require a confirmation link. If you cannot receive it, contact support.</p></form>}<div className="mt-7 flex flex-wrap gap-3"><button onClick={() => void resend()} disabled={sending} className="btn btn-primary px-5 py-3 disabled:opacity-60">{sending ? "Sending…" : "Resend verification email"}</button><button onClick={() => void signOut()} className="btn btn-secondary px-5 py-3">Sign out</button></div>{message && <p role="status" className="mt-4 text-sm">{message}</p>}</section></main>;
}
