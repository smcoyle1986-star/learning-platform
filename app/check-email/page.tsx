"use client";

import Link from "next/link";
import { CheckCircle2, Mail, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  buildConfirmationRedirect,
  clearPendingEmailConfirmation,
  maskEmailAddress,
  readPendingEmailConfirmation,
  savePendingEmailConfirmation,
  type PendingEmailConfirmation,
} from "@/lib/auth/pending-confirmation";
import { supabase } from "@/lib/supabase/client";

const RESEND_COOLDOWN_SECONDS = 60;

function secondsUntilResend(sentAt: number) {
  return Math.max(0, Math.ceil((sentAt + RESEND_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000));
}

export default function CheckEmailPage() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingEmailConfirmation | null>(null);
  const [loading, setLoading] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const saved = readPendingEmailConfirmation();
      if (data.session) {
        clearPendingEmailConfirmation();
        router.replace(saved?.nextPath ?? "/dashboard");
        return;
      }
      setPending(saved);
      setCooldown(saved ? secondsUntilResend(saved.sentAt) : 0);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const maskedEmail = useMemo(
    () => pending?.email ? maskEmailAddress(pending.email) : null,
    [pending?.email],
  );

  const resend = async () => {
    if (!pending?.email || cooldown > 0 || resending) return;
    setResending(true);
    setMessage("");
    setError("");

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: pending.email,
        options: {
          emailRedirectTo: buildConfirmationRedirect(window.location.origin, pending.nextPath),
        },
      });
      if (resendError) throw resendError;

      const nextPending = { ...pending, sentAt: Date.now() };
      savePendingEmailConfirmation(nextPending);
      setPending(nextPending);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setMessage("A new confirmation email has been sent. Please use the newest message in your inbox.");
    } catch (resendError: unknown) {
      console.error("Could not resend confirmation email:", resendError);
      setError("We could not resend the email just now. Please wait a moment and try again.");
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return <main className="min-h-screen bg-[#f7f6f2] px-6 py-20 text-center text-[#5c665c]">Checking your account…</main>;
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] px-4 py-10 text-[#2f3a2f] sm:px-6 sm:py-16">
      <section className="mx-auto max-w-xl rounded-[2rem] border border-[#e2e6da] bg-white p-6 shadow-[0_18px_40px_rgba(54,64,46,0.10)] sm:p-9">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef5e9] text-[#668457]">
          <Mail aria-hidden="true" className="h-7 w-7" />
        </div>
        <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#6d8160]">One more step</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Check your email</h1>
        <p className="mt-4 text-base leading-7 text-[#5c665c]">
          {maskedEmail
            ? <>We sent a confirmation link to <strong className="font-semibold text-[#2f3a2f]">{maskedEmail}</strong>.</>
            : "Open the confirmation email from Classendo to finish creating your account."}
        </p>

        <div className="mt-6 rounded-2xl border border-[#dce6d5] bg-[#f6faf3] p-5">
          <div className="flex gap-3">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[#6c8f58]" />
            <div>
              <h2 className="font-semibold">Confirm before continuing</h2>
              <p className="mt-1 text-sm leading-6 text-[#5c665c]">
                Click the link in the email to activate your Classendo account and begin your 14-day Premium welcome trial.
              </p>
            </div>
          </div>
        </div>

        <ul className="mt-6 space-y-2 text-sm leading-6 text-[#5c665c]">
          <li>• Check your spam or junk folder if it has not arrived.</li>
          <li>• Use the newest email if you requested more than one link.</li>
          <li>• You will be signed in automatically after confirmation.</li>
        </ul>

        <div aria-live="polite" className="mt-5">
          {message ? <p className="rounded-2xl border border-[#d5e2cf] bg-[#f4f8f1] px-4 py-3 text-sm text-[#496143]">{message}</p> : null}
          {error ? <p className="rounded-2xl border border-[#ead0c9] bg-[#fff7f4] px-4 py-3 text-sm text-[#a45d49]">{error}</p> : null}
        </div>

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {pending?.email ? (
            <button
              type="button"
              onClick={() => void resend()}
              disabled={resending || cooldown > 0}
              className="btn btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw aria-hidden="true" className={`h-4 w-4 ${resending ? "animate-spin" : ""}`} />
              {resending ? "Sending…" : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend confirmation email"}
            </button>
          ) : null}
          <Link href="/login" className="btn btn-secondary px-5 py-3 text-center">Return to login</Link>
          <button
            type="button"
            onClick={() => {
              clearPendingEmailConfirmation();
              router.push("/signup");
            }}
            className="px-4 py-3 text-sm font-semibold text-[#617657] underline underline-offset-4"
          >
            Use a different email
          </button>
        </div>
      </section>
    </main>
  );
}
