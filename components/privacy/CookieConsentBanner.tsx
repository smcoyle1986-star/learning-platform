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
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const revealIfNeeded = window.setTimeout(() => setVisible(!readCookieConsent()), 0);
    const open = () => setVisible(true);
    window.addEventListener(OPEN_COOKIE_PREFERENCES_EVENT, open);
    return () => {
      window.clearTimeout(revealIfNeeded);
      window.removeEventListener(OPEN_COOKIE_PREFERENCES_EVENT, open);
    };
  }, []);

  useEffect(() => {
    const updateFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    updateFullscreenState();
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (visible && !isFullscreen) {
      root.dataset.cookieConsentBanner = "visible";
    } else {
      delete root.dataset.cookieConsentBanner;
    }

    return () => {
      delete root.dataset.cookieConsentBanner;
    };
  }, [visible, isFullscreen]);

  const choose = (analytics: boolean) => {
    saveCookieConsent(analytics);
    if (!analytics) window.sessionStorage.removeItem("classendo-analytics-session");
    setVisible(false);
  };

  if (!visible || isFullscreen) return null;

  return (
    <aside
      aria-label="Cookie preferences"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-2xl border border-[#d9e1d2] bg-white p-3.5 text-[#2f3a2f] shadow-[0_18px_48px_rgba(35,48,31,0.22)] sm:p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <h2 className="text-base font-semibold">Your privacy choices</h2>
          <p className="mt-1 text-xs leading-5 text-[#5c665c]">
            Necessary storage keeps Classendo working. Optional analytics helps us improve it; we do not use behavioural advertising.
          </p>
          <p className="mt-1 text-xs">
            <Link className="font-semibold underline underline-offset-4" href="/legal/cookies">Cookie policy</Link>
            <span aria-hidden="true"> · </span>
            <Link className="font-semibold underline underline-offset-4" href="/legal/privacy">Privacy notice</Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => choose(true)} className="btn btn-primary px-3 py-2 text-xs">
            Accept analytics
          </button>
          <button type="button" onClick={() => choose(false)} className="btn btn-secondary px-3 py-2 text-xs">
            Reject non-essential
          </button>
        </div>
      </div>
    </aside>
  );
}
