import { NextRequest, NextResponse } from "next/server";

import { getBillingAccessForUser } from "@/lib/billing/access";
import { convertLessonSetToBasic } from "@/lib/billing/lesson-set-access";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ lessonId: string }> },
) {
  try {
    const user = await getRequestUser(request);
    if (!user?.id) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

    const supabase = getSupabaseAdmin();
    const access = await getBillingAccessForUser(supabase, user.id);
    if (access.isPremium) {
      return NextResponse.json({ error: "This set already has its original Premium access." }, { status: 400 });
    }

    const { lessonId } = await context.params;
    const result = await convertLessonSetToBasic(supabase, user.id, lessonId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Failed to convert lesson set to Basic:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not convert this lesson set." },
      { status: 400 },
    );
  }
}
