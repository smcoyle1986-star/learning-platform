import { NextRequest, NextResponse } from "next/server";

import { AdminAuthorizationError, requireAdmin } from "@/lib/admin/auth";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

class ReportActionError extends Error {
  constructor(public readonly status: 400 | 403 | 404 | 409, message: string) {
    super(message);
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ reportId: string }> }) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) throw new ReportActionError(403, "Invalid request origin.");
    const administrator = await requireAdmin();
    const body = await request.json() as { action?: "resolve" | "dismiss"; note?: unknown };
    if (body.action !== "resolve" && body.action !== "dismiss") throw new ReportActionError(400, "Unknown report action.");
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (note.length < 3 || note.length > 500) throw new ReportActionError(400, "Add a resolution note of 3 to 500 characters.");

    const { reportId } = await context.params;
    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from("community_reports")
      .select("id,status,resolution_note,resolved_at,resolved_by,lesson_set_id")
      .eq("id", reportId)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) throw new ReportActionError(404, "The report no longer exists.");
    if (existing.status !== "pending") throw new ReportActionError(409, "This report has already been reviewed.");

    const update = {
      status: body.action === "resolve" ? "resolved" : "dismissed",
      resolution_note: note,
      resolved_at: new Date().toISOString(),
      resolved_by: administrator.userId,
      updated_at: new Date().toISOString(),
    };
    const { data: updated, error: updateError } = await supabase
      .from("community_reports")
      .update(update)
      .eq("id", reportId)
      .eq("status", "pending")
      .select("status,resolution_note,resolved_at,resolved_by")
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) throw new ReportActionError(409, "The report changed before this action completed.");

    await writeAdminAuditLog({
      actorUserId: administrator.userId,
      action: `admin.community_report_${body.action === "resolve" ? "resolved" : "dismissed"}`,
      targetType: "community_report",
      targetId: reportId,
      beforeState: { status: existing.status, resolution_note_present: Boolean(existing.resolution_note) },
      afterState: { status: updated.status, resolution_note_present: true, resolved_at: updated.resolved_at },
      metadata: { lesson_set_id: existing.lesson_set_id },
    });
    return NextResponse.json({ ok: true, message: `Report ${updated.status}.` });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return NextResponse.json({ error: "You are not authorized to review reports.", code: error.code }, { status: error.status });
    if (error instanceof ReportActionError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Administrator Community report action failed:", error);
    return NextResponse.json({ error: "The report could not be updated." }, { status: 500 });
  }
}
