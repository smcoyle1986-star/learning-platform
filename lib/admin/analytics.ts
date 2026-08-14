import "server-only";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type JsonRecord = Record<string, unknown>;

export type AdminAnalyticsRankedItem = {
  key: string;
  label: string;
  category: string | null;
  count: number;
  generatedCount: number;
  savedCount: number;
  downloads: number;
  uses: number;
};

export type AdminAnalyticsTrend = {
  date: string;
  events: number;
  gamePlays: number;
  newUsers: number;
};

export type AdminAnalyticsSnapshot = {
  periodDays: number | null;
  generatedAt: string;
  summary: {
    trackedEvents: number;
    vocabularySearches: number;
    flashcardViews: number;
    worksheetGenerations: number;
    worksheetSaves: number;
    flashcardsOpened: number;
    classroomOpens: number;
    guestFlashcardsOpened: number;
    guestClassroomOpens: number;
    lessonPackViews: number;
    lessonPackDownloads: number;
    gamePlays: number;
    premiumUpgrades: number;
    newUsers: number;
    communityUses: number;
  };
  searchTerms: AdminAnalyticsRankedItem[];
  flashcards: AdminAnalyticsRankedItem[];
  games: AdminAnalyticsRankedItem[];
  worksheets: AdminAnalyticsRankedItem[];
  lessonPacks: AdminAnalyticsRankedItem[];
  communitySets: AdminAnalyticsRankedItem[];
  trends: AdminAnalyticsTrend[];
};

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableText(value: unknown) {
  return typeof value === "string" ? value : null;
}

function count(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizeRanked(value: unknown): AdminAnalyticsRankedItem {
  const item = record(value);
  return {
    key: text(item.key),
    label: text(item.label, "Unknown"),
    category: nullableText(item.category),
    count: count(item.count),
    generatedCount: count(item.generated_count),
    savedCount: count(item.saved_count),
    downloads: count(item.downloads),
    uses: count(item.uses),
  };
}

function normalizeList(value: unknown) {
  return Array.isArray(value) ? value.map(normalizeRanked) : [];
}

export async function getAdminAnalyticsSnapshot(
  periodDays: number | null,
): Promise<AdminAnalyticsSnapshot> {
  const { data, error } = await getSupabaseAdmin().rpc(
    "get_admin_analytics_snapshot",
    { period_days: periodDays },
  );
  if (error) throw new Error(`Could not load analytics: ${error.message}`);
  const root = record(data);
  const summary = record(root.summary);
  return {
    periodDays: root.period_days === null ? null : count(root.period_days),
    generatedAt: text(root.generated_at),
    summary: {
      trackedEvents: count(summary.tracked_events),
      vocabularySearches: count(summary.vocabulary_searches),
      flashcardViews: count(summary.flashcard_views),
      worksheetGenerations: count(summary.worksheet_generations),
      worksheetSaves: count(summary.worksheet_saves),
      flashcardsOpened: count(summary.flashcards_opened),
      classroomOpens: count(summary.classroom_opens),
      guestFlashcardsOpened: count(summary.guest_flashcards_opened),
      guestClassroomOpens: count(summary.guest_classroom_opens),
      lessonPackViews: count(summary.lesson_pack_views),
      lessonPackDownloads: count(summary.lesson_pack_downloads),
      gamePlays: count(summary.game_plays),
      premiumUpgrades: count(summary.premium_upgrades),
      newUsers: count(summary.new_users),
      communityUses: count(summary.community_uses),
    },
    searchTerms: normalizeList(root.search_terms),
    flashcards: normalizeList(root.flashcards),
    games: normalizeList(root.games),
    worksheets: normalizeList(root.worksheets),
    lessonPacks: normalizeList(root.lesson_packs),
    communitySets: normalizeList(root.community_sets),
    trends: Array.isArray(root.trends)
      ? root.trends.map((value) => {
        const item = record(value);
        return {
          date: text(item.date),
          events: count(item.events),
          gamePlays: count(item.game_plays),
          newUsers: count(item.new_users),
        };
      })
      : [],
  };
}
