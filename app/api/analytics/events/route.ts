import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const EVENT_TYPES = new Set([
  "vocabulary_search",
  "flashcard_view",
  "worksheet_generated",
]);

const SAFE_LABEL = /^[\p{L}\p{N}\s'&_-]+$/u;

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const body = await request.json() as Record<string, unknown>;
    const eventType = clean(body.eventType, 40);
    const itemLabel = clean(body.itemLabel, 120);
    const itemKey = clean(body.itemKey, 120).toLocaleLowerCase();
    const category = clean(body.category, 60).toLocaleLowerCase();
    const sessionKey = clean(body.sessionKey, 80);
    if (!EVENT_TYPES.has(eventType) || !itemLabel || !SAFE_LABEL.test(itemLabel)) {
      return NextResponse.json({ error: "Invalid analytics event." }, { status: 400 });
    }

    const user = await getRequestUser(request).catch(() => null);
    const supabase = getSupabaseAdmin();
    if (sessionKey) {
      const recentCutoff = new Date(Date.now() - 15_000).toISOString();
      const { data: duplicate, error: duplicateError } = await supabase
        .from("analytics_events")
        .select("id")
        .eq("event_type", eventType)
        .eq("session_key", sessionKey)
        .eq("item_label", itemLabel)
        .gte("created_at", recentCutoff)
        .limit(1)
        .maybeSingle();
      if (duplicateError) throw duplicateError;
      if (duplicate) return NextResponse.json({ ok: true, duplicate: true });
    }

    const { error } = await supabase.from("analytics_events").insert({
      event_type: eventType,
      user_id: user?.id ?? null,
      session_key: sessionKey || null,
      item_key: itemKey || itemLabel.toLocaleLowerCase(),
      item_label: itemLabel,
      category: category || null,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Analytics event tracking failed:", error);
    return NextResponse.json({ error: "Analytics event could not be recorded." }, { status: 500 });
  }
}
