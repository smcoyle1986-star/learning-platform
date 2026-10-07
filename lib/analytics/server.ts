import "server-only";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export type AnalyticsLifecycleEvent =
  | "account_created"
  | "email_verified"
  | "premium_trial_activated"
  | "authenticated_session_started";

const SESSION_KEY = /^[a-z0-9-]{1,80}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validAnalyticsSessionKey(value: unknown) {
  return typeof value === "string" && SESSION_KEY.test(value) ? value : null;
}

export function validAnalyticsAnonymousId(value: unknown) {
  return typeof value === "string" && UUID.test(value) ? value : null;
}

export function observedCountry(request: Request) {
  // Only the deployment proxy's geolocation header is used. A missing header
  // stays unknown; this is an IP-based estimate, not a physical location.
  if (process.env.VERCEL !== "1") return null;
  const value = request.headers.get("x-vercel-ip-country")?.toUpperCase() ?? "";
  return /^[A-Z]{2}$/.test(value) ? value : null;
}

export async function observeAnalyticsSession(input: {
  sessionKey: unknown;
  anonymousId?: unknown;
  userId?: string | null;
  country?: string | null;
}) {
  const sessionKey = validAnalyticsSessionKey(input.sessionKey);
  if (!sessionKey) return;
  const { error } = await getSupabaseAdmin().rpc("record_analytics_session", {
    p_session_key: sessionKey,
    p_anonymous_id: validAnalyticsAnonymousId(input.anonymousId),
    p_user_id: input.userId ?? null,
    p_country: input.country ?? null,
  });
  if (error) throw error;
}

export async function linkAnalyticsAnonymousIdToAccount(input: {
  userId: string;
  anonymousId: unknown;
  reason: "signup" | "sign_in";
}) {
  const anonymousId = validAnalyticsAnonymousId(input.anonymousId);
  if (!anonymousId) return;
  const { data: previousGuestSession, error: lookupError } = await getSupabaseAdmin()
    .from("analytics_sessions").select("session_key")
    .eq("anonymous_id", anonymousId).is("user_id", null).limit(1).maybeSingle();
  if (lookupError) throw lookupError;
  if (!previousGuestSession) return;
  const { error } = await getSupabaseAdmin().from("analytics_anonymous_account_links").insert({
    anonymous_id: anonymousId,
    user_id: input.userId,
    link_reason: input.reason,
  });
  if (error && error.code !== "23505") throw error;
}

export async function recordAnalyticsLifecycleEvent({
  userId,
  eventType,
  eventKey,
  sessionKey,
}: {
  userId: string;
  eventType: AnalyticsLifecycleEvent;
  eventKey: string;
  sessionKey?: string | null;
}) {
  const { error } = await getSupabaseAdmin().from("analytics_lifecycle_events").insert({
    user_id: userId,
    event_type: eventType,
    event_key: eventKey,
    session_key: validAnalyticsSessionKey(sessionKey) ?? null,
  });
  if (error && error.code !== "23505") throw error;
}

export async function linkAnalyticsSessionToAccount({
  userId,
  sessionKey,
  reason,
  anonymousId,
}: {
  userId: string;
  sessionKey: unknown;
  reason: "signup" | "sign_in";
  anonymousId?: unknown;
}) {
  const safeSessionKey = validAnalyticsSessionKey(sessionKey);
  if (!safeSessionKey) return false;
  const admin = getSupabaseAdmin();
  const [{ data: session, error: sessionError }, { data: existingLink, error: linkError }] = await Promise.all([
    admin.from("analytics_sessions").select("anonymous_id,user_id").eq("session_key", safeSessionKey).maybeSingle(),
    admin.from("analytics_session_account_links").select("user_id").eq("session_key", safeSessionKey).limit(1).maybeSingle(),
  ]);
  if (sessionError || linkError) throw sessionError ?? linkError;
  if (existingLink && existingLink.user_id !== userId) return false;
  if (session?.user_id && session.user_id !== userId) return false;
  if (session?.anonymous_id && session.anonymous_id !== validAnalyticsAnonymousId(anonymousId)) return false;
  const { error } = await getSupabaseAdmin().from("analytics_session_account_links").insert({
    user_id: userId,
    session_key: safeSessionKey,
    link_reason: reason,
  });
  if (error && error.code !== "23505") throw error;
  return true;
}
