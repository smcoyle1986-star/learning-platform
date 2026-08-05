"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  OPEN_COOKIE_PREFERENCES_EVENT,
  readCookieConsent,
  saveCookieConsent,
} from "@/lib/privacy/consent";

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const revealIfNeeded = window.setTimeout(() => setVisible(!readCookieConsent()), 0);
    const open = () => setVisible(true);
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, open);
    return () => {
      window.clearTimeout(revealIfNeeded);
      window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, open);
    };
  }, []);

  const choose = (analytics: boolean) => {
    saveCookieConsent(analytics);
    if (!analytics) window.sessionStorage.removeItem("classendo-analytics-session");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      aria-label="Cookie preferences"
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-4xl rounded-[1.5rem] border border-[#d9e1d2] bg-white p-5 text-[#2f3a2f] shadow-[0_22px_70px_rgba(35,48,31,0.24)] sm:p-6"
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold">Your privacy choices</h2>
          <p className="mt-2 text-sm leading-6 text-[#5c665c]">
            Classendo uses necessary browser storage to sign you in and save work. With your permission, we also use
            limited product analytics to improve teaching tools. We do not use behavioural advertising.
          </p>
          <p className="mt-2 text-sm">
            <Link className="font-semibold underline underline-offset-4" href="/legal/cookies">Cookie policy</Link>
            <span aria-hidden="true"> · </span>
            <Link className="font-semibold underline underline-offset-4" href="/legal/privacy">Privacy notice</Link>
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col">
          <button type="button" onClick={() => choose(true)} className="btn btn-primary px-5 py-3">
            Accept analytics
          </button>
          <button type="button" onClick={() => choose(false)} className="btn btn-secondary px-5 py-3">
            Reject non-essential
          </button>
        </div>
      </div>
    </aside>
  );
}
