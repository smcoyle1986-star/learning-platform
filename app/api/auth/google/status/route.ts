import { NextRequest, NextResponse } from "next/server";
import { recordAnalyticsLifecycleEvent } from "@/lib/analytics/server";
import { hasCompletedGoogleOnboarding, isVerifiedGoogleAuthUser, parseGoogleSignupCompletion } from "@/lib/auth/google-auth-state";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (!isVerifiedGoogleAuthUser(user)) return NextResponse.json({ error: "Google sign-in could not be verified." }, { status: 403 });
  const admin = getSupabaseAdmin();
  const [{ data: stateData, error: stateError }, { data: profile, error: profileError }] = await Promise.all([
    admin.rpc("get_classendo_google_signup_state", { p_user_id: user.id }),
    admin.from("profiles").select("username,country_region,user_type").eq("id", user.id).maybeSingle(),
  ]);
  const error = stateError ?? profileError;
  if (error) {
    console.error("Google signup state unavailable:", error);
    return NextResponse.json({ error: "Google signup could not be completed." }, { status: 503 });
  }
  const row = Array.isArray(stateData) ? stateData[0] : stateData;
  const onboardingRequired = row?.onboarding_required === true
    || !hasCompletedGoogleOnboarding(profile, user.user_metadata);

  if (!onboardingRequired) {
    const { data: reconciliationData, error: reconciliationError } = await admin.rpc("reconcile_classendo_google_verification", { p_user_id: user.id });
    if (reconciliationError) {
      console.error("Google verification reconciliation unavailable:", reconciliationError);
      return NextResponse.json({ error: "Google account verification is temporarily unavailable." }, { status: 503 });
    }
    const reconciled = parseGoogleSignupCompletion(reconciliationData);
    try {
      await recordAnalyticsLifecycleEvent({ userId: user.id, eventType: "email_verified", eventKey: `email-verified:${user.id}` });
      if (reconciled.trialStarted) {
        await recordAnalyticsLifecycleEvent({ userId: user.id, eventType: "premium_trial_activated", eventKey: `premium-trial-activated:${user.id}` });
      }
    } catch (analyticsError) {
      console.error("Could not record reconciled Google verification analytics:", analyticsError);
    }
  }

  return NextResponse.json({ onboardingRequired });
}
