"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase, supabaseReady } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await supabaseReady;
      await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      // Return the same response for unknown users and provider-side errors so
      // this endpoint cannot be used to enumerate accounts.
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f6f2] px-4 py-12 text-[#2f3a2f]">
      <section className="mx-auto max-w-lg rounded-[2rem] border border-[#e2e6da] bg-white p-6 shadow-[0_18px_40px_rgba(54,64,46,0.10)] md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6d8160]">Account recovery</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Reset your password</h1>
        {submitted ? (
          <div role="status" className="mt-5 rounded-2xl border border-[#dbe3d1] bg-[#f7faf4] p-4 text-sm leading-6 text-[#4f6247]">
            <p>If an account can receive a password reset at that address, we’ll send a link shortly. If it does not arrive, please try again later.</p>
          </div>
        ) : (
          <>
            <p className="mt-4 leading-7 text-[#5c665c]">Enter the email address on your account. We’ll send a secure link if password recovery is available.</p>
            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
              <div>
                <label htmlFor="recovery-email" className="mb-2 block text-sm font-semibold">Email address</label>
                <input id="recovery-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-[#dfe5d7] bg-[#fbfbf8] px-4 py-3 outline-none focus:border-[#98b37d] focus:bg-white" />
              </div>
              <button type="submit" disabled={submitting} className="btn btn-primary w-full px-6 py-4 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Sending…" : "Send reset link"}</button>
            </form>
          </>
        )}
        <Link href="/login" className="mt-6 inline-flex text-sm font-semibold text-[#6c8f58] underline underline-offset-4">Return to login</Link>
      </section>
    </main>
  );
}
