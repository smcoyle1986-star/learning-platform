import { NextRequest, NextResponse } from "next/server";
import { getBillingAccessForUser } from "@/lib/billing/access";
import { loadLessonSetsWithAccess } from "@/lib/billing/lesson-set-access";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";
const privateJson = (body: unknown) => NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
export async function GET(request: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  try {
    const user = await getRequestUser(request);
    if (!user?.id) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    const { lessonId } = await params;
    const db = getSupabaseAdmin();
    const access = await getBillingAccessForUser(db, user.id);
    const lessons = await loadLessonSetsWithAccess(db, user.id, access, [lessonId]);
    if (!lessons[0]) return NextResponse.json({ error: "Lesson set not found." }, { status: 404 });
    return privateJson(lessons[0]);
  } catch (error) {
    console.error("Dashboard lesson detail failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load lesson." }, { status: 500 });
  }
}
