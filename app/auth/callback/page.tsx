"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase, supabaseReady } from "@/lib/supabase/client";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    void (async () => {
      await supabaseReady;
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;

      if (error || !data.session) {
        setFailed(true);
        return;
      }

      const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
      const destination = new URL(next, window.location.origin);
      destination.searchParams.set("email_confirmed", "1");
      router.replace(`${destination.pathname}${destination.search}`);
    })();

    return () => {
      active = false;
    };
  }, [router]);

  if (failed) {
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
