import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getRequestUser } from "@/lib/server/request-auth";
import { observeAnalyticsSession, observedCountry, validAnalyticsAnonymousId, validAnalyticsSessionKey } from "@/lib/analytics/server";
import { GAME_NAMES } from "@/lib/games/topics";

export const runtime = "nodejs";

type TrackPlayBody = {
  gameKey?: string;
  sessionKey?: string | null;
  anonymousId?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    const body = (await request.json()) as TrackPlayBody;
    const gameKey = String(body.gameKey ?? "").trim();
    const sessionKey = validAnalyticsSessionKey(body.sessionKey);

    if (!Object.hasOwn(GAME_NAMES, gameKey) || !sessionKey) {
      return NextResponse.json({ error: "Invalid game analytics event." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    let user;
    try { user = await getRequestUser(request); }
    catch { return NextResponse.json({ error: "Authentication could not be verified." }, { status: 401 }); }
    const country = observedCountry(request);
    await observeAnalyticsSession({ sessionKey, anonymousId: user ? null : body.anonymousId, userId: user?.id, country });

    const { error } = await supabase.from("game_play_events").insert({
      game_key: gameKey,
      user_id: user?.id ?? null,
      session_key: sessionKey,
      anonymous_id: user ? null : validAnalyticsAnonymousId(body.anonymousId),
      country_code: country,
      event_key: `game-play:${sessionKey}:${gameKey}:${Math.floor(Date.now() / 5000)}`,
    });

    if (error?.code === "23505") return NextResponse.json({ ok: true, duplicate: true });

    if (error && /game_play_events|relation/i.test(String(error.message ?? ""))) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("Failed to track game play:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to track game play." },
      { status: 500 }
    );
  }
}
