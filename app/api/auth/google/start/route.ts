import { NextRequest, NextResponse } from "next/server";
import { claimAuthRateLimit, requestIp } from "@/lib/auth/server-verification";
import { normalizeUsername, isValidUsername } from "@/lib/auth/username";
import { verifyTurnstileToken, TurnstileVerificationError } from "@/lib/auth/turnstile";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const username = normalizeUsername(String(body.username ?? ""));
    if (!isValidUsername(username) || typeof body.countryRegion !== "string" || !body.countryRegion.trim()
      || !["Teacher", "Online tutor", "Student", "Parent", "Other"].includes(String(body.userType)) || body.legalAccepted !== true) {
      return NextResponse.json({ error: "Complete your username, country, account type, and legal consent before continuing." }, { status: 400 });
    }
    await verifyTurnstileToken({ token: String(body.turnstileToken ?? ""), secret: process.env.TURNSTILE_SECRET_KEY?.trim(), remoteIp: requestIp(request), allowUnconfigured: process.env.NODE_ENV !== "production" });
    const allowed = await claimAuthRateLimit({ action: "google_signup_start", subjects: [`ip:${requestIp(request)}`], maxRequests: 5, windowSeconds: 60 * 60 });
    if (!allowed) return NextResponse.json({ error: "Please wait before trying again." }, { status: 429 });
    return NextResponse.json({ ready: true });
  } catch (error) {
    if (error instanceof TurnstileVerificationError) return NextResponse.json({ error: error.message, reason: "turnstile" }, { status: error.status });
    console.error("Google signup preflight failed:", error);
    return NextResponse.json({ error: "Google signup is temporarily unavailable." }, { status: 503 });
  }
}
