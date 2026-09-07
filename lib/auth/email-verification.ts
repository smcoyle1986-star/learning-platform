import { getOptionalEnv } from "@/lib/server/env";
import {
  claimAuthRateLimit,
  makeVerificationToken,
  normalizeEmail,
  requestIp,
} from "@/lib/auth/server-verification";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

const VERIFY_TOKEN_LIFETIME_HOURS = 24;

function appUrl() {
  const value = getOptionalEnv("NEXT_PUBLIC_APP_URL") ?? getOptionalEnv("NEXT_PUBLIC_SITE_URL");
  if (value) return value.replace(/\/$/, "");
  return process.env.NODE_ENV === "production" ? "https://classendo.com" : "http://localhost:3000";
}

export async function sendClassendoVerificationEmail(input: {
  userId: string;
  email: string;
  request: Request;
  action: "signup" | "resend";
}) {
  const email = normalizeEmail(input.email);
  const allowed = await claimAuthRateLimit({
    action: `verification_${input.action}`,
    subjects: [`email:${email}`, `ip:${requestIp(input.request)}`, `user:${input.userId}`],
    maxRequests: input.action === "signup" ? 3 : 3,
    windowSeconds: input.action === "signup" ? 60 * 60 : 60 * 60,
  });
  if (!allowed) throw new Error("Please wait before requesting another verification email.");

  const { token, hash } = makeVerificationToken();
  const supabase = getSupabaseAdmin();
  await supabase
    .from("classendo_email_verification_tokens")
    .update({ invalidated_at: new Date().toISOString() })
    .eq("user_id", input.userId)
    .is("used_at", null)
    .is("invalidated_at", null);

  const { error: tokenError } = await supabase.from("classendo_email_verification_tokens").insert({
    token_hash: hash,
    user_id: input.userId,
    normalized_email: email,
    expires_at: new Date(Date.now() + VERIFY_TOKEN_LIFETIME_HOURS * 60 * 60 * 1000).toISOString(),
  });
  if (tokenError) throw tokenError;

  const apiKey = getOptionalEnv("RESEND_API_KEY");
  const from = getOptionalEnv("RESEND_FROM_EMAIL");
  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "production") throw new Error("Email verification is not configured yet.");
    console.info(`Local email verification link: ${appUrl()}/verify-email?token=${token}`);
    return;
  }

  const verifyUrl = `${appUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Verify your Classendo email",
      html: `<p>Welcome to Classendo.</p><p>Verify your email to activate your 14-day Premium trial and unlock publishing, Creator uploads, and billing.</p><p><a href="${verifyUrl}">Verify my email</a></p><p>This link expires in 24 hours. If you did not create a Classendo account, you can ignore this email.</p>`,
    }),
  });
  if (!response.ok) throw new Error("We could not send the verification email. Please try again shortly.");
}
