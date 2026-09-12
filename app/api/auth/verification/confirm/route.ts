import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { token?: unknown };
    const token = String(body.token ?? "");
    if (token.length < 40) return NextResponse.json({ error: "This verification link is invalid." }, { status: 400 });
    const hash = createHash("sha256").update(token).digest("hex");
    const { data, error } = await getSupabaseAdmin().rpc("complete_classendo_email_verification", { p_token_hash: hash });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.verified) return NextResponse.json({ error: "This verification link has expired or was already used. Sign in to request a new one." }, { status: 400 });
    return NextResponse.json({
      verified: true,
      trialStarted: result.trial_started === true,
      signupConversionId: typeof result.signup_conversion_id === "string" ? result.signup_conversion_id : undefined,
    });
  } catch (error: unknown) {
    console.error("Email verification failed:", error);
    return NextResponse.json({ error: "We could not verify this email. Please request a new link." }, { status: 500 });
  }
}
