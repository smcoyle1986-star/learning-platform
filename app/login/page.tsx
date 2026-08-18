"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { savePendingEmailConfirmation } from "@/lib/auth/pending-confirmation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmationRequired, setConfirmationRequired] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setConfirmationRequired(false);
    setSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        const normalizedMessage = error.message.toLowerCase();
        if (normalizedMessage.includes("email not confirmed")) {
          const pendingEmail = email.trim().toLowerCase();
          const requestedPath = new URLSearchParams(window.location.search).get("next");
          const nextPath = requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
            ? requestedPath
            : "/flashcards?onboarding=1";
          savePendingEmailConfirmation({ email: pendingEmail, nextPath, sentAt: 0 });
          setConfirmationRequired(true);
          setMessage("Please confirm your email address before logging in. We can send you a new confirmation link.");
        } else if (normalizedMessage.includes("invalid login credentials")) {
          setMessage("The email address or password is incorrect.");
        } else {
          setMessage("We could not log you in just now. Please try again.");
        }
        return;
      }

      const requestedPath = new URLSearchParams(window.location.search).get("next");
      const safePath =
        requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
          ? requestedPath
          : "/?signed_in=1";

      router.replace(safePath);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#2f3a2f]">
      <section className="mx-auto flex min-h-[calc(100vh-80px)] max-w-5xl items-center px-4 py-8 sm:px-6 sm:py-12">
        <div className="w-full">
          <div className="mx-auto max-w-lg rounded-[2rem] border border-[#e2e6da] bg-white p-6 shadow-[0_18px_40px_rgba(54,64,46,0.10)] md:p-8">
            <div className="inline-flex items-center rounded-full border border-[#dbe3d1] bg-[#f7faf4] px-4 py-2 text-sm font-semibold text-[#6d8160] shadow-sm">
              Welcome back
            </div>

            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#2f3a2f]">
              Log in to Classendo
            </h1>
            <p className="mt-4 text-base leading-7 text-[#5c665c]">
              Pick up where you left off and continue building flashcards, games, worksheets, and lesson plans.
            </p>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#2f3a2f]" htmlFor="login-email">
                  Email address
                </label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="teacher@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-[#dfe5d7] bg-[#fbfbf8] px-4 py-3 text-[#2f3a2f] outline-none transition focus:border-[#98b37d] focus:bg-white focus:shadow-[0_0_0_5px_rgba(134,169,106,0.12)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#2f3a2f]" htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-[#dfe5d7] bg-[#fbfbf8] px-4 py-3 text-[#2f3a2f] outline-none transition focus:border-[#98b37d] focus:bg-white focus:shadow-[0_0_0_5px_rgba(134,169,106,0.12)]"
                />
              </div>

              {message && (
                <div className="rounded-2xl border border-[#ead0c9] bg-[#fff7f4] px-4 py-3 text-sm leading-6 text-[#a45d49]">
                  <p>{message}</p>
                  {confirmationRequired ? (
                    <Link href="/check-email" className="mt-2 inline-flex font-semibold underline underline-offset-4">
                      Open email confirmation help
                    </Link>
                  ) : null}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary w-full px-6 py-4 text-base disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Logging in..." : "Log in"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#5c665c]">
              Don’t have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-[#6c8f58] underline underline-offset-4 hover:text-[#5f7f4b]"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
