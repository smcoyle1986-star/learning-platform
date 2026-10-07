import "server-only";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getAdminUserDetail, getAdminUsers } from "@/lib/admin/users";
import { readAdminAnalyticsRows } from "@/lib/admin/analytics-rows";

type EventSource = "account" | "guest" | "lifecycle" | "platform" | "free_games" | "resource";

export type AuthenticatedAnalyticsUser = {
  id: string;
  label: string;
  email: string | null;
  userType: string | null;
  countryRegion: string | null;
  signupCountryObserved: string | null;
  lastCountryObserved: string | null;
  createdAt: string;
  emailVerifiedAt: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialStatus: string;
  firstSeenAt: string | null;
  lastActiveAt: string | null;
  sessions: number;
  meaningfulEvents: number;
  acquisitionSource: string;
};

export type AnalyticsTimelineEvent = {
  id: string;
  title: string;
  detail: string | null;
  createdAt: string;
  source: EventSource;
  sessionKey: string | null;
};

export type AuthenticatedAnalyticsTimeline = {
  user: { id: string; label: string; email: string | null; createdAt: string; userType: string | null; countryRegion: string | null; signupCountryObserved: string | null; lastCountryObserved: string | null };
  emailVerifiedAt: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  acquisition: Record<string, string | null>;
  sessions: number;
  events: AnalyticsTimelineEvent[];
};

const PLATFORM_TITLES: Record<string, string> = {
  page_view: "Viewed page",
  vocabulary_search: "Searched vocabulary",
  flashcard_view: "Viewed a flashcard",
  worksheet_generated: "Generated a worksheet",
  flashcards_opened: "Opened Flashcards",
  classroom_opened: "Opened Classroom",
  lesson_pack_viewed: "Viewed a free lesson pack",
  lesson_pack_downloaded: "Downloaded a free lesson pack",
  premium_upgrade: "Started a Premium upgrade",
  dashboard_opened: "Opened dashboard",
  onboarding_started: "Started onboarding",
  onboarding_completed: "Completed onboarding",
  lesson_set_created: "Created lesson set",
  lesson_set_saved: "Saved lesson set",
  worksheet_saved: "Saved worksheet",
};

const FREE_GAME_TITLES: Record<string, string> = {
  hub_viewed: "Opened Free Games",
  game_selected: "Selected a game",
  topic_previewed: "Previewed a topic",
  topic_selected: "Selected a topic",
  game_started: "Started a game",
  meaningful_interaction: "Meaningfully interacted with a game",
  game_completed: "Completed a game",
  another_game_selected: "Selected another game",
  another_topic_selected: "Selected another topic",
  use_own_vocabulary_clicked: "Selected own vocabulary",
  finish_action: "Used a game finish action",
  signup_started: "Started signup",
  signup_completed: "Created account from Free Games",
};

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function labelFor(user: { username: string | null; displayName: string | null; email: string | null; id: string }) {
  return user.username || user.displayName || "Unnamed account";
}

function maxDate(values: Array<string | null | undefined>) {
  return values.filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
}

function acquisitionLabel(row: Record<string, unknown> | undefined) {
  if (!row) return "Unknown";
  return text(row.utm_source) || text(row.referrer_host) || "Unknown";
}

async function rowsForUsers(table: string, columns: string, userIds: string[]) {
  if (!userIds.length) return [];
  const { data, error } = await getSupabaseAdmin().from(table).select(columns).in("user_id", userIds);
  if (error) throw new Error(`Could not load authenticated analytics: ${error.message}`);
  const raw = data as unknown;
  return Array.isArray(raw) ? raw as Array<Record<string, unknown>> : [];
}

export async function getAuthenticatedAnalyticsUsers(params: { page?: number; query?: string } = {}) {
  const directory = await getAdminUsers({ query: params.query, page: params.page });
  const ids = directory.users.map((user) => user.id);
  const [countries, subscriptions, attributionRows, activityResult, authFieldsResult] = await Promise.all([
    rowsForUsers("analytics_account_countries", "user_id,signup_country_observed,last_country_observed", ids),
    rowsForUsers("user_subscriptions", "user_id,premium_trial_started_at,premium_trial_ends_at", ids),
    rowsForUsers("signup_attributions", "user_id,utm_source,referrer_host", ids),
    ids.length ? getSupabaseAdmin().rpc("get_admin_user_activity", { p_user_ids: ids }) : Promise.resolve({ data: [], error: null }),
    ids.length ? getSupabaseAdmin().rpc("get_admin_account_auth_fields", { p_user_ids: ids }) : Promise.resolve({ data: [], error: null }),
  ]);
  if (activityResult.error) throw new Error(`Could not load user activity: ${activityResult.error.message}`);
  if (authFieldsResult.error) throw new Error(`Could not load verification status: ${authFieldsResult.error.message}`);
  const { data: profileData, error: profileError } = ids.length
    ? await getSupabaseAdmin().from("profiles").select("id,username,user_type,country_region").in("id", ids)
    : { data: [], error: null };
  if (profileError) throw new Error(`Could not load profile types: ${profileError.message}`);
  const profileRows = (profileData ?? []) as Array<Record<string, unknown>>;
  const activity = Array.isArray(activityResult.data) ? activityResult.data as Array<Record<string, unknown>> : [];
  const authFields = Array.isArray(authFieldsResult.data) ? authFieldsResult.data as Array<Record<string, unknown>> : [];

  return {
    total: directory.total,
    page: Math.max(1, Math.floor(params.page ?? 1)),
    users: directory.users.map((user) => {
      const profile = profileRows.find((item) => item.id === user.id);
      const country = countries.find((item) => item.user_id === user.id);
      const subscription = subscriptions.find((item) => item.user_id === user.id);
      const verification = authFields.find((item) => item.user_id === user.id);
      const attribution = attributionRows.find((item) => item.user_id === user.id);
      const usage = activity.find((item) => item.user_id === user.id);
      const trialStartedAt = text(subscription?.premium_trial_started_at);
      const trialEndsAt = text(subscription?.premium_trial_ends_at);
      return {
        id: user.id,
        label: labelFor(user),
        email: user.email,
        userType: text(profile?.user_type),
        countryRegion: text(profile?.country_region),
        signupCountryObserved: text(country?.signup_country_observed),
        lastCountryObserved: text(country?.last_country_observed),
        createdAt: user.createdAt,
        emailVerifiedAt: text(verification?.email_verified_at),
        trialStartedAt,
        trialEndsAt,
        trialStatus: !trialStartedAt ? "Not started" : trialEndsAt && new Date(trialEndsAt).getTime() > Date.now() ? "Active" : "Ended",
        firstSeenAt: text(usage?.first_seen_at) ?? user.createdAt,
        lastActiveAt: maxDate([user.lastSignInAt, text(usage?.last_event_at)]),
        sessions: Number(usage?.sessions ?? 0),
        meaningfulEvents: Number(usage?.meaningful_events ?? 0),
        acquisitionSource: acquisitionLabel(attribution),
      } satisfies AuthenticatedAnalyticsUser;
    }),
  };
}

function platformEvent(row: Record<string, unknown>, source: EventSource, guest = false): AnalyticsTimelineEvent {
  const eventType = String(row.event_type ?? "");
  const game = text(row.game_key)?.replaceAll("-", " ") ?? null;
  const topic = text(row.topic_label);
  const detail = source === "free_games"
    ? [game, topic].filter(Boolean).join(" · ") || null
    : eventType === "vocabulary_search" || eventType === "flashcard_view"
      ? text(row.category) ? `Category: ${text(row.category)}` : null
      : text(row.item_label) || text(row.category);
  return {
    id: `${source}:${String(row.id)}`,
    title: source === "free_games" ? FREE_GAME_TITLES[eventType] ?? "Free Games activity" : PLATFORM_TITLES[eventType] ?? "Classendo activity",
    detail,
    createdAt: String(row.created_at),
    source: guest ? "guest" : source,
    sessionKey: text(row.session_key),
  };
}

export async function getAuthenticatedAnalyticsTimeline(userId: string): Promise<AuthenticatedAnalyticsTimeline | null> {
  const detail = await getAdminUserDetail(userId);
  if (!detail) return null;
  const admin = getSupabaseAdmin();
  const [platformResult, freeResult, gamePlaysResult, lifecycleResult, linksResult, attributionResult, verificationResult, subscriptionResult, lessonsResult, worksheetsResult, countryResult, anonymousLinksResult] = await Promise.all([
    readAdminAnalyticsRows("analytics_events", "id,event_type,item_key,item_label,category,session_key,created_at", "user_id", [userId]),
    readAdminAnalyticsRows("free_game_events", "id,event_type,game_key,topic_label,session_key,created_at", "user_id", [userId]),
    readAdminAnalyticsRows("game_play_events", "id,game_key,session_key,created_at", "user_id", [userId]),
    readAdminAnalyticsRows("analytics_lifecycle_events", "id,event_type,session_key,created_at", "user_id", [userId]),
    readAdminAnalyticsRows("analytics_session_account_links", "session_key,linked_at,link_reason", "user_id", [userId], { orderColumn: "linked_at" }),
    admin.from("signup_attributions").select("utm_source,utm_medium,utm_campaign,utm_content,utm_term,referrer_host,landing_path").eq("user_id", userId).maybeSingle(),
    admin.rpc("get_admin_account_auth_fields", { p_user_ids: [userId] }),
    admin.from("user_subscriptions").select("premium_trial_started_at,premium_trial_ends_at").eq("user_id", userId).maybeSingle(),
    readAdminAnalyticsRows("lesson_sets", "id,created_at", "user_id", [userId]),
    readAdminAnalyticsRows("worksheets", "id,created_at,worksheet_type", "user_id", [userId]),
    admin.from("analytics_account_countries").select("signup_country_observed,last_country_observed").eq("user_id", userId).maybeSingle(),
    admin.from("analytics_anonymous_account_links").select("anonymous_id,linked_at,link_reason").eq("user_id", userId),
  ]);
  const results = [platformResult, freeResult, gamePlaysResult, lifecycleResult, linksResult, attributionResult, verificationResult, subscriptionResult, lessonsResult, worksheetsResult, countryResult, anonymousLinksResult];
  const failed = results.find((result) => result.error);
  if (failed?.error) throw new Error(`Could not load user analytics: ${failed.error.message}`);

  const links = (linksResult.data ?? []) as Array<Record<string, unknown>>;
  const anonymousLinks = (anonymousLinksResult.data ?? []) as Array<Record<string, unknown>>;
  const linkedAt = new Map(links.map((link) => [String(link.session_key), String(link.linked_at)]));
  const linkedSessions = [...linkedAt.keys()];
  const [guestPlatformResult, guestFreeResult, sessionLinksResult] = linkedSessions.length
    ? await Promise.all([
        readAdminAnalyticsRows("analytics_events", "id,event_type,item_label,category,session_key,created_at", "session_key", linkedSessions, { guestOnly: true }),
        readAdminAnalyticsRows("free_game_events", "id,event_type,game_key,topic_label,session_key,created_at", "session_key", linkedSessions, { guestOnly: true }),
        readAdminAnalyticsRows("analytics_session_account_links", "session_key,user_id,linked_at", "session_key", linkedSessions, { orderColumn: "linked_at" }),
      ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  if (guestPlatformResult.error || guestFreeResult.error || sessionLinksResult.error) throw new Error("Could not load linked guest activity.");
  const anonymousIds = anonymousLinks.map((link) => String(link.anonymous_id));
  const [anonymousPlatformResult, anonymousFreeResult, anonymousGameResult] = anonymousIds.length
    ? await Promise.all([
        readAdminAnalyticsRows("analytics_events", "id,event_type,item_label,category,session_key,anonymous_id,created_at", "anonymous_id", anonymousIds, { guestOnly: true }),
        readAdminAnalyticsRows("free_game_events", "id,event_type,game_key,topic_label,session_key,anonymous_id,created_at", "anonymous_id", anonymousIds, { guestOnly: true }),
        readAdminAnalyticsRows("game_play_events", "id,game_key,session_key,anonymous_id,created_at", "anonymous_id", anonymousIds, { guestOnly: true }),
      ])
    : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  if (anonymousPlatformResult.error || anonymousFreeResult.error || anonymousGameResult.error) throw new Error("Could not load anonymous activity.");
  const firstLinkedAccountBySession = new Map<string, string>();
  const firstLinkTimeBySession = new Map<string, string>();
  for (const link of (sessionLinksResult.data ?? []) as Array<Record<string, unknown>>) {
    const key = String(link.session_key);
    const linkedAt = String(link.linked_at);
    if (!firstLinkTimeBySession.has(key) || linkedAt < String(firstLinkTimeBySession.get(key))) {
      firstLinkTimeBySession.set(key, linkedAt);
      firstLinkedAccountBySession.set(key, String(link.user_id));
    }
  }

  const events: AnalyticsTimelineEvent[] = [];
  for (const row of (lifecycleResult.data ?? []) as Array<Record<string, unknown>>) {
    const type = String(row.event_type);
    events.push({
      id: `lifecycle:${String(row.id)}`,
      title: ({ account_created: "Account created", email_verified: "Email verified", premium_trial_activated: "Premium trial activated", authenticated_session_started: "Authenticated session started" } as Record<string, string>)[type] ?? "Account lifecycle",
      detail: null,
      createdAt: String(row.created_at),
      source: "lifecycle",
      sessionKey: text(row.session_key),
    });
  }
  const recordedLessonIds = new Set<string>();
  const recordedWorksheetIds = new Set<string>();
  for (const row of (platformResult.data ?? []) as Array<Record<string, unknown>>) {
    if (["lesson_set_created", "lesson_set_saved"].includes(String(row.event_type))) recordedLessonIds.add(String(row.item_key));
    if (String(row.event_type) === "worksheet_saved") recordedWorksheetIds.add(String(row.item_key));
    events.push(platformEvent(row, "platform"));
  }
  for (const row of (freeResult.data ?? []) as Array<Record<string, unknown>>) events.push(platformEvent(row, "free_games"));
  for (const row of (gamePlaysResult.data ?? []) as Array<Record<string, unknown>>) events.push({ id: `game-play:${String(row.id)}`, title: "Started game", detail: text(row.game_key)?.replaceAll("-", " ") ?? null, createdAt: String(row.created_at), source: "free_games", sessionKey: text(row.session_key) });
  for (const row of (lessonsResult.data ?? []) as Array<Record<string, unknown>>) {
    if (!recordedLessonIds.has(String(row.id))) events.push({ id: `lesson:${String(row.id)}`, title: "Saved lesson set", detail: null, createdAt: String(row.created_at), source: "resource", sessionKey: null });
  }
  for (const row of (worksheetsResult.data ?? []) as Array<Record<string, unknown>>) {
    if (!recordedWorksheetIds.has(String(row.id))) events.push({ id: `worksheet:${String(row.id)}`, title: "Saved worksheet", detail: text(row.worksheet_type), createdAt: String(row.created_at), source: "resource", sessionKey: null });
  }
  for (const row of [...(guestPlatformResult.data ?? []), ...(guestFreeResult.data ?? [])] as Array<Record<string, unknown>>) {
    const linked = linkedAt.get(String(row.session_key));
    if (linked && firstLinkedAccountBySession.get(String(row.session_key)) === userId && String(row.created_at) <= linked) {
      events.push(platformEvent(row, row.game_key ? "free_games" : "platform", true));
    }
  }
  const includedGuestEvents = new Set(events.filter((event) => event.source === "guest").map((event) => event.id));
  const anonymousLinkedAt = new Map(anonymousLinks.map((link) => [String(link.anonymous_id), String(link.linked_at)]));
  for (const row of [...(anonymousPlatformResult.data ?? []), ...(anonymousFreeResult.data ?? [])] as Array<Record<string, unknown>>) {
    const linked = anonymousLinkedAt.get(String(row.anonymous_id));
    if (!linked || String(row.created_at) > linked) continue;
    const event = platformEvent(row, row.game_key ? "free_games" : "platform", true);
    if (!includedGuestEvents.has(event.id)) { events.push(event); includedGuestEvents.add(event.id); }
  }
  for (const row of (anonymousGameResult.data ?? []) as Array<Record<string, unknown>>) {
    const linked = anonymousLinkedAt.get(String(row.anonymous_id));
    if (linked && String(row.created_at) <= linked) events.push({ id: `guest-game:${String(row.id)}`, title: "Started game", detail: text(row.game_key)?.replaceAll("-", " ") ?? null, createdAt: String(row.created_at), source: "guest", sessionKey: text(row.session_key) });
  }
  for (const link of anonymousLinks) events.push({ id: `anonymous-link:${String(link.anonymous_id)}`, title: "Guest linked to account", detail: null, createdAt: String(link.linked_at), source: "lifecycle", sessionKey: null });
  if (!events.some((event) => event.title === "Account created")) {
    events.push({ id: `account:${userId}`, title: "Account created", detail: null, createdAt: detail.createdAt, source: "account", sessionKey: null });
  }
  const verification = (Array.isArray(verificationResult.data) ? verificationResult.data[0] : null) as Record<string, unknown> | null;
  if (text(verification?.email_verified_at) && !events.some((event) => event.title === "Email verified")) {
    events.push({ id: `verification:${userId}`, title: "Email verified", detail: null, createdAt: String(verification?.email_verified_at), source: "lifecycle", sessionKey: null });
  }
  const subscription = subscriptionResult.data as Record<string, unknown> | null;
  const country = countryResult.data as Record<string, unknown> | null;
  if (text(subscription?.premium_trial_started_at) && !events.some((event) => event.title === "Premium trial activated")) {
    events.push({ id: `trial:${userId}`, title: "Premium trial activated", detail: null, createdAt: String(subscription?.premium_trial_started_at), source: "lifecycle", sessionKey: null });
  }
  events.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const attribution = (attributionResult.data ?? {}) as Record<string, unknown>;
  return {
    user: { id: detail.id, label: labelFor(detail), email: detail.email, createdAt: detail.createdAt, userType: detail.userType, countryRegion: detail.countryRegion, signupCountryObserved: text(country?.signup_country_observed), lastCountryObserved: text(country?.last_country_observed) },
    emailVerifiedAt: text(verification?.email_verified_at),
    trialStartedAt: text(subscription?.premium_trial_started_at),
    trialEndsAt: text(subscription?.premium_trial_ends_at),
    acquisition: {
      source: text(attribution.utm_source), medium: text(attribution.utm_medium), campaign: text(attribution.utm_campaign),
      content: text(attribution.utm_content), term: text(attribution.utm_term), referrer: text(attribution.referrer_host), landingPath: text(attribution.landing_path),
    },
    sessions: new Set([...links.map((link) => text(link.session_key)), ...events.map((event) => event.sessionKey)].filter(Boolean)).size,
    events,
  };
}
