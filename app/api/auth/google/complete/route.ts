import { track } from "@vercel/analytics/server";
import { NextRequest, NextResponse } from "next/server";

import { attributeGuestExitSignup, clearGuestExitReceipt } from "@/lib/analytics/guest-exit-attribution";
import { recordAnalyticsLifecycleEvent, validAnalyticsSessionKey, validAnalyticsAnonymousId, linkAnalyticsAnonymousIdToAccount, linkAnalyticsSessionToAccount, observeAnalyticsSession, observedCountry } from "@/lib/analytics/server";
import { LEGAL_VERSION } from "@/lib/legal/constants";
import { isValidCountryRegion } from "@/lib/auth/countries";
import { isVerifiedGoogleAuthUser, parseGoogleSignupCompletion } from "@/lib/auth/google-auth-state";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { claimAuthRateLimit, requestIp } from "@/lib/auth/server-verification";
import { verifyTurnstileToken, TurnstileVerificationError } from "@/lib/auth/turnstile";
import { isValidUsername, normalizeUsername } from "@/lib/auth/username";
import { GAME_NAMES, getGameTopic } from "@/lib/games/topics";

export const runtime = "nodejs";

function jsonError(message: string, status: number) { return NextResponse.json({ error: message }, { status }); }

function readAttribution(value: unknown) {
  if (typeof value !== "object" || value === null) return null;
  const source = value as Record<string, unknown>;
  const clean = (key: string) => typeof source[key] === "string" ? source[key].trim().slice(0, 80).replace(/[^a-z0-9 ._/-]/gi, "") || null : null;
  return { utmSource: clean("utmSource"), utmMedium: clean("utmMedium"), utmCampaign: clean("utmCampaign"), utmContent: clean("utmContent"), utmTerm: clean("utmTerm"), referrerHost: clean("referrerHost"), landingPath: clean("landingPath") };
}

function readFreeGamesContext(value: unknown) {
  if (typeof value !== "object" || value === null) return null;
  const input = value as Record<string, unknown>;
  const gameKey = typeof input.gameKey === "string" ? input.gameKey.trim().slice(0, 80) : "";
  const topicId = typeof input.topicId === "string" ? input.topicId.trim().slice(0, 80) : "";
  const sessionKey = validAnalyticsSessionKey(input.sessionKey);
  if (!Object.hasOwn(GAME_NAMES, gameKey) || !sessionKey || (topicId && !getGameTopic(topicId))) return null;
  return { gameKey, topicId: topicId || null, sessionKey };
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return jsonError("Invalid origin.", 403);
  const user = await getRequestUser(request);
  if (!user) return jsonError("Sign in with Google to continue.", 401);
  if (!isVerifiedGoogleAuthUser(user)) return jsonError("A verified Google email is required.", 403);
  try {
    const body = await request.json() as Record<string, unknown>;
    const username = normalizeUsername(String(body.username ?? ""));
    const countryRegion = typeof body.countryRegion === "string" ? body.countryRegion.trim().slice(0, 100) : "";
    const userType = String(body.userType ?? "");
    const attribution = readAttribution(body.attribution);
    const freeGamesContext = readFreeGamesContext(body.freeGamesContext);
    if (!isValidUsername(username) || !isValidCountryRegion(countryRegion) || !["Teacher", "Online tutor", "Student", "Parent", "Other"].includes(userType) || body.legalAccepted !== true) {
      return jsonError("Please complete every required field and accept the legal terms.", 400);
    }
    await verifyTurnstileToken({ token: String(body.turnstileToken ?? ""), secret: process.env.TURNSTILE_SECRET_KEY?.trim(), remoteIp: requestIp(request), allowUnconfigured: process.env.NODE_ENV !== "production" });
    const allowed = await claimAuthRateLimit({ action: "google_signup_complete", subjects: [`ip:${requestIp(request)}`, `user:${user.id}`], maxRequests: 5, windowSeconds: 60 * 60 });
    if (!allowed) return jsonError("Please wait before trying again.", 429);

    const { data, error } = await getSupabaseAdmin().rpc("complete_classendo_google_signup", {
      p_user_id: user.id, p_username: username, p_country_region: countryRegion, p_user_type: userType, p_legal_version: LEGAL_VERSION,
      p_signup_attribution: attribution,
    });
    if (error) {
      if (error.code === "23505") return jsonError("That username is already taken. Choose another username.", 409);
      console.error("Google signup completion failed:", error);
      return jsonError("Google signup could not be completed.", 503);
    }
    const result = parseGoogleSignupCompletion(data);
    if (!result.completed) return jsonError("This Google account is not eligible for new-account onboarding.", 409);

    const analyticsSessionKey = validAnalyticsSessionKey(body.analyticsSessionKey);
    const analyticsAnonymousId = validAnalyticsAnonymousId(body.analyticsAnonymousId);
    const newGoogleSignup = result.isNewSignup;
    if (newGoogleSignup && analyticsSessionKey) {
      try {
        await linkAnalyticsAnonymousIdToAccount({ userId: user.id, anonymousId: analyticsAnonymousId, reason: "signup" });
        await linkAnalyticsSessionToAccount({ userId: user.id, sessionKey: analyticsSessionKey, anonymousId: analyticsAnonymousId, reason: "signup" });
        await observeAnalyticsSession({ sessionKey: analyticsSessionKey, anonymousId: analyticsAnonymousId, userId: user.id, country: observedCountry(request) });
      } catch (error) { console.error("Could not link Google signup analytics:", error); }
    }
    let guestExitAttributed = false;
    if (body.guestExitContext === true) {
      try { guestExitAttributed = await attributeGuestExitSignup(request, user.id, user.created_at, analyticsSessionKey, analyticsAnonymousId); }
      catch (error) { console.error("Google guest exit attribution failed:", error); }
    }
    if (newGoogleSignup) {
      if (freeGamesContext) {
        const topic = getGameTopic(freeGamesContext.topicId);
        const userAgent = request.headers.get("user-agent") ?? "";
        const deviceType = /ipad|tablet|playbook|silk/i.test(userAgent) ? "tablet" : /mobile|iphone|ipod|android/i.test(userAgent) ? "mobile" : userAgent ? "desktop" : "unknown";
        const values = attribution ?? { utmSource: null, utmMedium: null, utmCampaign: null, utmContent: null, utmTerm: null, referrerHost: null, landingPath: null };
        const { error: freeGameError } = await getSupabaseAdmin().from("free_game_events").insert({
          event_type: "signup_completed", game_key: freeGamesContext.gameKey,
          topic_id: topic?.id ?? null, topic_label: topic?.title ?? null, topic_category: topic?.category ?? null,
          account_tier: result.trialStarted ? "trial" : "free", user_id: user.id, source: "free_games", action: "create_account",
          session_key: freeGamesContext.sessionKey, event_key: `v1:google-signup-completed:${user.id}`,
          utm_source: values.utmSource ?? null, utm_medium: values.utmMedium ?? null,
          utm_campaign: values.utmCampaign ?? null, utm_content: values.utmContent ?? null,
          utm_term: values.utmTerm ?? null, referrer_host: values.referrerHost ?? null,
          landing_path: values.landingPath ?? null, country_code: observedCountry(request), device_type: deviceType,
        });
        if (freeGameError) console.error("Free Games Google signup analytics failed:", freeGameError);
      }
      try {
        await track("signup_succeeded", { auth_method: "google", user_type: userType, destination: body.nextPath === "/upgrade" ? "upgrade" : "flashcards" });
      } catch (error) { console.error("Could not record Google signup analytics:", error); }
    }
    try {
      await recordAnalyticsLifecycleEvent({ userId: user.id, eventType: "email_verified", eventKey: `email-verified:${user.id}` });
      if (result.trialStarted) {
        await recordAnalyticsLifecycleEvent({ userId: user.id, eventType: "premium_trial_activated", eventKey: `premium-trial-activated:${user.id}` });
      }
    } catch (error) { console.error("Could not record Google verification/trial analytics:", error); }
    const response = NextResponse.json({ completed: true, trialStarted: result.trialStarted, signupConversionId: result.signupConversionId, newGoogleSignup });
    if (guestExitAttributed) clearGuestExitReceipt(response);
    return response;
  } catch (error) {
    if (error instanceof TurnstileVerificationError) return jsonError(error.message, error.status);
    console.error("Google signup completion request failed:", error);
    return jsonError("Google signup could not be completed. Please try again.", 500);
  }
}
