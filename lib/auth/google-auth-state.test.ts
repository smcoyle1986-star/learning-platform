import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { User } from "@supabase/supabase-js";
import {
  hasCompletedGoogleOnboarding,
  isVerifiedGoogleAuthUser,
  parseGoogleSignupCompletion,
} from "./google-auth-state";

const googleUser = {
  id: "google-user",
  email: "teacher@example.com",
  email_confirmed_at: "2026-10-26T00:00:00.000Z",
  app_metadata: { provider: "google" },
  user_metadata: {},
  identities: [{ provider: "google" }],
} as unknown as User;

test("verified Google provider is trusted, while email/password verification stays manual", () => {
  assert.equal(isVerifiedGoogleAuthUser(googleUser), true);
  assert.equal(isVerifiedGoogleAuthUser({ ...googleUser, email_confirmed_at: "" }), false);
  assert.equal(isVerifiedGoogleAuthUser({ ...googleUser, app_metadata: { provider: "email" } }), false);
});

test("Google onboarding requires every profile and legal field", () => {
  const profile = { username: "teacher_lee", country_region: "Canada", user_type: "Teacher" };
  const metadata = {
    age_confirmed: true,
    terms_accepted_at: "2026-10-26T00:00:00.000Z",
    terms_version: "2026-10",
    privacy_notice_version: "2026-10",
  };
  assert.equal(hasCompletedGoogleOnboarding(profile, metadata), true);
  assert.equal(hasCompletedGoogleOnboarding({ ...profile, country_region: null }, metadata), false);
  assert.equal(hasCompletedGoogleOnboarding(profile, { ...metadata, age_confirmed: false }), false);
  assert.equal(hasCompletedGoogleOnboarding(profile, { ...metadata, terms_version: "" }), false);
});

test("repeat signup completion cannot emit another conversion or trial signal", () => {
  assert.deepEqual(parseGoogleSignupCompletion({ completed: true, trial_started: true, signup_conversion_id: "receipt-1" }), {
    completed: true, trialStarted: true, signupConversionId: "receipt-1", isNewSignup: true,
  });
  assert.deepEqual(parseGoogleSignupCompletion({ completed: true, trial_started: false, signup_conversion_id: null }), {
    completed: true, trialStarted: false, signupConversionId: null, isNewSignup: false,
  });
});

test("Google database fix retains the unique-email and subscription trial safeguards", () => {
  const sql = readFileSync("supabase/sql/google-oauth-verification-fix.sql", "utf8");
  assert.match(sql, /on conflict \(normalized_email\) do nothing/i);
  assert.match(sql, /not coalesce\(premium_trial_used, false\)/i);
  assert.match(sql, /premium_trial_started_at is null and premium_trial_ends_at is null/i);
  assert.match(sql, /stripe_subscription_id is null/i);
  assert.match(sql, /lower\(coalesce\(subscription_status, ''\)\) in \('trialing', 'active', 'past_due'\)/i);
  assert.match(sql, /if not found then\s+conversion_eligible := false;/i);
  assert.match(sql, /if conversion_eligible then[\s\S]*?signup_conversion_claimed_at is null/i);
  assert.match(sql, /raw_app_meta_data ->> 'provider' is distinct from 'google'/i);
});
