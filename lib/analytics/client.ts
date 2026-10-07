"use client";

import { supabase } from "@/lib/supabase/client";
import { hasAnalyticsConsent } from "@/lib/privacy/consent";

type AnalyticsEvent = {
  eventType:
    | "vocabulary_search"
    | "flashcard_view"
    | "worksheet_generated"
    | "flashcards_opened"
    | "classroom_opened"
    | "lesson_pack_viewed"
    | "lesson_pack_downloaded"
    | "dashboard_opened"
    | "onboarding_started"
    | "onboarding_completed"
    | "page_view";
  itemKey?: string;
  itemLabel: string;
  category?: string;
};

const SESSION_KEY = "classendo-analytics-session";
const ANONYMOUS_KEY = "classendo-analytics-anonymous-id";
const SESSION_LAST_USED_KEY = "classendo-analytics-session-last-used";
const SESSION_IDLE_MS = 30 * 60 * 1000;

export function getAnalyticsAnonymousId() {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return "";
  try {
    const existing = window.localStorage.getItem(ANONYMOUS_KEY);
    if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(ANONYMOUS_KEY, created);
    return created;
  } catch {
    return "";
  }
}

export function clearAnalyticsIdentity() {
  try {
    window.localStorage.removeItem(ANONYMOUS_KEY);
    window.sessionStorage.removeItem(SESSION_KEY);
    window.sessionStorage.removeItem(SESSION_LAST_USED_KEY);
    for (let index = window.sessionStorage.length - 1; index >= 0; index--) {
      const key = window.sessionStorage.key(index);
      if (key?.startsWith("classendo-free-game-event:") || key?.startsWith("classendo-free-game-actions:")) {
        window.sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Private browsing may block storage.
  }
}

export function getAnalyticsSessionKey() {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return "";
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    const lastUsed = Number(window.sessionStorage.getItem(SESSION_LAST_USED_KEY) ?? 0);
    window.sessionStorage.setItem(SESSION_LAST_USED_KEY, String(Date.now()));
    if (existing && /^[0-9a-f-]{36}$/i.test(existing) && lastUsed && Date.now() - lastUsed < SESSION_IDLE_MS) return existing;
    const created = crypto.randomUUID();
    window.sessionStorage.setItem(SESSION_KEY, created);
    return created;
  } catch {
    return "";
  }
}

export async function trackAnalyticsEvent(event: AnalyticsEvent) {
  if (typeof window === "undefined" || navigator.doNotTrack === "1" || !hasAnalyticsConsent()) return;
  try {
    const { data } = await supabase.auth.getSession();
    await fetch("/api/analytics/events", {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        ...(data.session?.access_token
          ? { Authorization: `Bearer ${data.session.access_token}` }
          : {}),
      },
      body: JSON.stringify({ ...event, sessionKey: getAnalyticsSessionKey(), anonymousId: getAnalyticsAnonymousId() }),
    });
  } catch {
    // Analytics must never interrupt a teaching workflow.
  }
}

/** Links a consented browser session to the signed-in UUID without exposing
 * profile data. This is intentionally separate from Vercel conversions. */
export async function trackAuthenticatedAnalyticsSession(reason: "signup" | "sign_in") {
  if (typeof window === "undefined" || navigator.doNotTrack === "1" || !hasAnalyticsConsent()) return;
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.access_token) return;
    await fetch("/api/analytics/session", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
      body: JSON.stringify({ sessionKey: getAnalyticsSessionKey(), anonymousId: getAnalyticsAnonymousId(), reason }),
    });
  } catch {
    // Analytics must never interrupt authentication.
  }
}
