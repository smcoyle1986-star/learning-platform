"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { initialAuthLinkType, supabase, supabaseReady } from "@/lib/supabase/client";
import { hasEmailPasswordProvider } from "@/lib/auth/password-recovery";

type PageState = "checking" | "ready" | "invalid" | "google" | "complete";

function hasRecoveryLinkType() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  return query.get("type") === "recovery" || hash.get("type") === "recovery";
}

function hasAuthLinkError() {
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  return query.has("error") || query.has("error_code") || hash.has("error") || hash.has("error_code");
}

export default function ResetPasswordPage() {
  const [state, setState] = useState<PageState>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    const initialRecoveryLink = hasRecoveryLinkType();
    const invalidLink = hasAuthLinkError();
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || event !== "PASSWORD_RECOVERY") return;
      if (!session) { setState("invalid"); return; }
      setState(hasEmailPasswordProvider(session.user) ? "ready" : "google");
    });

    void (async () => {
      await supabaseReady;
      if (!active) return;
      if (invalidLink) { setState("invalid"); return; }
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error || !data.session || (!initialRecoveryLink && initialAuthLinkType !== "recovery")) { setState("invalid"); return; }
      setState(hasEmailPasswordProvider(data.session.user) ? "ready" : "google");
    })();

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    if (password.length < 8) { setMessage("Choose a password with at least 8 characters."); return; }
    if (password !== confirmation) { setMessage("The passwords do not match."); return; }
    setSubmitting(true);
    try {
      await supabaseReady;
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session || !hasEmailPasswordProvider(data.session.user)) {
        setState("invalid");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setMessage("We could not update your password. The recovery link may have expired; request a new one and try again."); return; }
      setState("complete");
    } catch {
      setMessage("We could not update your password. Please request a new recovery link and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f6f2] px-4 py-12 text-[#2f3a2f]">
      <section className="mx-auto max-w-lg rounded-[2rem] border border-[#e2e6da] bg-white p-6 shadow-[0_18px_40px_rgba(54,64,46,0.10)] md:p-8">
        {state === "checking" ? <p role="status" className="text-[#5c665c]">Checking your recovery link…</p> : null}
        {state === "invalid" ? <>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a45d49]">Recovery link unavailable</p>
          <h1 className="mt-3 text-3xl font-semibold">This reset link is invalid or expired.</h1>
          <p className="mt-4 leading-7 text-[#5c665c]">Request a new password reset link to continue.</p>
          <Link href="/forgot-password" className="btn btn-primary mt-7 inline-flex px-6 py-3">Request another link</Link>
        </> : null}
        {state === "google" ? <>
          <h1 className="text-3xl font-semibold">Use Google to sign in</h1>
          <p className="mt-4 leading-7 text-[#5c665c]">This account does not have an email/password sign-in. Continue with Google to access it.</p>
          <Link href="/login" className="btn btn-primary mt-7 inline-flex px-6 py-3">Return to login</Link>
        </> : null}
        {state === "ready" ? <>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6d8160]">Account recovery</p>
          <h1 className="mt-3 text-3xl font-semibold">Choose a new password</h1>
          <p className="mt-4 leading-7 text-[#5c665c]">Your Classendo email verification status and Premium eligibility are not changed by a password reset.</p>
          <form onSubmit={handleSubmit} className="mt-7 space-y-5">
            <div>
              <label htmlFor="new-password" className="mb-2 block text-sm font-semibold">New password</label>
              <input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-[#dfe5d7] bg-[#fbfbf8] px-4 py-3 outline-none focus:border-[#98b37d] focus:bg-white" />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold">Confirm new password</label>
              <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-2xl border border-[#dfe5d7] bg-[#fbfbf8] px-4 py-3 outline-none focus:border-[#98b37d] focus:bg-white" />
            </div>
            {message ? <p role="alert" className="text-sm leading-6 text-[#a45d49]">{message}</p> : null}
            <button type="submit" disabled={submitting} className="btn btn-primary w-full px-6 py-4 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Updating…" : "Update password"}</button>
          </form>
        </> : null}
        {state === "complete" ? <>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6d8160]">Password updated</p>
          <h1 className="mt-3 text-3xl font-semibold">Your new password is ready.</h1>
          <p className="mt-4 leading-7 text-[#5c665c]">Your Classendo email verification status and Premium eligibility remain unchanged.</p>
          <Link href="/" className="btn btn-primary mt-7 inline-flex px-6 py-3">Continue to Classendo</Link>
        </> : null}
      </section>
    </main>
  );
}
