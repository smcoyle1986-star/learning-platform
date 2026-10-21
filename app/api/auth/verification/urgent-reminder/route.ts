import { NextRequest, NextResponse } from "next/server";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  const { data, error } = await getSupabaseAdmin().rpc("claim_classendo_verification_urgent_reminder", { p_user_id: user.id });
  if (error) return NextResponse.json({ error: "Could not check reminder status." }, { status: 503 });
  return NextResponse.json({ show: data === true });
}
