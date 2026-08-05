"use client";

import { supabase } from "@/lib/supabase/client";
import { hasAnalyticsConsent } from "@/lib/privacy/consent";

type AnalyticsEvent = {
  eventType: "vocabulary_search" | "flashcard_view" | "worksheet_generated";
  itemKey?: string;
  itemLabel: string;
  category?: string;
};

const SESSION_KEY = "classendo-analytics-session";

function analyticsSessionKey() {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
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
      body: JSON.stringify({ ...event, sessionKey: analyticsSessionKey() }),
    });
  } catch {
    // Analytics must never interrupt a teaching workflow.
  }
}
