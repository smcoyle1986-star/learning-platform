import { NextRequest, NextResponse } from "next/server";

import { assertCanCreateLessonSet, getBillingAccessForUser } from "@/lib/billing/access";
import { loadLessonSetsWithAccess } from "@/lib/billing/lesson-set-access";
import {
  assertUserCanAccessCreatorImages,
  CreatorApiError,
} from "@/lib/creator/server";
import {
  findExistingLessonIdByName,
  LessonNameConflictError,
  saveLesson,
} from "@/lib/lessons/repository";
import { normalizeLessonCard } from "@/lib/lessons/tray";
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

    const cards = (Array.isArray(body.cards) ? body.cards : []).map(normalizeLessonCard);
    await assertUserCanAccessCreatorImages(
      cards
        .map((card) => card.creator_image_id)
        .filter((imageId): imageId is string => Boolean(imageId)),
      user.id
    );

    if (!body.lessonId) {
      const existingLessonId = await findExistingLessonIdByName(
        supabase,
        user.id,
        String(body.name ?? "")
      );
      if (existingLessonId) {
        throw new LessonNameConflictError(existingLessonId);
      }
      await assertCanCreateLessonSet(supabase, user.id);
    } else {
      const access = await getBillingAccessForUser(supabase, user.id);
      if (!access.isPremium) {
        const lesson = (await loadLessonSetsWithAccess(supabase, user.id, access))
          .find((item) => item.id === body.lessonId);
        if (!lesson) {
          return NextResponse.json({ error: "Lesson set not found." }, { status: 404 });
        }
        if (lesson.isLocked || lesson.containsPremiumImages) {
          return NextResponse.json(
            { error: "This lesson set is locked on Basic and cannot be edited. Upgrade to Premium to edit the original set." },
            { status: 403 },
          );
        }
      }
    }

    const savedLesson = await saveLesson(supabase, {
      lessonId: body.lessonId ?? null,
      userId: user.id,
      name: String(body.name ?? ""),
      isPublic: Boolean(body.isPublic ?? true),
      cards: cards as LessonCard[],
    });

    return NextResponse.json(savedLesson);
  } catch (error: unknown) {
    if (error instanceof CreatorApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof LessonNameConflictError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          existingLessonId: error.existingLessonId,
        },
        { status: 409 }
      );
    }
    console.error("Failed to save lesson via API:", error);
    const message = getErrorMessage(error);
    return NextResponse.json(
      { error: message },
      { status: /upgrade to premium|free accounts can save/i.test(message) ? 403 : 500 }
    );
  }
}
