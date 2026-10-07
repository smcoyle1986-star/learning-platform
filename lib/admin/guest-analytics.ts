import "server-only";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { readAdminAnalyticsRows } from "@/lib/admin/analytics-rows";

export type GuestListItem = {
  anonymousId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  sessions: number;
  lastCountryObserved: string | null;
  meaningful: boolean;
  linkedUserId: string | null;
  linkedUsername: string | null;
  linkedAt: string | null;
};

type Row = Record<string, unknown>;
type SessionRow = { session_key: string; first_seen_at: string; last_seen_at: string; guest_last_seen_at: string | null; first_country_observed: string | null; last_country_observed: string | null; guest_last_country_observed: string | null };
const value = (item: unknown) => typeof item === "string" ? item : null;

async function readGuestSessions(anonymousId: string) {
  const rows: SessionRow[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await getSupabaseAdmin().from("analytics_sessions")
      .select("session_key,first_seen_at,last_seen_at,guest_last_seen_at,first_country_observed,last_country_observed,guest_last_country_observed")
      .eq("anonymous_id", anonymousId).order("first_seen_at").order("session_key").range(offset, offset + 999);
    if (error) throw new Error(`Could not load guest sessions: ${error.message}`);
    rows.push(...((data ?? []) as SessionRow[]));
    if (!data || data.length < 1000) break;
  }
  return { data: rows, error: null };
}

export async function getAdminGuests(page = 1) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc("get_admin_analytics_guests", {
    page_size: 25, page_offset: (Math.max(1, page) - 1) * 25,
  });
  if (error) throw new Error(`Could not load guests: ${error.message}`);
  const result = (data ?? {}) as { total?: number; guests?: Row[] };
  return {
    total: Number(result.total ?? 0),
    guests: (result.guests ?? []).map((row): GuestListItem => ({
      anonymousId: String(row.anonymous_id),
      firstSeenAt: String(row.first_seen_at),
      lastSeenAt: String(row.last_seen_at),
      sessions: Number(row.sessions ?? 0),
      lastCountryObserved: value(row.last_country_observed),
      meaningful: row.meaningful === true,
      linkedUserId: value(row.linked_user_id),
      linkedUsername: value(row.linked_username),
      linkedAt: value(row.linked_at),
    })),
  };
}

export async function getGuestJourney(anonymousId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(anonymousId)) return null;
  const admin = getSupabaseAdmin();
  const [sessions, link, platform, freeGames, gamePlays] = await Promise.all([
    readGuestSessions(anonymousId),
    admin.from("analytics_anonymous_account_links").select("user_id,linked_at")
      .eq("anonymous_id", anonymousId).maybeSingle(),
    readAdminAnalyticsRows("analytics_events", "id,event_type,item_label,category,created_at,country_code", "anonymous_id", [anonymousId], { guestOnly: true }),
    readAdminAnalyticsRows("free_game_events", "id,event_type,game_key,topic_label,created_at,country_code", "anonymous_id", [anonymousId], { guestOnly: true }),
    readAdminAnalyticsRows("game_play_events", "id,game_key,created_at,country_code", "anonymous_id", [anonymousId], { guestOnly: true }),
  ]);
  const failed = [sessions, link, platform, freeGames, gamePlays].find((result) => result.error);
  if (failed?.error) throw new Error(`Could not load guest journey: ${failed.error.message}`);
  if (!sessions.data?.length) return null;
  const lastGuestSession = [...sessions.data].sort((a, b) => String(a.guest_last_seen_at ?? a.last_seen_at).localeCompare(String(b.guest_last_seen_at ?? b.last_seen_at))).at(-1);
  const linkedAt = link.data?.linked_at ?? null;
  const events = ([...(platform.data ?? []), ...(freeGames.data ?? []), ...(gamePlays.data ?? [])] as Row[])
    .filter((row) => !linkedAt || String(row.created_at) <= linkedAt)
    .map((row) => ({
      id: String(row.id),
      title: !row.event_type ? "Started game" : row.event_type === "page_view" ? "Viewed page" : String(row.event_type).replaceAll("_", " "),
      detail: [row.item_label ?? row.game_key, row.topic_label ?? row.category].filter(Boolean).join(" · ") || null,
      createdAt: String(row.created_at),
      countryObserved: value(row.country_code),
    }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return {
    anonymousId,
    firstSeenAt: String(sessions.data[0].first_seen_at),
    lastSeenAt: String(lastGuestSession?.guest_last_seen_at ?? lastGuestSession?.last_seen_at),
    sessions: sessions.data.length,
    firstCountryObserved: sessions.data.find((row) => row.first_country_observed)?.first_country_observed ?? null,
    lastCountryObserved: [...sessions.data].sort((a, b) => String(b.guest_last_seen_at ?? b.last_seen_at).localeCompare(String(a.guest_last_seen_at ?? a.last_seen_at))).find((row) => row.guest_last_country_observed)?.guest_last_country_observed ?? null,
    linkedUserId: link.data?.user_id ?? null,
    linkedAt,
    events,
  };
}
