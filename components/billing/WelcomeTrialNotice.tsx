"use client";

import Link from "next/link";
import { EyeOff, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/lib/supabase/client";

type WelcomeTrialNoticeProps = {
  daysRemaining: number;
  userId: string;
  userMetadata: Record<string, unknown>;
};

const DISMISSED_METADATA_KEY = "premium_trial_notice_dismissed_at";

export default function WelcomeTrialNotice({ daysRemaining, userId, userMetadata }: WelcomeTrialNoticeProps) {
  const sessionKey = `classendo_trial_notice_hidden:${userId}`;
  const [hiddenForSession, setHiddenForSession] = useState(
    () => typeof window !== "undefined" && window.sessionStorage.getItem(sessionKey) === "1",
  );
  const [savingPreference, setSavingPreference] = useState(false);
  const [error, setError] = useState("");
  const permanentlyDismissed = Boolean(userMetadata[DISMISSED_METADATA_KEY]);

  if (hiddenForSession || permanentlyDismissed) return null;

  const hideForNow = () => {
    window.sessionStorage.setItem(sessionKey, "1");
    setHiddenForSession(true);
  };

  const dismissPermanently = async () => {
    if (savingPreference) return;
    setSavingPreference(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...userMetadata,
        [DISMISSED_METADATA_KEY]: new Date().toISOString(),
      },
    });

    if (updateError) {
      console.error("Could not save trial-notice preference:", updateError);
      setError("We could not save that preference. Please try again.");
      setSavingPreference(false);
      return;
    }

    setHiddenForSession(true);
    setSavingPreference(false);
  };

  return (
    <section className="relative rounded-2xl border border-[#e3cf91] bg-[#fff9df] px-4 py-4 shadow-sm sm:px-5" aria-label="Premium welcome trial">
      <button
        type="button"
        onClick={hideForNow}
        aria-label="Hide trial notice for now"
        className="absolute right-3 top-3 rounded-full p-1.5 text-[#8a6b25] transition hover:bg-[#f7e9b5]"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>

      <div className="flex flex-col gap-4 pr-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f8e8a8] text-[#98701f]">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-[#5f491a]">
              Premium trial · {daysRemaining} {daysRemaining === 1 ? "day" : "days"} remaining
            </p>
            <p className="mt-1 text-sm leading-6 text-[#765f2b]">
              Full Premium access is active. No payment details are required and the account moves to Basic when the trial ends.
            </p>
            {error ? <p className="mt-2 text-sm font-medium text-[#a45d49]">{error}</p> : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link href="/upgrade" className="btn btn-secondary px-4 py-2 text-sm">
            Continue Premium
          </Link>
          <button
            type="button"
            onClick={() => void dismissPermanently()}
            disabled={savingPreference}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-[#765f2b] transition hover:bg-[#f7e9b5] disabled:opacity-60"
          >
            <EyeOff aria-hidden="true" className="h-4 w-4" />
            {savingPreference ? "Saving…" : "Don’t show again"}
          </button>
        </div>
      </div>
    </section>
  );
}
