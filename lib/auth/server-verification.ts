import { createHmac, createHash, randomBytes } from "node:crypto";

import { resolveVerificationGrace } from "@/lib/auth/verification-grace";
import { isVerifiedGoogleAuthUser } from "@/lib/auth/google-auth-state";
import { getOptionalEnv } from "@/lib/server/env";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import type { User } from "@supabase/supabase-js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value);
}

function rateLimitSecret() {
  const value = getOptionalEnv("AUTH_RATE_LIMIT_SECRET");
  if (value) return value;
  if (process.env.NODE_ENV !== "production") return "local-development-only-rate-limit-secret";
  throw new Error("Authentication is temporarily unavailable. Please try again shortly.");
}

export function requestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export function privateSubjectHash(value: string) {
  return createHmac("sha256", rateLimitSecret()).update(value).digest("hex");
}

export async function claimAuthRateLimit(input: {
  action: string;
  subjects: string[];
  maxRequests: number;
  windowSeconds: number;
}) {
  const subjects = Array.from(new Set(input.subjects.filter(Boolean).map(privateSubjectHash)));
  const { data, error } = await getSupabaseAdmin().rpc("claim_classendo_auth_rate_limit", {
    p_action: input.action,
    p_subject_hashes: subjects,
    p_max_requests: input.maxRequests,
    p_window_seconds: input.windowSeconds,
  });
  if (error) throw error;
  return data === true;
}

export async function getClassendoVerification(userId: string, authenticatedUser?: User) {
  const admin = getSupabaseAdmin();
  const [{ data, error }, authResult] = await Promise.all([
    admin.rpc("get_classendo_verification_grace", { p_user_id: userId }),
    authenticatedUser
      ? Promise.resolve({ data: { user: authenticatedUser }, error: null })
      : admin.auth.admin.getUserById(userId),
  ]);
  if (error || !data) throw error ?? new Error("Verification status is unavailable.");
  if (authResult.error) throw authResult.error;
  const verification = resolveVerificationGrace(data);
  if (!isVerifiedGoogleAuthUser(authResult.data.user)) return verification;

  // Supabase's server-validated auth user is the source of provider trust. A
  // Google-confirmed address must not be demoted by a missing Classendo row.
  return resolveVerificationGrace({
    ...data,
    verified: true,
    verifiedAt: verification.verifiedAt ?? authResult.data.user.email_confirmed_at,
    deadline: null,
  });
}

export async function requireVerifiedClassendoEmail(userId: string, authenticatedUser?: User) {
  const verification = await getClassendoVerification(userId, authenticatedUser);
  if (!verification.verified) {
    throw new Error("Verify your email before using this feature.");
  }
  return verification;
}

export function makeVerificationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: createHash("sha256").update(token).digest("hex") };
}
