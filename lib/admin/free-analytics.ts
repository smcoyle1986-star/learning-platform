import "server-only";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export type FreeAnalyticsItem = { label: string; category: string | null; count: number };
export type FreeAnalyticsSnapshot = {
  periodDays: number | null;
  summary: { hubViews: number; starts: number; completions: number; completionRate: number; demoStarts: number; ownVocabularyClicks: number };
  games: FreeAnalyticsItem[];
  topics: FreeAnalyticsItem[];
  accountTiers: FreeAnalyticsItem[];
  finishActions: FreeAnalyticsItem[];
  trend: { date: string; starts: number; completions: number }[];
};

type EventRow = { event_type: string; game_key: string | null; topic_label: string | null; topic_category: string | null; account_tier: string; action: string | null; session_key: string | null; created_at: string };

function ranked(rows: EventRow[], key: (row: EventRow) => string | null, category?: (row: EventRow) => string | null): FreeAnalyticsItem[] {
  const counts = new Map<string, FreeAnalyticsItem>();
  for (const row of rows) {
    const label = key(row);
    if (!label) continue;
    const existing = counts.get(label);
    if (existing) existing.count += 1;
    else counts.set(label, { label, category: category?.(row) ?? null, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export async function getFreeAnalyticsSnapshot(periodDays: number | null): Promise<FreeAnalyticsSnapshot> {
  const admin = getSupabaseAdmin();
  const since = periodDays ? new Date(Date.now() - periodDays * 86_400_000).toISOString() : null;
  const eventsQuery = admin.from("free_game_events").select("event_type,game_key,topic_label,topic_category,account_tier,action,session_key,created_at").order("created_at", { ascending: false }).limit(20_000);
  if (since) eventsQuery.gte("created_at", since);
  const demoQuery = admin.from("analytics_events").select("id,session_key").eq("event_type", "classroom_opened").eq("item_key", "animals-demo");
  if (since) demoQuery.gte("created_at", since);
  const [{ data, error }, { data: demoData, error: demoError }] = await Promise.all([eventsQuery, demoQuery]);
  if (error && !/free_game_events|relation/i.test(error.message)) throw new Error(`Could not load Free Games analytics: ${error.message}`);
  if (demoError) throw new Error(`Could not load Demo Lesson analytics: ${demoError.message}`);
  const rows = (data ?? []) as EventRow[];
  const starts = rows.filter((row) => row.event_type === "game_started");
  const completions = rows.filter((row) => row.event_type === "game_completed");
  const buckets = new Map<string, { date: string; starts: number; completions: number }>();
  for (const row of rows) {
    const date = row.created_at.slice(0, 10);
    const item = buckets.get(date) ?? { date, starts: 0, completions: 0 };
    if (row.event_type === "game_started") item.starts += 1;
    if (row.event_type === "game_completed") item.completions += 1;
    buckets.set(date, item);
  }
  return {
    periodDays,
    summary: {
      hubViews: rows.filter((row) => row.event_type === "hub_viewed").length,
      starts: starts.length,
      completions: completions.length,
      completionRate: starts.length ? Math.round((completions.length / starts.length) * 100) : 0,
      demoStarts: new Set((demoData ?? []).map((item) => item.session_key || item.id)).size,
      ownVocabularyClicks: rows.filter((row) => row.event_type === "finish_action" && row.action === "use_own_vocabulary").length,
    },
    games: ranked(starts, (row) => row.game_key),
    topics: ranked(starts, (row) => row.topic_label, (row) => row.topic_category),
    accountTiers: ranked(starts, (row) => row.account_tier),
    finishActions: ranked(rows.filter((row) => row.event_type === "finish_action"), (row) => row.action),
    trend: [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-30),
  };
}
