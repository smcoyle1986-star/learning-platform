import { NextRequest, NextResponse } from "next/server";

import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const { error } = await getSupabaseAdmin()
      .from("user_subscriptions")
      .update({ premium_trial_expiry_seen_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("premium_trial_used", true)
      .lte("premium_trial_ends_at", new Date().toISOString())
      .is("premium_trial_expiry_seen_at", null);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("Failed to acknowledge Premium welcome trial expiry:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update trial notice." },
      { status: 500 },
    );
  }
}
