import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  // Kept as a stable route for older clients, but deliberately no longer
  // exposes account-email state. Supabase Auth performs the real duplicate
  // check after the server-side CAPTCHA and rate-limit checks.
  return NextResponse.json({ error: "This check is no longer available." }, { status: 410 });
}
