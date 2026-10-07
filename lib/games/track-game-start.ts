"use client";

import { getAnalyticsAnonymousId, getAnalyticsSessionKey } from "@/lib/analytics/client";
import { hasAnalyticsConsent } from "@/lib/privacy/consent";
import { supabase } from "@/lib/supabase/client";

export async function trackGameStart(gameKey: string) {
  const cleanKey = String(gameKey ?? "").trim();
  if (!cleanKey || !hasAnalyticsConsent() || navigator.doNotTrack === "1") return;

  try {
    const { data } = await supabase.auth.getSession();
    await fetch("/api/games/track-play", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}) },
      body: JSON.stringify({ gameKey: cleanKey, sessionKey: getAnalyticsSessionKey(), anonymousId: getAnalyticsAnonymousId() }),
      keepalive: true,
    });
  } catch {
    // Ignore tracking failures so gameplay keeps moving.
  }
}
