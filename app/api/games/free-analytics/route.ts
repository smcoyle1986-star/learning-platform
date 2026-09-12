import { NextRequest, NextResponse } from "next/server";

import { getBillingAccessForUser } from "@/lib/billing/access";
import { GAME_NAMES, getGameTopic } from "@/lib/games/topics";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const EVENT_TYPES = new Set(["hub_viewed", "game_selected", "topic_previewed", "topic_selected", "game_started", "game_completed", "finish_action", "signup_started", "signup_completed"]);
const SOURCES = new Set(["public_topic", "lesson_tray", "custom_vocabulary", "free_games"]);
const ACTIONS = new Set(["play_again", "change_topic", "change_game", "use_own_vocabulary", "create_account"]);
const KEY = /^[a-z0-9-]{1,80}$/;
const SINGLETON_EVENTS = new Set(["hub_viewed", "game_selected", "topic_selected", "game_started", "game_completed", "signup_started", "signup_completed"]);
const COUNTRY_CODE = /^[A-Z]{2}$/;

function text(value: unknown, length: number) {
  return typeof value === "string" ? value.trim().slice(0, length) : "";
}

function eventKey({
  eventType,
  gameKey,
  topicId,
  source,
  action,
  sessionKey,
}: {
  eventType: string;
  gameKey: string;
  topicId: string;
  source: string;
  action: string;
  sessionKey: string;
}) {
  if (!sessionKey) return null;
  const context = [eventType, gameKey, topicId, source, action].join(":");
  if (SINGLETON_EVENTS.has(eventType)) return `v1:once:${sessionKey}:${context}`;

  // Preview and finish-button events may genuinely repeat, but a short server
  // window protects the data from double-clicks and retry races.
  return `v1:brief:${Math.floor(Date.now() / 5_000)}:${sessionKey}:${context}`;
}

function attributionValue(value: unknown) {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function attributionText(value: unknown) {
  return text(value, 80).replace(/[^a-z0-9 ._/-]/gi, "") || null;
}

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
    const body = await request.json() as Record<string, unknown>;
    const eventType = text(body.eventType, 40);
    const gameKey = text(body.gameKey, 80);
    const topicId = text(body.topicId, 80);
    const source = text(body.source, 40);
    const action = text(body.action, 40);
    const sessionKey = text(body.sessionKey, 80);
    const attribution = attributionValue(body.attribution);
    const countryCode = text(request.headers.get("x-vercel-ip-country"), 2).toUpperCase();
    if (!EVENT_TYPES.has(eventType) || (gameKey && !Object.hasOwn(GAME_NAMES, gameKey)) || (topicId && !getGameTopic(topicId)) || (source && !SOURCES.has(source)) || (action && !ACTIONS.has(action)) || (sessionKey && !KEY.test(sessionKey))) {
      return NextResponse.json({ error: "Invalid Free Games analytics event." }, { status: 400 });
    }

    const user = await getRequestUser(request).catch(() => null);
    const admin = getSupabaseAdmin();
    const access = user?.id ? await getBillingAccessForUser(admin, user.id) : null;
    const accountTier = !user ? "guest" : !user.email_confirmed_at ? "free_unconfirmed" : access?.accountPlan === "welcome_trial" ? "trial" : access?.isPremium ? "premium" : "free";
    const topic = getGameTopic(topicId);
    const dedupeKey = eventKey({ eventType, gameKey, topicId: topic?.id ?? "", source, action, sessionKey });
    const { error } = await admin.from("free_game_events").insert({
      event_type: eventType,
      game_key: gameKey || null,
      topic_id: topic?.id ?? null,
      topic_label: topic?.title ?? null,
      topic_category: topic?.category ?? null,
      account_tier: accountTier,
      source: source || null,
      action: action || null,
      user_id: user?.id ?? null,
      session_key: sessionKey || null,
      event_key: dedupeKey,
      utm_source: attributionText(attribution.utmSource),
      utm_medium: attributionText(attribution.utmMedium),
      utm_campaign: attributionText(attribution.utmCampaign),
      utm_content: attributionText(attribution.utmContent),
      utm_term: attributionText(attribution.utmTerm),
      referrer_host: attributionText(attribution.referrerHost),
      landing_path: attributionText(attribution.landingPath),
      country_code: COUNTRY_CODE.test(countryCode) ? countryCode : null,
    });
    if (error?.code === "23505" && dedupeKey) return NextResponse.json({ ok: true, duplicate: true });
    if (error && /free_game_events|relation/i.test(error.message)) return NextResponse.json({ ok: true, skipped: true });
    if (error) throw error;
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    console.error("Free Games analytics failed:", error);
    return NextResponse.json({ error: "Free Games analytics could not be recorded." }, { status: 500 });
  }
}
