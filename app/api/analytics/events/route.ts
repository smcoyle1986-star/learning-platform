import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { observeAnalyticsSession, observedCountry, validAnalyticsAnonymousId, validAnalyticsSessionKey } from "@/lib/analytics/server";

export const runtime = "nodejs";

const EVENT_TYPES = new Set([
  "vocabulary_search",
  "flashcard_view",
  "worksheet_generated",
  "flashcards_opened",
  "classroom_opened",
  "lesson_pack_viewed",
  "lesson_pack_downloaded",
  "dashboard_opened",
  "onboarding_started",
  "onboarding_completed",
  "page_view",
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
    const sessionKey = validAnalyticsSessionKey(body.sessionKey);
    if (!EVENT_TYPES.has(eventType) || !itemLabel || !SAFE_LABEL.test(itemLabel)) {
      return NextResponse.json({ error: "Invalid analytics event." }, { status: 400 });
    }

    let user;
    try { user = await getRequestUser(request); }
    catch { return NextResponse.json({ error: "Authentication could not be verified." }, { status: 401 }); }
    const supabase = getSupabaseAdmin();
    const country = observedCountry(request);
    await observeAnalyticsSession({ sessionKey, anonymousId: user ? null : body.anonymousId, userId: user?.id, country });
    const eventKey = sessionKey ? `${eventType === "page_view" ? "page" : "event"}:${createHash("sha256")
      .update([user?.id ?? "guest", sessionKey, eventType, itemKey || itemLabel.toLocaleLowerCase(), itemLabel,
        eventType === "page_view" ? "once" : String(Math.floor(Date.now() / 15_000))].join("|"))
      .digest("hex")}` : null;
    if (sessionKey && eventType !== "page_view") {
      const recentCutoff = new Date(Date.now() - 15_000).toISOString();
      let duplicateQuery = supabase
        .from("analytics_events")
        .select("id")
        .eq("event_type", eventType)
        .eq("session_key", sessionKey)
        .eq("item_key", itemKey || itemLabel.toLocaleLowerCase())
        .eq("item_label", itemLabel)
        .gte("created_at", recentCutoff)
        .limit(1);
      duplicateQuery = user ? duplicateQuery.eq("user_id", user.id) : duplicateQuery.is("user_id", null);
      const { data: duplicate, error: duplicateError } = await duplicateQuery.maybeSingle();
      if (duplicateError) throw duplicateError;
      if (duplicate) return NextResponse.json({ ok: true, duplicate: true });
    }

    const { error } = await supabase.from("analytics_events").insert({
      event_type: eventType,
      user_id: user?.id ?? null,
      session_key: sessionKey || null,
      anonymous_id: user ? null : validAnalyticsAnonymousId(body.anonymousId),
      country_code: country,
      event_key: eventKey,
      item_key: itemKey || itemLabel.toLocaleLowerCase(),
      item_label: itemLabel,
      category: category || null,
    });
    if (error?.code === "23505" && eventKey) return NextResponse.json({ ok: true, duplicate: true });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Analytics event tracking failed:", error);
    return NextResponse.json({ error: "Analytics event could not be recorded." }, { status: 500 });
  }
}
