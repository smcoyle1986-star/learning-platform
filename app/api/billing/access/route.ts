import { NextRequest, NextResponse } from "next/server";

import { buildBillingAccessSnapshot, getBillingAccessForUser } from "@/lib/billing/access";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user?.id) {
      return NextResponse.json(buildBillingAccessSnapshot({ userId: null }));
    }

    const access = await getBillingAccessForUser(getSupabaseAdmin(), user.id);
    return NextResponse.json(access);
  } catch (error: unknown) {
    console.error("Failed to load billing access:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load billing access." },
      { status: 500 }
    );
  }
}
