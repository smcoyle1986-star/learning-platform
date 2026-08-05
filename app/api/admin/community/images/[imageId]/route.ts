import { NextRequest, NextResponse } from "next/server";

import { AdminAuthorizationError, requireAdmin, requireOwner } from "@/lib/admin/auth";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type ImageAction = "hide" | "restore" | "delete";

class ImageActionError extends Error {
  constructor(public readonly status: 400 | 403 | 404 | 409, message: string) {
    super(message);
  }
}

function snapshot(value: Record<string, unknown>) {
  return {
    status: value.status ?? null,
    deleted_at: value.deleted_at ?? null,
    moderation_note: value.moderation_note ?? null,
    moderated_at: value.moderated_at ?? null,
  };
}

export async function POST(request: NextRequest, context: { params: Promise<{ imageId: string }> }) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) throw new ImageActionError(403, "Invalid request origin.");
    const body = await request.json() as { action?: ImageAction; reason?: unknown };
    if (body.action !== "hide" && body.action !== "restore" && body.action !== "delete") throw new ImageActionError(400, "Unknown image action.");
    const administrator = body.action === "delete" ? await requireOwner({ requireMfa: true }) : await requireAdmin();
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (reason.length < 5 || reason.length > 500) throw new ImageActionError(400, "Add a moderation reason of 5 to 500 characters.");

    const { imageId } = await context.params;
    const supabase = getSupabaseAdmin();
    const fields = "id,status,deleted_at,moderation_note,moderated_at,moderated_by";
    const { data: existing, error: existingError } = await supabase.from("creator_images").select(fields).eq("id", imageId).maybeSingle();
    if (existingError) throw existingError;
    if (!existing) throw new ImageActionError(404, "The Creator image no longer exists.");
    if (body.action === "restore" && !existing.deleted_at && existing.status === "ready") throw new ImageActionError(409, "This image is already available.");

    const now = new Date().toISOString();
    const update = body.action === "restore"
      ? { status: "ready", deleted_at: null, moderation_note: reason, moderated_at: now, moderated_by: administrator.userId }
      : body.action === "delete"
        ? { status: "rejected", deleted_at: now, moderation_note: reason, moderated_at: now, moderated_by: administrator.userId }
        : { status: "rejected", moderation_note: reason, moderated_at: now, moderated_by: administrator.userId };
    const { data: updated, error: updateError } = await supabase.from("creator_images").update(update).eq("id", imageId).select(fields).single();
    if (updateError) throw updateError;

    await writeAdminAuditLog({
      actorUserId: administrator.userId,
      action: `admin.creator_image_${body.action}`,
      targetType: "creator_image",
      targetId: imageId,
      beforeState: snapshot(existing),
      afterState: snapshot(updated),
    });
    return NextResponse.json({ ok: true, message: `Creator image ${body.action} action completed.` });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return NextResponse.json({ error: error.code === "mfa_required" ? "Verify your owner MFA session before deleting an image." : "You are not authorized to moderate Creator images.", code: error.code }, { status: error.status });
    if (error instanceof ImageActionError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Administrator Creator image action failed:", error);
    return NextResponse.json({ error: "The Creator image could not be updated." }, { status: 500 });
  }
}
