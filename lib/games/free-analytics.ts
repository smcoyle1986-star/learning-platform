"use client";

import { supabase } from "@/lib/supabase/client";
import { getAnalyticsSessionKey } from "@/lib/analytics/client";
import { readSignupAttribution } from "@/lib/analytics/attribution";
import { hasAnalyticsConsent } from "@/lib/privacy/consent";

export type FreeGameEventType =
  | "hub_viewed"
  | "game_selected"
  | "topic_previewed"
  | "topic_selected"
  | "game_started"
  | "meaningful_interaction"
  | "game_completed"
  | "another_game_selected"
  | "another_topic_selected"
  | "use_own_vocabulary_clicked"
  | "finish_action"
  | "signup_started"
  | "signup_completed";

const SINGLETON_EVENTS = new Set<FreeGameEventType>([
  "hub_viewed",
  "game_selected",
  "topic_selected",
  "game_started",
  "meaningful_interaction",
  "game_completed",
  "another_game_selected",
  "another_topic_selected",
  "use_own_vocabulary_clicked",
  "signup_started",
  "signup_completed",
]);
const SESSION_DEDUPE_PREFIX = "classendo-free-game-event";

type FreeGameEvent = {
  eventType: FreeGameEventType;
  gameKey?: string;
  topicId?: string;
  topicLabel?: string;
  topicCategory?: string;
  source?: "public_topic" | "lesson_tray" | "custom_vocabulary" | "free_games";
  action?: "play_again" | "change_topic" | "change_game" | "use_own_vocabulary" | "create_account";
};

const SELECTION_HISTORY_KEY = `${SESSION_DEDUPE_PREFIX}:selection-history`;

function readSelectionHistory() {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(SELECTION_HISTORY_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function rememberSelection(event: FreeGameEvent) {
  const selection = event.eventType === "game_selected" ? `game:${event.gameKey ?? ""}`
    : event.eventType === "topic_selected" ? `topic:${event.topicId ?? ""}` : "";
  if (!selection || selection.endsWith(":")) return false;
  const history = readSelectionHistory();
  const another = history.some((item) => item.startsWith(`${selection.split(":")[0]}:`) && item !== selection);
  if (!history.includes(selection)) {
    try { window.sessionStorage.setItem(SELECTION_HISTORY_KEY, JSON.stringify([...history, selection].slice(-40))); } catch {}
  }
  return another;
}

export type FreeGamesSignupContext = {
  gameKey: string;
  topicId?: string;
};

export function freeGamesSignupUrl(nextPath: string, context: FreeGamesSignupContext) {
  const params = new URLSearchParams({ next: nextPath, from: "free-games", game: context.gameKey });
  if (context.topicId) params.set("topic", context.topicId);
  return `/signup?${params.toString()}`;
}

function sessionEventKey(event: FreeGameEvent) {
  return [
    SESSION_DEDUPE_PREFIX,
    event.eventType,
    event.gameKey ?? "",
    event.topicId ?? "",
    event.source ?? "",
    event.action ?? "",
  ].join(":");
}

function wasTrackedInThisSession(event: FreeGameEvent, sessionKey: string) {
  if (!sessionKey || !SINGLETON_EVENTS.has(event.eventType)) return false;
  try {
    return Boolean(window.sessionStorage.getItem(sessionEventKey(event)));
  } catch {
    // The server independently deduplicates the event when storage is unavailable.
  }
  return false;
}

function markTrackedInThisSession(event: FreeGameEvent, sessionKey: string) {
  if (!sessionKey || !SINGLETON_EVENTS.has(event.eventType)) return;
  try {
    window.sessionStorage.setItem(sessionEventKey(event), "1");
  } catch {
    // The server independently deduplicates the event when storage is unavailable.
  }
}

export async function trackFreeGameEvent(event: FreeGameEvent) {
  if (typeof window === "undefined" || navigator.doNotTrack === "1" || !hasAnalyticsConsent()) return;
  try {
    const sessionKey = getAnalyticsSessionKey();
    if (wasTrackedInThisSession(event, sessionKey)) return;
    const isAnotherSelection = rememberSelection(event);
    const { data } = await supabase.auth.getSession();
    const response = await fetch("/api/games/free-analytics", {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
      },
      body: JSON.stringify({ ...event, sessionKey, attribution: readSignupAttribution() }),
    });
    if (response.ok) markTrackedInThisSession(event, sessionKey);
    if (response.ok && isAnotherSelection) {
      await trackFreeGameEvent({
        ...event,
        eventType: event.eventType === "game_selected" ? "another_game_selected" : "another_topic_selected",
      });
    }
  } catch {
    // Analytics must never interrupt classroom play.
  }
}

export function trackUseOwnVocabularyClick(event: Omit<FreeGameEvent, "eventType">) {
  return trackFreeGameEvent({ ...event, eventType: "use_own_vocabulary_clicked" });
}
