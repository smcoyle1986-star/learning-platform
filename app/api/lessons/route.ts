import { NextRequest, NextResponse } from "next/server";

import { getBillingAccessForUser } from "@/lib/billing/access";
import { loadLessonSetsWithAccess } from "@/lib/billing/lesson-set-access";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user?.id) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const access = await getBillingAccessForUser(supabase, user.id);
    const lessons = await loadLessonSetsWithAccess(supabase, user.id, access);
    return NextResponse.json(lessons);
  } catch (error: unknown) {
    console.error("Failed to load lesson-set access:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not load saved lesson sets." },
      { status: 500 },
    );
  }
}
