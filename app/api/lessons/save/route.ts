import { NextRequest, NextResponse } from "next/server";

import { assertCanCreateLessonSet } from "@/lib/billing/access";
import { saveLesson } from "@/lib/lessons/repository";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import type { LessonCard } from "@/lib/lessons/types";

export const runtime = "nodejs";

type SaveLessonRequest = {
  lessonId?: string | null;
  name?: string;
  isPublic?: boolean;
  cards?: unknown[];
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Failed to save lesson.";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "You must be signed in to save lessons." }, { status: 401 });
    }

    const body = (await request.json()) as SaveLessonRequest;
    const supabase = getSupabaseAdmin();

    if (!body.lessonId) {
      await assertCanCreateLessonSet(supabase, user.id);
    }

    const savedLesson = await saveLesson(supabase, {
      lessonId: body.lessonId ?? null,
      userId: user.id,
      name: String(body.name ?? ""),
      isPublic: Boolean(body.isPublic ?? true),
      cards: (Array.isArray(body.cards) ? body.cards : []) as LessonCard[],
    });

    return NextResponse.json(savedLesson);
  } catch (error: unknown) {
    console.error("Failed to save lesson via API:", error);
    const message = getErrorMessage(error);
    return NextResponse.json(
      { error: message },
      { status: /upgrade to premium|free accounts can save/i.test(message) ? 403 : 500 }
    );
  }
}
