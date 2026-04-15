import { NextRequest, NextResponse } from "next/server";

import { createWorksheetPdfBuffer, buildWorksheetPdfFileName } from "@/lib/worksheets/pdf";
import { WorksheetDraft } from "@/lib/worksheets/types";
import { LessonCard } from "@/lib/lessons/types";

export const runtime = "nodejs";

type ExportPdfBody = {
  cards?: LessonCard[];
  draft?: WorksheetDraft;
  includeTeacherCopy?: boolean;
};

export async function POST(request: NextRequest) {
  try {
    let body: ExportPdfBody;
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      body = (await request.json()) as ExportPdfBody;
    } else {
      const formData = await request.formData();
      const payload = String(formData.get("payload") ?? "");
      body = payload ? (JSON.parse(payload) as ExportPdfBody) : {};
    }
    const cards = Array.isArray(body.cards) ? body.cards : [];
    const draft = body.draft;

    if (!draft || !draft.type) {
      return NextResponse.json(
        { error: "This export endpoint requires a worksheet draft." },
        { status: 400 }
      );
    }

    const pdf = await createWorksheetPdfBuffer(cards, draft, {
      includeTeacherCopy: Boolean(body.includeTeacherCopy),
    });
    const title = draft.title?.trim() || "Bullseye";
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${buildWorksheetPdfFileName(title)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    console.error("Failed to export worksheet PDF:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to export worksheet PDF." },
      { status: 500 }
    );
  }
}
