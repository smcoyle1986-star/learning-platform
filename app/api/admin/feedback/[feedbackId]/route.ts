import { NextRequest, NextResponse } from "next/server";

import {
  AdminAuthorizationError,
  requireAdmin,
  requireOwner,
} from "@/lib/admin/auth";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type FeedbackAction =
  | "mark_read"
  | "resolve"
  | "reopen"
  | "save_note"
  | "delete";

class FeedbackActionError extends Error {
  constructor(
    public readonly status: 400 | 403 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = "FeedbackActionError";
  }
}

function verifySameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    throw new FeedbackActionError(403, "Invalid request origin.");
  }
}

function actionState(value: Record<string, unknown>) {
  const note =
    typeof value.admin_note === "string" ? value.admin_note.trim() : "";
  return {
    status: value.status ?? null,
    read_at: value.read_at ?? null,
    resolved_at: value.resolved_at ?? null,
    deleted_at: value.deleted_at ?? null,
    handled_by: value.handled_by ?? null,
    admin_note_present: Boolean(note),
    admin_note_length: note.length,
  };
}

function errorResponse(error: unknown) {
  if (error instanceof AdminAuthorizationError) {
    return NextResponse.json(
      {
        error:
          error.code === "mfa_required"
            ? "Verify your owner MFA session before deleting feedback."
            : "You are not authorized to update feedback.",
        code: error.code,
      },
      { status: error.status },
    );
  }

  if (error instanceof FeedbackActionError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  console.error("Administrator feedback action failed:", error);
  return NextResponse.json(
    { error: "The feedback item could not be updated." },
    { status: 500 },
  );
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ feedbackId: string }> },
) {
  try {
    verifySameOrigin(request);
    const body = await request.json() as {
      action?: FeedbackAction;
      note?: unknown;
    };
    const allowedActions = new Set<FeedbackAction>([
      "mark_read",
      "resolve",
      "reopen",
      "save_note",
      "delete",
    ]);
    if (!body.action || !allowedActions.has(body.action)) {
      throw new FeedbackActionError(400, "Unknown feedback action.");
    }

    const administrator =
      body.action === "delete"
        ? await requireOwner({ requireMfa: true })
        : await requireAdmin();
    const { feedbackId } = await context.params;
    const supabase = getSupabaseAdmin();
    const { data: existing, error: existingError } = await supabase
      .from("user_feedback")
      .select(
        "id,status,admin_note,read_at,resolved_at,deleted_at,handled_by,updated_at",
      )
      .eq("id", feedbackId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      throw new FeedbackActionError(404, "The feedback item no longer exists.");
    }
    if (existing.status === "deleted") {
      throw new FeedbackActionError(
        409,
        "Deleted feedback cannot be changed.",
      );
    }
    if (body.action === "mark_read" && existing.status !== "pending") {
      throw new FeedbackActionError(
        409,
        "Only pending feedback can be marked as read.",
      );
    }
    if (
      body.action === "resolve"
      && existing.status !== "pending"
      && existing.status !== "read"
    ) {
      throw new FeedbackActionError(
        409,
        "Only pending or read feedback can be resolved.",
      );
    }
    if (body.action === "reopen" && existing.status !== "resolved") {
      throw new FeedbackActionError(
        409,
        "Only resolved feedback can be reopened.",
      );
    }

    const now = new Date().toISOString();
    let update: Record<string, unknown>;
    let auditAction: string;
    let responseMessage: string;

    if (body.action === "mark_read") {
      update = {
        status: "read",
        read_at: existing.read_at ?? now,
        handled_by: administrator.userId,
        updated_at: now,
      };
      auditAction = "admin.feedback_marked_read";
      responseMessage = "Feedback marked as read.";
    } else if (body.action === "resolve") {
      update = {
        status: "resolved",
        read_at: existing.read_at ?? now,
        resolved_at: now,
        handled_by: administrator.userId,
        updated_at: now,
      };
      auditAction = "admin.feedback_resolved";
      responseMessage = "Feedback resolved.";
    } else if (body.action === "reopen") {
      update = {
        status: "read",
        resolved_at: null,
        handled_by: administrator.userId,
        updated_at: now,
      };
      auditAction = "admin.feedback_reopened";
      responseMessage = "Feedback reopened.";
    } else if (body.action === "save_note") {
      const note = typeof body.note === "string" ? body.note.trim() : "";
      if (note.length > 4000) {
        throw new FeedbackActionError(
          400,
          "Internal notes cannot exceed 4000 characters.",
        );
      }
      update = {
        admin_note: note || null,
        handled_by: administrator.userId,
        updated_at: now,
      };
      auditAction = "admin.feedback_note_updated";
      responseMessage = "Internal note saved.";
    } else {
      update = {
        status: "deleted",
        deleted_at: now,
        handled_by: administrator.userId,
        updated_at: now,
      };
      auditAction = "admin.feedback_deleted";
      responseMessage = "Feedback deleted from the active inbox.";
    }

    const { data: updated, error: updateError } = await supabase
      .from("user_feedback")
      .update(update)
      .eq("id", feedbackId)
      .neq("status", "deleted")
      .select(
        "status,admin_note,read_at,resolved_at,deleted_at,handled_by,updated_at",
      )
      .maybeSingle();
    if (updateError) throw updateError;
    if (!updated) {
      throw new FeedbackActionError(
        409,
        "The feedback item changed before this action completed.",
      );
    }

    await writeAdminAuditLog({
      actorUserId: administrator.userId,
      action: auditAction,
      targetType: "user_feedback",
      targetId: feedbackId,
      beforeState: actionState(existing),
      afterState: actionState(updated),
    });

    return NextResponse.json({
      ok: true,
      message: responseMessage,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
