import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { sendClassendoVerificationEmail } from "@/lib/auth/email-verification";
import {
  claimAuthRateLimit,
  isValidEmail,
  normalizeEmail,
  requestIp,
} from "@/lib/auth/server-verification";
import { isValidUsername, normalizeUsername } from "@/lib/auth/username";
import { newSignupConversionId, SIGNUP_ATTEMPT_KEY } from "@/lib/auth/signup-conversion";
import { LEGAL_VERSION } from "@/lib/legal/constants";
import { GAME_NAMES, getGameTopic } from "@/lib/games/topics";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type SignupBody = {
  nextPath?: string;
  email?: unknown;
  password?: unknown;
  username?: unknown;
  countryRegion?: unknown;
  legalAccepted?: unknown;
  attribution?: unknown;
  freeGamesContext?: unknown;
  turnstileToken?: unknown;
};

type FreeGamesSignupContext = { gameKey: string; topicId: string | null; sessionKey: string };

const SESSION_KEY = /^[a-z0-9-]{1,80}$/;
const COUNTRY_CODE = /^[A-Z]{2}$/;

function text(value: unknown, length: number) {
  return typeof value === "string" ? value.trim().slice(0, length) : "";
}

function attributionText(value: unknown) {
  return text(value, 80).replace(/[^a-z0-9 ._/-]/gi, "") || null;
}

function readFreeGamesSignupContext(value: unknown): FreeGamesSignupContext | null {
  if (typeof value !== "object" || value === null) return null;
  const input = value as Record<string, unknown>;
  const gameKey = text(input.gameKey, 80);
  const topicId = text(input.topicId, 80);
  const sessionKey = text(input.sessionKey, 80);
  if (!Object.hasOwn(GAME_NAMES, gameKey) || !SESSION_KEY.test(sessionKey)) return null;
  if (topicId && !getGameTopic(topicId)) return null;
  return { gameKey, topicId: topicId || null, sessionKey };
}

async function recordFreeGamesSignupCompletion({
  context,
  userId,
  signupAttemptId,
  attribution,
  request,
}: {
  context: FreeGamesSignupContext | null;
  userId: string;
  signupAttemptId: string;
  attribution: unknown;
  request: NextRequest;
}) {
  if (!context) return;
  const topic = getGameTopic(context.topicId);
  const values = typeof attribution === "object" && attribution !== null ? attribution as Record<string, unknown> : {};
  const countryCode = text(request.headers.get("x-vercel-ip-country"), 2).toUpperCase();
  const { error } = await getSupabaseAdmin().from("free_game_events").insert({
    event_type: "signup_completed",
    game_key: context.gameKey,
    topic_id: topic?.id ?? null,
    topic_label: topic?.title ?? null,
    topic_category: topic?.category ?? null,
    account_tier: "free_unconfirmed",
    source: "free_games",
    action: "create_account",
    user_id: userId,
    session_key: context.sessionKey,
    event_key: `v1:signup-completed:${signupAttemptId}`,
    utm_source: attributionText(values.utmSource),
    utm_medium: attributionText(values.utmMedium),
    utm_campaign: attributionText(values.utmCampaign),
    utm_content: attributionText(values.utmContent),
    utm_term: attributionText(values.utmTerm),
    referrer_host: attributionText(values.referrerHost),
    landing_path: attributionText(values.landingPath),
    country_code: COUNTRY_CODE.test(countryCode) ? countryCode : null,
  });
  if (error && !/free_game_events|relation/i.test(error.message)) {
    console.error("Free Games signup analytics failed:", error);
  }
}

async function verifyTurnstile(token: string, request: NextRequest) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (process.env.NODE_ENV !== "production") return;
    throw new Error("Signup protection is not configured yet. Please try again later.");
  }
  if (!token) throw new Error("Please complete the security check and try again.");
  const form = new URLSearchParams({ secret, response: token, remoteip: requestIp(request) });
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form,
  });
  const result = await response.json().catch(() => null) as { success?: boolean } | null;
  if (!response.ok || !result?.success) throw new Error("Security check failed. Please try again.");
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SignupBody;
    const email = normalizeEmail(body.email);
    const username = normalizeUsername(String(body.username ?? ""));
    const countryRegion = String(body.countryRegion ?? "").trim();
    const password = String(body.password ?? "");
    const freeGamesContext = readFreeGamesSignupContext(body.freeGamesContext);
    if (!isValidEmail(email) || !isValidUsername(username) || !countryRegion || password.length < 6 || body.legalAccepted !== true) {
      return NextResponse.json({ error: "Please complete every required field." }, { status: 400 });
    }
    await verifyTurnstile(String(body.turnstileToken ?? ""), request);

    const rateAllowed = await claimAuthRateLimit({
      action: "signup",
      subjects: [`ip:${requestIp(request)}`, `email:${email}`],
      maxRequests: 5,
      windowSeconds: 60 * 60,
    });
    if (!rateAllowed) return NextResponse.json({ error: "Please wait before creating another account." }, { status: 429 });

    const domain = email.split("@")[1] ?? "";
    const { data: disposable } = await getSupabaseAdmin()
      .from("disposable_email_domains").select("domain").eq("domain", domain).maybeSingle();
    if (disposable) return NextResponse.json({ error: "Please use a permanent email address. Temporary email providers are not supported." }, { status: 400 });

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) throw new Error("Signup is temporarily unavailable.");
    const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const signupAttemptId = randomUUID();
    const { data, error } = await auth.auth.signUp({
      email,
      password,
      options: {
        data: {
          [SIGNUP_ATTEMPT_KEY]: signupAttemptId,
          username,
          country_region: countryRegion,
          age_confirmed: true,
          terms_accepted_at: new Date().toISOString(),
          terms_version: LEGAL_VERSION,
          privacy_notice_version: LEGAL_VERSION,
          classendo_onboarding_started_at: new Date().toISOString(),
          signup_attribution: body.attribution ?? null,
        },
      },
    });
    if (error || !data.user) {
      const text = String(error?.message ?? "").toLowerCase();
      const message = /already registered|already exists|user already|email.*taken|duplicate/.test(text)
        ? "An account already exists with this email address. Please sign in instead."
        : "We could not create your account just now. Please try again.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const signupConversionId = newSignupConversionId(data.user, signupAttemptId);
    if (signupConversionId) {
      await recordFreeGamesSignupCompletion({
        context: freeGamesContext,
        userId: data.user.id,
        signupAttemptId,
        attribution: body.attribution,
        request,
      });
    }
    if (!data.session) {
      return NextResponse.json({ requiresLegacyConfirmation: true, signupConversionId }, { status: 202 });
    }

    let verificationEmailSent = true;
    try {
      await sendClassendoVerificationEmail({ userId: data.user.id, email, request, action: "signup", nextPath: body.nextPath });
    } catch (mailError) {
      console.error("Verification email could not be sent after signup:", mailError);
      verificationEmailSent = false;
    }
    return NextResponse.json({
      signupConversionId,
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      },
      verificationEmailSent,
    });
  } catch (error: unknown) {
    console.error("Signup failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Signup failed." }, { status: 500 });
  }
}
