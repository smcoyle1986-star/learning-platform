import { NextRequest, NextResponse } from "next/server";

import { findGuestExitReceipt } from "@/lib/analytics/guest-exit-attribution";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const response = NextResponse.json({ ok: true });
  const referrer = request.headers.get("referer");
  let referrerUrl: URL | null = null;
  try { if (referrer) referrerUrl = new URL(referrer, request.nextUrl.origin); } catch {}
  const arrivedFromModal = body?.fromModal === true && referrerUrl?.origin === request.nextUrl.origin
    && referrerUrl.pathname === "/signup" && referrerUrl.searchParams.get("from") === "guest-exit";
  if (!arrivedFromModal) return response;
  try {
    const receipt = await findGuestExitReceipt(request);
    if (!receipt || receipt.user_id) return response;
    const { error } = await getSupabaseAdmin().from("guest_exit_signup_journeys")
      .update({ arrived_at: receipt.arrived_at ?? new Date().toISOString() })
      .eq("receipt_hash", receipt.receipt_hash).is("arrived_at", null);
    if (error) throw error;
    return response;
  } catch (error) {
    console.error("Guest signup arrival tracking failed:", error);
    return NextResponse.json({ error: "Arrival could not be recorded." }, { status: 503 });
  }
}
