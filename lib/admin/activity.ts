import "server-only";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

const EVENT_LIMIT = 1_000;

export type AdminActivityEvent = {
  id: string;
  sessionKey: string;
  userId: string | null;
  accountTier: string | null;
  eventType: string;
  title: string;
  detail: string | null;
  source: "Platform" | "Free Games";
  createdAt: string;
};

export type AdminActivitySession = {
  key: string;
  lastActivity: string;
  firstActivity: string;
  eventCount: number;
  userIds: string[];
  events: AdminActivityEvent[];
};

export type AdminActivitySnapshot = {
  periodDays: number | null;
  events: number;
  sessions: AdminActivitySession[];
  truncated: boolean;
};

type PlatformEventRow = {
  id: string;
  event_type: string;
  item_key: string | null;
  item_label: string | null;
  category: string | null;
  session_key: string | null;
  user_id: string | null;
  created_at: string;
};

type FreeGameEventRow = {
  id: string;
  event_type: string;
  game_key: string | null;
  topic_label: string | null;
  topic_category: string | null;
  account_tier: string;
  action: string | null;
  source: string | null;
  session_key: string | null;
  user_id: string | null;
  created_at: string;
};

const PLATFORM_TITLES: Record<string, string> = {
  vocabulary_search: "Searched vocabulary",
  flashcard_view: "Viewed a flashcard",
  worksheet_generated: "Generated a worksheet",
  flashcards_opened: "Opened Flashcards",
  classroom_opened: "Opened Classroom",
  lesson_pack_viewed: "Viewed a free lesson pack",
  lesson_pack_downloaded: "Downloaded a free lesson pack",
  premium_upgrade: "Started a Premium upgrade",
};

const FREE_GAME_TITLES: Record<string, string> = {
  hub_viewed: "Opened Free Games",
  game_selected: "Selected a game",
  topic_previewed: "Previewed a topic",
  topic_selected: "Selected a topic",
  game_started: "Started a game",
  meaningful_interaction: "Meaningfully interacted",
  game_completed: "Completed a game",
  another_game_selected: "Selected another game",
  another_topic_selected: "Selected another topic",
  use_own_vocabulary_clicked: "Selected own-vocabulary option",
  finish_action: "Used a finish-screen action",
  signup_started: "Started signup",
  signup_completed: "Completed signup",
};

function sessionKey(value: string | null, source: string, id: string) {
  return value || `event:${source.toLowerCase().replaceAll(" ", "-")}:${id}`;
}

function platformDetail(row: PlatformEventRow) {
  // Search terms can contain text entered by teachers, so never expose them in
  // this event explorer. The category is enough to make the activity useful.
  if (row.event_type === "vocabulary_search") {
    return row.category ? `Category: ${row.category}` : null;
  }
  if (row.event_type === "flashcard_view") {
    return row.category ? `Category: ${row.category}` : null;
  }
  if (row.event_type === "lesson_pack_viewed" || row.event_type === "lesson_pack_downloaded") {
    return row.item_label || row.item_key;
  }
  if (row.event_type === "worksheet_generated") return row.item_label;
  if (row.event_type === "classroom_opened" && row.item_key === "animals-demo") return "Animals Demo";
  return row.category;
}

export async function getAdminActivitySnapshot(periodDays: number | null): Promise<AdminActivitySnapshot> {
  const admin = getSupabaseAdmin();
  const since = periodDays
    ? new Date(Date.now() - periodDays * 86_400_000).toISOString()
    : null;

  const platformQuery = admin
    .from("analytics_events")
    .select("id,event_type,item_key,item_label,category,session_key,user_id,created_at")
    .order("created_at", { ascending: false })
    .limit(EVENT_LIMIT);
  const freeGamesQuery = admin
    .from("free_game_events")
    .select("id,event_type,game_key,topic_label,topic_category,account_tier,action,source,session_key,user_id,created_at")
    .order("created_at", { ascending: false })
    .limit(EVENT_LIMIT);
  if (since) {
    platformQuery.gte("created_at", since);
    freeGamesQuery.gte("created_at", since);
  }

  const [platformResult, freeGamesResult] = await Promise.all([platformQuery, freeGamesQuery]);
  if (platformResult.error) throw new Error(`Could not load platform activity: ${platformResult.error.message}`);
  if (freeGamesResult.error && !/free_game_events|relation/i.test(freeGamesResult.error.message)) {
    throw new Error(`Could not load Free Games activity: ${freeGamesResult.error.message}`);
  }

  const events: AdminActivityEvent[] = ((platformResult.data ?? []) as PlatformEventRow[]).map((row) => ({
    id: `platform:${row.id}`,
    sessionKey: sessionKey(row.session_key, "Platform", row.id),
    userId: row.user_id,
    accountTier: null,
    eventType: row.event_type,
    title: PLATFORM_TITLES[row.event_type] ?? "Platform activity",
    detail: platformDetail(row),
    source: "Platform",
    createdAt: row.created_at,
  }));

  for (const row of (freeGamesResult.data ?? []) as FreeGameEventRow[]) {
    const label = row.game_key?.replaceAll("-", " ");
    const context = [label, row.topic_label].filter(Boolean).join(" · ");
    events.push({
      id: `free-games:${row.id}`,
      sessionKey: sessionKey(row.session_key, "Free Games", row.id),
      userId: row.user_id,
      accountTier: row.account_tier,
      eventType: row.event_type,
      title: FREE_GAME_TITLES[row.event_type] ?? "Free Games activity",
      detail: [context, row.action?.replaceAll("_", " "), row.source?.replaceAll("_", " ")]
        .filter(Boolean)
        .join(" · ") || null,
      source: "Free Games",
      createdAt: row.created_at,
    });
  }

  events.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const grouped = new Map<string, AdminActivitySession>();
  for (const event of events) {
    const current = grouped.get(event.sessionKey);
    if (current) {
      current.events.push(event);
      current.eventCount += 1;
      if (event.userId && !current.userIds.includes(event.userId)) current.userIds.push(event.userId);
      if (event.createdAt < current.firstActivity) current.firstActivity = event.createdAt;
      continue;
    }
    grouped.set(event.sessionKey, {
      key: event.sessionKey,
      lastActivity: event.createdAt,
      firstActivity: event.createdAt,
      eventCount: 1,
      userIds: event.userId ? [event.userId] : [],
      events: [event],
    });
  }

  return {
    periodDays,
    events: events.length,
    sessions: [...grouped.values()].sort((a, b) => b.lastActivity.localeCompare(a.lastActivity)),
    truncated: platformResult.data?.length === EVENT_LIMIT || freeGamesResult.data?.length === EVENT_LIMIT,
  };
}
