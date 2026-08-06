import { NextRequest, NextResponse } from "next/server";

import { canAccessWorksheetType, getBillingAccessForUser } from "@/lib/billing/access";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { createWorksheetPdfBuffer, buildWorksheetPdfFileName } from "@/lib/worksheets/pdf";
import { WorksheetDraft } from "@/lib/worksheets/types";
import { LessonCard } from "@/lib/lessons/types";

export const runtime = "nodejs";

type ExportPdfBody = {
  cards?: LessonCard[];
  draft?: WorksheetDraft;
  includeTeacherCopy?: boolean;
};

const MAX_REQUEST_BYTES = 2 * 1024 * 1024;
const MAX_CARDS = 100;

export async function POST(request: NextRequest) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }

    const user = await getRequestUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    }

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
    if (cards.length > MAX_CARDS) {
      return NextResponse.json({ error: "Worksheets support up to 100 cards." }, { status: 400 });
    }

    const access = await getBillingAccessForUser(getSupabaseAdmin(), user.id);
    if (!canAccessWorksheetType(access, draft.type)) {
      return NextResponse.json(
        { error: "This worksheet type requires Premium." },
        { status: 403 },
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
  } catch (error: unknown) {
    console.error("Failed to export worksheet PDF:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to export worksheet PDF." },
      { status: 500 }
    );
  }
}
