"use client";

import { supabase } from "@/lib/supabase/client";
import { getAnalyticsSessionKey } from "@/lib/analytics/client";
import { hasAnalyticsConsent } from "@/lib/privacy/consent";

export type FreeGameEventType =
  | "hub_viewed"
  | "game_selected"
  | "topic_previewed"
  | "topic_selected"
  | "game_started"
  | "game_completed"
  | "finish_action";

type FreeGameEvent = {
  eventType: FreeGameEventType;
  gameKey?: string;
  topicId?: string;
  topicLabel?: string;
  topicCategory?: string;
  source?: "public_topic" | "lesson_tray" | "custom_vocabulary";
  action?: "play_again" | "change_topic" | "change_game" | "use_own_vocabulary";
};

export async function trackFreeGameEvent(event: FreeGameEvent) {
  if (typeof window === "undefined" || navigator.doNotTrack === "1" || !hasAnalyticsConsent()) return;
  try {
    const { data } = await supabase.auth.getSession();
    await fetch("/api/games/free-analytics", {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
      },
      body: JSON.stringify({ ...event, sessionKey: getAnalyticsSessionKey() }),
    });
  } catch {
    // Analytics must never interrupt classroom play.
  }
}
