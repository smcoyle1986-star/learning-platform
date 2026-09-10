import type { User } from "@supabase/supabase-js";

export const SIGNUP_ATTEMPT_KEY = "classendo_signup_attempt";

/**
 * Supabase preserves metadata on repeated unconfirmed signups. Its obfuscated
 * response for an existing confirmed user echoes the submitted metadata but
 * has no identities. Require both this request's marker and a real identity.
 * Never infer creation from a session, timestamp, or onboarding URL alone.
 */
export function newSignupConversionId(user: User, attemptId: string): string | undefined {
  if (
    user.user_metadata[SIGNUP_ATTEMPT_KEY] === attemptId
    && user.identities?.some((identity) => identity.provider === "email" && identity.user_id === user.id)
  ) {
    return attemptId;
  }
  return undefined;
}
