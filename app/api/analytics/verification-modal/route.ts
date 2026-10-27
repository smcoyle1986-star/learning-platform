import { NextRequest, NextResponse } from "next/server";

import { getClassendoVerification } from "@/lib/auth/server-verification";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const TYPES = new Set(["modal_viewed", "resend_clicked", "remind_later_clicked"]);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
  const user = await getRequestUser(request);
  if (!user?.id) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const eventType = body?.eventType;
  const impressionId = body?.impressionId;
  const eventId = body?.eventId;
  if (!TYPES.has(eventType) || !UUID.test(impressionId) || !UUID.test(eventId)) return NextResponse.json({ error: "Invalid event." }, { status: 400 });
  const status = await getClassendoVerification(user.id, user);
  if (status.verified || status.phase !== "urgent") return NextResponse.json({ error: "Reminder unavailable." }, { status: 400 });
  const admin = getSupabaseAdmin();
  if (eventType === "modal_viewed") {
    const { data: claim, error } = await admin.from("classendo_verification_urgent_reminders")
      .select("user_id").eq("user_id", user.id).eq("reminder_day", new Date().toISOString().slice(0, 10)).maybeSingle();
    if (error) throw error;
    if (!claim) return NextResponse.json({ error: "Reminder was not shown." }, { status: 400 });
  }
  if (eventType !== "modal_viewed") {
    const { data, error } = await admin.from("verification_modal_events").select("id")
      .eq("user_id", user.id).eq("event_type", "modal_viewed").eq("impression_id", impressionId).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: "Modal view missing." }, { status: 400 });
  }
  const { error } = await admin.from("verification_modal_events").insert({
    user_id: user.id, event_type: eventType, impression_id: impressionId,
    event_key: `v1:${eventType}:${user.id}:${eventId}`,
  });
  if (error?.code === "23505") return NextResponse.json({ ok: true, duplicate: true });
  if (error) throw error;
  return NextResponse.json({ ok: true }, { status: 201 });
}
