"use client";

import type { User } from "@supabase/supabase-js";
import { BookOpen, EyeOff, Images, Search, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

import { clearPendingEmailConfirmation } from "@/lib/auth/pending-confirmation";
import { supabase } from "@/lib/supabase/client";

type OnboardingStage = "welcome" | "guide" | null;

type NewUserOnboardingProps = {
  user: User | null;
  authLoading: boolean;
  daysRemaining: number;
};

const ONBOARDING_STARTED_KEY = "classendo_onboarding_started_at";
const TUTORIAL_DISMISSED_KEY = "flashcards_tutorial_dismissed_at";

function ModalShell({
  children,
  labelledBy,
  onClose,
}: {
  children: React.ReactNode;
  labelledBy: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center overflow-y-auto bg-[#1f2a1f]/55 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <div className="relative w-full max-w-xl rounded-[2rem] border border-white/70 bg-[#fffef9] p-6 shadow-[0_28px_80px_rgba(31,42,31,0.3)] sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-[#61705d] transition hover:bg-[#eef2e9]"
          aria-label="Close"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
        {children}
      </div>
    </div>
  );
}

export default function NewUserOnboarding({ user, authLoading, daysRemaining }: NewUserOnboardingProps) {
  const [stage, setStage] = useState<OnboardingStage>(null);
  const [savingPreference, setSavingPreference] = useState(false);
  const [preferenceError, setPreferenceError] = useState("");

  const sessionKey = user ? `classendo_flashcards_tutorial_hidden:${user.id}` : "";
  const metadata = user?.user_metadata ?? {};
  const tutorialPermanentlyDismissed = Boolean(metadata[TUTORIAL_DISMISSED_KEY]);
  const onboardingStarted = Boolean(metadata[ONBOARDING_STARTED_KEY]);

  useEffect(() => {
    if (authLoading || !user) return;

    const url = new URL(window.location.href);
    const isFreshSignup = url.searchParams.get("onboarding") === "1";
    let stageTimer: number | null = null;

    if (isFreshSignup) {
      clearPendingEmailConfirmation();
      url.searchParams.delete("onboarding");
      url.searchParams.delete("email_confirmed");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
      stageTimer = window.setTimeout(() => setStage("welcome"), 0);
      return () => {
        if (stageTimer !== null) window.clearTimeout(stageTimer);
      };
    }

    const hiddenForSession = window.sessionStorage.getItem(`classendo_flashcards_tutorial_hidden:${user.id}`) === "1";
    if (onboardingStarted && !tutorialPermanentlyDismissed && !hiddenForSession) {
      stageTimer = window.setTimeout(() => setStage("guide"), 0);
    }

    return () => {
      if (stageTimer !== null) window.clearTimeout(stageTimer);
    };
  }, [authLoading, onboardingStarted, tutorialPermanentlyDismissed, user]);

  const closeWelcome = () => {
    setStage(tutorialPermanentlyDismissed ? null : "guide");
  };

  const closeGuideForSession = () => {
    if (sessionKey) window.sessionStorage.setItem(sessionKey, "1");
    setStage(null);
  };

  const dismissGuidePermanently = async () => {
    if (!user || savingPreference) return;
    setSavingPreference(true);
    setPreferenceError("");

    const { error } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        [TUTORIAL_DISMISSED_KEY]: new Date().toISOString(),
      },
    });

    if (error) {
      setPreferenceError("We could not save that preference. Please try again.");
      setSavingPreference(false);
      return;
    }

    if (sessionKey) window.sessionStorage.setItem(sessionKey, "1");
    setSavingPreference(false);
    setStage(null);
  };

  if (stage === "welcome") {
    return (
      <ModalShell labelledBy="premium-welcome-title" onClose={closeWelcome}>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f8e7a1] text-[#8b6719]">
          <Sparkles aria-hidden="true" className="h-6 w-6" />
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#7a8e6d]">Welcome to Classendo</p>
        <h2 id="premium-welcome-title" className="mt-2 pr-8 text-3xl font-semibold tracking-tight text-[#2f3a2f]">
          Your 14-day Premium trial is ready
        </h2>
        <p className="mt-4 text-base leading-7 text-[#5c665c]">
          You now have full Premium access for {daysRemaining} {daysRemaining === 1 ? "day" : "days"}, with no payment details required. When the trial ends, your account automatically moves to Basic unless you choose Premium.
        </p>
        <button type="button" onClick={closeWelcome} className="btn btn-primary mt-7 w-full px-5 py-3 sm:w-auto">
          Show me how Flashcards works
        </button>
      </ModalShell>
    );
  }

  if (stage === "guide") {
    return (
      <ModalShell labelledBy="flashcards-guide-title" onClose={closeGuideForSession}>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#7a8e6d]">A quick tour</p>
        <h2 id="flashcards-guide-title" className="mt-2 pr-8 text-3xl font-semibold tracking-tight text-[#2f3a2f]">
          Build your first lesson in three steps
        </h2>

        <ol className="mt-6 space-y-4">
          <li className="flex gap-4 rounded-2xl bg-[#f5f7f1] p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#607b55] shadow-sm"><Search aria-hidden="true" className="h-5 w-5" /></span>
            <div><p className="font-semibold text-[#2f3a2f]">1. Choose and search</p><p className="mt-1 text-sm leading-6 text-[#647064]">Select a word type or theme, then search for the vocabulary you need.</p></div>
          </li>
          <li className="flex gap-4 rounded-2xl bg-[#f5f7f1] p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#607b55] shadow-sm"><Images aria-hidden="true" className="h-5 w-5" /></span>
            <div><p className="font-semibold text-[#2f3a2f]">2. Add flashcards</p><p className="mt-1 text-sm leading-6 text-[#647064]">Click a card to add it to the lesson tray at the top of this page.</p></div>
          </li>
          <li className="flex gap-4 rounded-2xl bg-[#f5f7f1] p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#607b55] shadow-sm"><BookOpen aria-hidden="true" className="h-5 w-5" /></span>
            <div><p className="font-semibold text-[#2f3a2f]">3. Teach or create</p><p className="mt-1 text-sm leading-6 text-[#647064]">Save the set, open Classroom mode, or reuse the same cards in worksheets, printables, games, and lesson plans.</p></div>
          </li>
        </ol>

        {preferenceError ? <p className="mt-4 text-sm font-medium text-[#a45d49]">{preferenceError}</p> : null}

        <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => void dismissGuidePermanently()}
            disabled={savingPreference}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-[#667260] transition hover:bg-[#eef2e9] disabled:opacity-60"
          >
            <EyeOff aria-hidden="true" className="h-4 w-4" />
            {savingPreference ? "Saving…" : "Don’t show this again"}
          </button>
          <button type="button" onClick={closeGuideForSession} className="btn btn-primary px-5 py-3">
            Start building flashcards
          </button>
        </div>
      </ModalShell>
    );
  }

  return null;
}
