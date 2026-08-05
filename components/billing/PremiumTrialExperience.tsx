"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { supabase } from "@/lib/supabase/client";
import { startPremiumCheckout } from "@/lib/billing/client";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";

export default function PremiumTrialExperience() {
  const { access } = useBillingAccess();
  const [open, setOpen] = useState(false);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const acknowledged = useRef(false);

  useEffect(() => {
    if (!access?.welcomeTrial.expiredNoticeRequired || acknowledged.current) return;
    acknowledged.current = true;
    setOpen(true);

    void supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token) return;
      await fetch("/api/billing/trial-expiry-seen", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    });
  }, [access?.welcomeTrial.expiredNoticeRequired]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/45 px-4" role="dialog" aria-modal="true" aria-labelledby="trial-ended-title">
      <section className="w-full max-w-lg rounded-[2rem] border border-[#e2e6da] bg-white p-7 shadow-[0_28px_90px_rgba(15,23,42,0.25)] sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7b8d6f]">Account update</p>
        <h2 id="trial-ended-title" className="mt-3 text-3xl font-semibold text-[#2f3a2f]">Your Premium welcome period has ended</h2>
        <p className="mt-4 text-sm leading-7 text-[#5c665c]">
          You can continue with full Premium access by subscribing, or keep using Classendo on the Basic plan. Your saved resources have not been deleted.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={startingCheckout}
            onClick={async () => {
              setStartingCheckout(true);
              try {
                await startPremiumCheckout("monthly");
              } finally {
                setStartingCheckout(false);
              }
            }}
            className="btn btn-primary px-5 py-3 disabled:opacity-60"
          >
            {startingCheckout ? "Opening checkout…" : "Continue with Premium"}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary px-5 py-3">
            Use Basic
          </button>
          <Link href="/upgrade" onClick={() => setOpen(false)} className="btn btn-secondary px-5 py-3">
            Compare plans
          </Link>
        </div>
      </section>
    </div>
  );
}
