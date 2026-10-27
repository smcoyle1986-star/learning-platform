import { NextRequest, NextResponse } from "next/server";
import { sendClassendoVerificationEmail } from "@/lib/auth/email-verification";
import { getClassendoVerification } from "@/lib/auth/server-verification";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user?.id || !user.email) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    if ((await getClassendoVerification(user.id, user)).verified) return NextResponse.json({ verified: true });
    const body = await request.json().catch(() => null);
    await sendClassendoVerificationEmail({ userId: user.id, email: user.email, request, action: "resend", nextPath: typeof body?.nextPath === "string" ? body.nextPath : undefined });
    const impressionId = body?.analyticsImpressionId;
    const clickId = body?.analyticsClickId;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (typeof impressionId === "string" && typeof clickId === "string" && uuid.test(impressionId) && uuid.test(clickId)) {
      try {
        const admin = getSupabaseAdmin();
        const { data: click, error: lookupError } = await admin.from("verification_modal_events").select("id")
          .eq("user_id", user.id).eq("event_type", "resend_clicked")
          .eq("impression_id", impressionId).eq("event_key", `v1:resend_clicked:${user.id}:${clickId}`).maybeSingle();
        if (lookupError) throw lookupError;
        if (click) {
          const { error } = await admin.from("verification_modal_events").insert({
            user_id: user.id, event_type: "resend_succeeded", impression_id: impressionId,
            event_key: `v1:resend_succeeded:${user.id}:${clickId}`,
          });
          if (error && error.code !== "23505") throw error;
        }
      } catch (analyticsError) {
        console.error("Verification resend analytics failed:", analyticsError);
      }
    }
    return NextResponse.json({ sent: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not send verification email." }, { status: 400 });
  }
}
