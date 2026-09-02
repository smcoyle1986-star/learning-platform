"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase, supabaseReady } from "@/lib/supabase/client";
import { trackConversion } from "@/lib/analytics/vercel";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "needs_sign_in" | "failed">("checking");

  useEffect(() => {
    let active = true;

    void (async () => {
      await supabaseReady;
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error || !data.session) {
        const parameters = new URLSearchParams(window.location.search);
        // Supabase adds an error parameter when the one-time link is truly
        // expired or invalid. A session can also be unavailable when a mail
        // app opens the link in its own browser after confirmation succeeds.
        setStatus(parameters.has("error") || parameters.has("error_code") ? "failed" : "needs_sign_in");
        return;
      }

      const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
      trackConversion("welcome_trial_started", {
        destination: next === "/upgrade" ? "upgrade" : "flashcards",
      });
      const destination = new URL(next, window.location.origin);
      destination.searchParams.set("email_confirmed", "1");
      router.replace(`${destination.pathname}${destination.search}`);
    })();

    return () => {
      active = false;
    };
  }, [router]);

  if (status === "needs_sign_in") {
    return (
      <main className="min-h-screen bg-[#f7f6f2] px-6 py-16 text-[#2f3a2f]">
        <section className="mx-auto max-w-lg rounded-[2rem] border border-[#e2e6da] bg-white p-8 shadow-[0_18px_40px_rgba(54,64,46,0.10)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6d8160]">Confirmation finished</p>
          <h1 className="mt-3 text-3xl font-semibold">This browser could not sign you in automatically.</h1>
          <p className="mt-4 leading-7 text-[#5c665c]">
            Your email confirmation may already have succeeded. Return to Classendo and sign in with the email address and password you chose. If sign-in says your email is still unconfirmed, request a fresh link.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/login" className="btn btn-primary inline-flex px-6 py-3">Sign in to Classendo</Link>
            <Link href="/check-email" className="btn btn-secondary inline-flex px-6 py-3">Request a new link</Link>
          </div>
        </section>
      </main>
    );
  }

  if (status === "failed") {
    return (
      <main className="min-h-screen bg-[#f7f6f2] px-6 py-16 text-[#2f3a2f]">
        <section className="mx-auto max-w-lg rounded-[2rem] border border-[#e2e6da] bg-white p-8 shadow-[0_18px_40px_rgba(54,64,46,0.10)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a45d49]">Confirmation link unavailable</p>
          <h1 className="mt-3 text-3xl font-semibold">We could not sign you in from this link.</h1>
          <p className="mt-4 leading-7 text-[#5c665c]">The link may have already been used. You can sign in, or request a fresh confirmation email from any device.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/check-email" className="btn btn-primary inline-flex px-6 py-3">Request a new link</Link>
            <Link href="/login" className="btn btn-secondary inline-flex px-6 py-3">Return to login</Link>
          </div>
        </section>
      </main>
    );
  }

  return <main className="min-h-screen bg-[#f7f6f2] px-6 py-20 text-center text-[#5c665c]">Confirming your email…</main>;
}
