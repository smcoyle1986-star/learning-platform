import { NextRequest, NextResponse } from "next/server";

import { assertCanCreateWorksheet } from "@/lib/billing/access";
import { saveWorksheet } from "@/lib/worksheets/repository";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { requireVerifiedClassendoEmail } from "@/lib/auth/server-verification";
import type { LessonCard } from "@/lib/lessons/types";
import type { WorksheetDraft, WorksheetType } from "@/lib/worksheets/types";

export const runtime = "nodejs";

type SaveWorksheetRequest = {
  worksheetId?: string | null;
  name?: string;
  worksheetType?: string;
  isPublic?: boolean;
  cards?: unknown[];
  draft?: Record<string, unknown>;
};

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return "Failed to save worksheet.";
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "You must be signed in to save worksheets." }, { status: 401 });
    }

    const body = (await request.json()) as SaveWorksheetRequest;
    const supabase = getSupabaseAdmin();

    if (body.isPublic) {
      try {
        await requireVerifiedClassendoEmail(user.id);
      } catch {
        return NextResponse.json({ error: "Verify your email before publishing a worksheet." }, { status: 403 });
      }
    }

    if (!body.worksheetId) {
      await assertCanCreateWorksheet(supabase, user.id);
    }

    const savedWorksheet = await saveWorksheet(supabase, {
      worksheetId: body.worksheetId ?? null,
      userId: user.id,
      name: String(body.name ?? ""),
      worksheetType: String(body.worksheetType ?? "crossword") as WorksheetType,
      isPublic: Boolean(body.isPublic ?? false),
      cards: (Array.isArray(body.cards) ? body.cards : []) as LessonCard[],
      draft: (body.draft ?? {}) as WorksheetDraft,
    });

    return NextResponse.json(savedWorksheet);
  } catch (error: unknown) {
    console.error("Failed to save worksheet via API:", error);
    const message = getErrorMessage(error);
    return NextResponse.json(
      { error: message },
      { status: /upgrade to premium|free accounts can save/i.test(message) ? 403 : 500 }
    );
  }
}
