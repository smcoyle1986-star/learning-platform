import { NextRequest, NextResponse } from "next/server";

import { createLessonPlanPdfBuffer, buildLessonPlanPdfFileName } from "@/lib/lesson-plans/pdf";
import { LessonPlanDraft } from "@/lib/lesson-plans/types";
import { LessonRecord } from "@/lib/lessons/types";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
const MAX_CARDS = 100;
const MAX_STAGES = 30;

type ExportPdfBody = {
  lesson?: LessonRecord;
  draft?: LessonPlanDraft;
};

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }

    const body = (await request.json()) as ExportPdfBody;
    const lesson = body.lesson;
    const draft = body.draft;

    if (!lesson || !draft || !draft.selectedLessonId) {
      return NextResponse.json(
        { error: "This export endpoint requires a lesson and lesson plan draft." },
        { status: 400 }
      );
    }
    if (!Array.isArray(lesson.cards) || lesson.cards.length > MAX_CARDS) {
      return NextResponse.json({ error: "Lesson plans support up to 100 cards." }, { status: 400 });
    }
    if (!Array.isArray(draft.stages) || draft.stages.length > MAX_STAGES) {
      return NextResponse.json({ error: "Lesson plans support up to 30 stages." }, { status: 400 });
    }

    const pdf = await createLessonPlanPdfBuffer(lesson, draft);
    const fileName = buildLessonPlanPdfFileName(draft.title || `${lesson.name} Lesson Plan`);

    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("Failed to export lesson plan PDF:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to export lesson plan PDF.",
      },
      { status: 500 }
    );
  }
}
