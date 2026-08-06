import { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type TrackPlayBody = {
  gameKey?: string;
  sessionKey?: string | null;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TrackPlayBody;
    const gameKey = String(body.gameKey ?? "").trim();

    if (!gameKey) {
      return NextResponse.json({ error: "gameKey is required." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const authHeader = request.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    let userId: string | null = null;
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      userId = data.user?.id ?? null;
    }

    const { error } = await supabase.from("game_play_events").insert({
      game_key: gameKey,
      user_id: userId,
      session_key: body.sessionKey ?? null,
    });

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
