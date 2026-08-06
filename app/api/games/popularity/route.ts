import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type GamePopularityRow = {
  game_key: string;
  created_at: string;
};

function weekStartUtc() {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToMonday = (day + 6) % 7;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - diffToMonday);
  start.setUTCHours(0, 0, 0, 0);
  return start.toISOString();
}

function countByGame(rows: GamePopularityRow[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.game_key] = (acc[row.game_key] ?? 0) + 1;
    return acc;
  }, {});
}

function sortEntries(counts: Record<string, number>) {
  return Object.entries(counts)
    .map(([gameKey, count]) => ({ gameKey, count }))
    .sort((left, right) => right.count - left.count || left.gameKey.localeCompare(right.gameKey));
}

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const since = weekStartUtc();

    const [weeklyRes, allTimeRes] = await Promise.all([
      supabase.from("game_play_events").select("game_key, created_at").gte("created_at", since),
      supabase.from("game_play_events").select("game_key, created_at"),
    ]);

    if (
      (weeklyRes.error && /game_play_events|relation/i.test(String(weeklyRes.error.message ?? ""))) ||
      (allTimeRes.error && /game_play_events|relation/i.test(String(allTimeRes.error.message ?? "")))
    ) {
      return NextResponse.json({
        generatedAt: new Date().toISOString(),
        weekStart: since,
        weekly: [],
        allTime: [],
      });
    }

    if (weeklyRes.error) throw weeklyRes.error;
    if (allTimeRes.error) throw allTimeRes.error;

    const weeklyCounts = countByGame((weeklyRes.data ?? []) as GamePopularityRow[]);
    const allTimeCounts = countByGame((allTimeRes.data ?? []) as GamePopularityRow[]);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      weekStart: since,
      weekly: sortEntries(weeklyCounts),
      allTime: sortEntries(allTimeCounts),
    });
  } catch (error: unknown) {
    console.error("Failed to load game popularity stats:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load game popularity stats." },
      { status: 500 }
    );
  }
}
