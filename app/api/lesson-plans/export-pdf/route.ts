import { NextRequest, NextResponse } from "next/server";

import { createLessonPlanPdfBuffer, buildLessonPlanPdfFileName } from "@/lib/lesson-plans/pdf";
import { LessonPlanDraft } from "@/lib/lesson-plans/types";
import { LessonRecord } from "@/lib/lessons/types";

export const runtime = "nodejs";

type ExportPdfBody = {
  lesson?: LessonRecord;
  draft?: LessonPlanDraft;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ExportPdfBody;
    const lesson = body.lesson;
    const draft = body.draft;

    if (!lesson || !draft || !draft.selectedLessonId) {
      return NextResponse.json(
        { error: "This export endpoint requires a lesson and lesson plan draft." },
        { status: 400 }
      );
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
  } catch (error: any) {
    console.error("Failed to export lesson plan PDF:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to export lesson plan PDF." },
      { status: 500 }
    );
  }
}
