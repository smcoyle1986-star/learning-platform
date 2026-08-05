import { NextRequest, NextResponse } from "next/server";

import { normalizeLesson } from "@/lib/lessons/repository";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ lessonId: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getRequestUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

    const { lessonId } = await params;
    const body = (await request.json().catch(() => null)) as {
      isFavorite?: unknown;
      archived?: unknown;
    } | null;
    const updates: Record<string, boolean | string | null> = {};

    if (typeof body?.isFavorite === "boolean") {
      updates.is_favorite = body.isFavorite;
    }
    if (typeof body?.archived === "boolean") {
      updates.archived_at = body.archived ? new Date().toISOString() : null;
    }
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid library change was provided." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("lesson_sets")
      .update(updates)
      .eq("id", lessonId)
      .eq("user_id", user.id)
      .select("id,name,created_at,last_used,is_public,use_count,basic_active,is_favorite,archived_at")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "Lesson set not found." }, { status: 404 });
    }

    return NextResponse.json(normalizeLesson(data));
  } catch (error: unknown) {
    console.error("Failed to update lesson library state:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not update this lesson set." },
      { status: 500 },
    );
  }
}
