import type { User } from "@supabase/supabase-js";

const USER_TYPES = new Set(["Teacher", "Online tutor", "Student", "Parent", "Other"]);

export type GoogleProfile = {
  username?: string | null;
  country_region?: string | null;
  user_type?: string | null;
} | null;

export function isVerifiedGoogleAuthUser(user: User | null | undefined): user is User {
  if (!user?.email_confirmed_at) return false;
  // Keep email/password accounts that happen to have a linked Google identity
  // under their existing manual verification policy.
  return user.app_metadata?.provider === "google";
}

export function hasCompletedGoogleOnboarding(profile: GoogleProfile, userMetadata: User["user_metadata"]): boolean {
  const metadata = userMetadata ?? {};
  return Boolean(
    profile?.username?.trim()
    && profile.country_region?.trim()
    && profile.user_type
    && USER_TYPES.has(profile.user_type)
    && metadata.age_confirmed === true
    && typeof metadata.terms_accepted_at === "string"
    && metadata.terms_accepted_at.length > 0
    && typeof metadata.terms_version === "string"
    && metadata.terms_version.length > 0
    && typeof metadata.privacy_notice_version === "string"
    && metadata.privacy_notice_version.length > 0,
  );
}

export type GoogleSignupCompletion = {
  completed: boolean;
  trialStarted: boolean;
  signupConversionId: string | null;
  isNewSignup: boolean;
};

export function parseGoogleSignupCompletion(value: unknown): GoogleSignupCompletion {
  const row = Array.isArray(value) ? value[0] : value;
  if (typeof row !== "object" || row === null) {
    return { completed: false, trialStarted: false, signupConversionId: null, isNewSignup: false };
  }
  const result = row as Record<string, unknown>;
  const completed = result.completed === true;
  const signupConversionId = completed && typeof result.signup_conversion_id === "string"
    ? result.signup_conversion_id
    : null;
  return {
    completed,
    trialStarted: completed && result.trial_started === true,
    signupConversionId,
    isNewSignup: signupConversionId !== null,
  };
}
