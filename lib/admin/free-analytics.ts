import "server-only";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export type FreeAnalyticsItem = { label: string; category: string | null; count: number };
export type FreeAnalyticsBreakdownItem = FreeAnalyticsItem & {
  starts: number;
  interactions: number;
  completions: number;
  ownVocabularyClicks: number;
  signupStarts: number;
  signupCompletions: number;
};
export type FreeAnalyticsFunnelStage = {
  key: string;
  label: string;
  sessions: number;
  previousRate: number | null;
};

export type FreeAnalyticsSnapshot = {
  periodDays: number | null;
  summary: {
    hubSessions: number;
    starts: number;
    meaningfulInteractions: number;
    completions: number;
    signupStarts: number;
    signupCompletions: number;
    startRate: number;
    completionRate: number;
    signupRate: number;
    demoStarts: number;
    startedWithoutInteraction: number;
    interactedWithoutCompletion: number;
    anotherGames: number;
    anotherTopics: number;
    ownVocabularyClicks: number;
  };
  funnel: FreeAnalyticsFunnelStage[];
  conversionFunnel: FreeAnalyticsFunnelStage[];
  games: FreeAnalyticsBreakdownItem[];
  topics: FreeAnalyticsBreakdownItem[];
  campaigns: FreeAnalyticsBreakdownItem[];
  countries: FreeAnalyticsBreakdownItem[];
  devices: FreeAnalyticsBreakdownItem[];
  accountTiers: FreeAnalyticsItem[];
  finishActions: FreeAnalyticsItem[];
  trend: { date: string; starts: number; interactions: number; completions: number; signups: number }[];
};

type EventRow = {
  id: string;
  event_type: string;
  game_key: string | null;
  topic_id: string | null;
  topic_label: string | null;
  topic_category: string | null;
  account_tier: string;
  action: string | null;
  session_key: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer_host: string | null;
  landing_path: string | null;
  country_code: string | null;
  device_type: string | null;
  created_at: string;
};

const FUNNEL_STAGES = [
  { key: "hub", label: "Free Games hub", eventType: "hub_viewed" },
  { key: "game", label: "Game selected", eventType: "game_selected" },
  { key: "topic", label: "Topic selected", eventType: "topic_selected" },
  { key: "started", label: "Game started", eventType: "game_started" },
  { key: "interacted", label: "Meaningful interaction", eventType: "meaningful_interaction" },
  { key: "completed", label: "Game completed", eventType: "game_completed" },
] as const;

const CONVERSION_STAGES = [
  { key: "own-vocabulary", label: "Use your own vocabulary clicked", eventType: "use_own_vocabulary_clicked" },
  { key: "signup-started", label: "Signup started", eventType: "signup_started" },
  { key: "signup-completed", label: "Signup completed", eventType: "signup_completed" },
] as const;

function sessionId(row: EventRow) {
  return row.session_key || `event:${row.id}`;
}

function uniqueCount(rows: EventRow[]) {
  return new Set(rows.map(sessionId)).size;
}

function percent(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 100) : 0;
}

function ranked(rows: EventRow[], key: (row: EventRow) => string | null, category?: (row: EventRow) => string | null): FreeAnalyticsItem[] {
  const items = new Map<string, { category: string | null; sessions: Set<string> }>();
  for (const row of rows) {
    const label = key(row);
    if (!label) continue;
    const existing = items.get(label) ?? { category: category?.(row) ?? null, sessions: new Set<string>() };
    existing.sessions.add(sessionId(row));
    items.set(label, existing);
  }
  return [...items.entries()]
    .map(([label, value]) => ({ label, category: value.category, count: value.sessions.size }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function funnelBreakdown(rows: EventRow[], key: (row: EventRow) => string | null, category?: (row: EventRow) => string | null): FreeAnalyticsBreakdownItem[] {
  const stages = ["game_started", "meaningful_interaction", "game_completed", "use_own_vocabulary_clicked", "signup_started", "signup_completed"] as const;
  const items = new Map<string, { label: string; category: string | null; all: Set<string>; counts: Record<(typeof stages)[number], Set<string>> }>();
  for (const row of rows) {
    const label = key(row);
    if (!label) continue;
    const id = `${label}\u0000${category?.(row) ?? ""}`;
    const item = items.get(id) ?? {
      label,
      category: category?.(row) ?? null,
      all: new Set<string>(),
      counts: Object.fromEntries(stages.map((stage) => [stage, new Set<string>()])) as Record<(typeof stages)[number], Set<string>>,
    };
    const session = sessionId(row);
    item.all.add(session);
    if (stages.includes(row.event_type as (typeof stages)[number])) item.counts[row.event_type as (typeof stages)[number]].add(session);
    items.set(id, item);
  }
  return [...items.values()].map((item) => ({
    label: item.label,
    category: item.category,
    count: item.all.size,
    starts: item.counts.game_started.size,
    interactions: item.counts.meaningful_interaction.size,
    completions: item.counts.game_completed.size,
    ownVocabularyClicks: item.counts.use_own_vocabulary_clicked.size,
    signupStarts: item.counts.signup_started.size,
    signupCompletions: item.counts.signup_completed.size,
  })).sort((a, b) => b.starts - a.starts || b.count - a.count || a.label.localeCompare(b.label));
}

function campaignLabel(row: EventRow) {
  return row.utm_campaign || row.utm_source || row.referrer_host || "Direct / unknown";
}

function campaignDetail(row: EventRow) {
  const detail = row.utm_campaign
    ? [row.utm_source, row.utm_medium].filter(Boolean).join(" · ")
    : row.utm_medium || row.landing_path;
  return detail || null;
}

export async function getFreeAnalyticsSnapshot(periodDays: number | null): Promise<FreeAnalyticsSnapshot> {
  const admin = getSupabaseAdmin();
  const since = periodDays ? new Date(Date.now() - periodDays * 86_400_000).toISOString() : null;
  const eventsQuery = admin
    .from("free_game_events")
    .select("id,event_type,game_key,topic_id,topic_label,topic_category,account_tier,action,session_key,utm_source,utm_medium,utm_campaign,referrer_host,landing_path,country_code,device_type,created_at")
    .order("created_at", { ascending: false })
    .limit(20_000);
  if (since) eventsQuery.gte("created_at", since);

  const demoQuery = admin.from("analytics_events").select("id,session_key").eq("event_type", "classroom_opened").eq("item_key", "animals-demo");
  if (since) demoQuery.gte("created_at", since);

  const [{ data, error }, { data: demoData, error: demoError }] = await Promise.all([eventsQuery, demoQuery]);
  if (error && !/free_game_events|relation/i.test(error.message)) throw new Error(`Could not load Free Games analytics: ${error.message}`);
  if (demoError) throw new Error(`Could not load Demo Lesson analytics: ${demoError.message}`);

  const rows = (data ?? []) as EventRow[];
  const rowsFor = (eventType: string) => rows.filter((row) => row.event_type === eventType);
  const funnel = FUNNEL_STAGES.map((stage, index) => {
    const sessions = uniqueCount(rowsFor(stage.eventType));
    const previousSessions = index ? uniqueCount(rowsFor(FUNNEL_STAGES[index - 1].eventType)) : 0;
    return { key: stage.key, label: stage.label, sessions, previousRate: index ? percent(sessions, previousSessions) : null };
  });
  const conversionFunnel = CONVERSION_STAGES.map((stage, index) => {
    const sessions = uniqueCount(rowsFor(stage.eventType));
    const previousSessions = index ? uniqueCount(rowsFor(CONVERSION_STAGES[index - 1].eventType)) : 0;
    return { key: stage.key, label: stage.label, sessions, previousRate: index ? percent(sessions, previousSessions) : null };
  });
  const starts = funnel.find((stage) => stage.key === "started")?.sessions ?? 0;
  const meaningfulInteractions = funnel.find((stage) => stage.key === "interacted")?.sessions ?? 0;
  const completions = funnel.find((stage) => stage.key === "completed")?.sessions ?? 0;
  const signupStarts = conversionFunnel.find((stage) => stage.key === "signup-started")?.sessions ?? 0;
  const signupCompletions = conversionFunnel.find((stage) => stage.key === "signup-completed")?.sessions ?? 0;
  const hubSessions = funnel[0]?.sessions ?? 0;

  const contextId = (row: EventRow) => `${sessionId(row)}:${row.game_key ?? ""}:${row.topic_id ?? ""}`;
  const startedContexts = new Set(rowsFor("game_started").map(contextId));
  const interactionContexts = new Set(rowsFor("meaningful_interaction").map(contextId));
  const completedContexts = new Set(rowsFor("game_completed").map(contextId));
  const startedWithoutInteraction = [...startedContexts].filter((id) => !interactionContexts.has(id)).length;
  const interactedWithoutCompletion = [...interactionContexts].filter((id) => !completedContexts.has(id)).length;

  const buckets = new Map<string, { date: string; starts: Set<string>; interactions: Set<string>; completions: Set<string>; signups: Set<string> }>();
  for (const row of rows) {
    const date = row.created_at.slice(0, 10);
    const item = buckets.get(date) ?? { date, starts: new Set<string>(), interactions: new Set<string>(), completions: new Set<string>(), signups: new Set<string>() };
    if (row.event_type === "game_started") item.starts.add(sessionId(row));
    if (row.event_type === "meaningful_interaction") item.interactions.add(sessionId(row));
    if (row.event_type === "game_completed") item.completions.add(sessionId(row));
    if (row.event_type === "signup_completed") item.signups.add(sessionId(row));
    buckets.set(date, item);
  }

  return {
    periodDays,
    summary: {
      hubSessions,
      starts,
      meaningfulInteractions,
      completions,
      signupStarts,
      signupCompletions,
      startRate: percent(starts, hubSessions),
      completionRate: percent(completions, meaningfulInteractions),
      signupRate: percent(signupCompletions, signupStarts),
      demoStarts: new Set((demoData ?? []).map((item) => item.session_key || item.id)).size,
      startedWithoutInteraction,
      interactedWithoutCompletion,
      anotherGames: uniqueCount(rowsFor("another_game_selected")),
      anotherTopics: uniqueCount(rowsFor("another_topic_selected")),
      ownVocabularyClicks: uniqueCount(rowsFor("use_own_vocabulary_clicked")),
    },
    funnel,
    conversionFunnel,
    games: funnelBreakdown(rows, (row) => row.game_key),
    topics: funnelBreakdown(rows, (row) => row.topic_label, (row) => row.topic_category),
    campaigns: funnelBreakdown(rows, campaignLabel, campaignDetail),
    countries: funnelBreakdown(rows, (row) => row.country_code || "Unknown country"),
    devices: funnelBreakdown(rows, (row) => row.device_type || "Unknown device"),
    accountTiers: ranked(rowsFor("game_started"), (row) => row.account_tier),
    finishActions: ranked(rowsFor("finish_action"), (row) => row.action),
    trend: [...buckets.values()]
      .map((item) => ({ date: item.date, starts: item.starts.size, interactions: item.interactions.size, completions: item.completions.size, signups: item.signups.size }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30),
  };
}
