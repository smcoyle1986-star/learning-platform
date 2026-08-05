import { NextRequest, NextResponse } from "next/server";

import { AdminAuthorizationError, requireAdmin, requireOwner } from "@/lib/admin/auth";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type SetAction = "feature" | "unfeature" | "hide" | "unhide" | "delete" | "restore";

class SetActionError extends Error {
  constructor(public readonly status: 400 | 403 | 404 | 409, message: string) {
    super(message);
  }
}

function snapshot(value: Record<string, unknown>) {
  return {
    is_public: value.is_public ?? false,
    is_featured: value.is_featured ?? false,
    featured_at: value.featured_at ?? null,
    hidden_at: value.hidden_at ?? null,
    deleted_at: value.deleted_at ?? null,
    moderation_note: value.moderation_note ?? null,
  };
}

export async function POST(request: NextRequest, context: { params: Promise<{ setId: string }> }) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) {
      throw new SetActionError(403, "Invalid request origin.");
    }
    const body = await request.json() as { action?: SetAction; reason?: unknown };
    const actions = new Set<SetAction>(["feature", "unfeature", "hide", "unhide", "delete", "restore"]);
    if (!body.action || !actions.has(body.action)) {
      throw new SetActionError(400, "Unknown moderation action.");
    }
    const administrator = body.action === "delete"
      ? await requireOwner({ requireMfa: true })
      : await requireAdmin();
    const reason = typeof body.reason === "string" ? body.reason.trim() : "";
    if (["hide", "delete", "restore"].includes(body.action) && (reason.length < 5 || reason.length > 500)) {
      throw new SetActionError(400, "Add a moderation reason of 5 to 500 characters.");
    }

    const { setId } = await context.params;
    const supabase = getSupabaseAdmin();
    const fields = "id,is_public,is_featured,featured_at,featured_by,hidden_at,hidden_by,deleted_at,deleted_by,moderation_note";
    const { data: existing, error: existingError } = await supabase.from("lesson_sets").select(fields).eq("id", setId).maybeSingle();
    if (existingError) throw existingError;
    if (!existing) throw new SetActionError(404, "The lesson set no longer exists.");

    const now = new Date().toISOString();
    let update: Record<string, unknown>;
    if (body.action === "feature") {
      if (existing.deleted_at || existing.hidden_at || !existing.is_public) throw new SetActionError(409, "Only visible public sets can be featured.");
      update = { is_featured: true, featured_at: now, featured_by: administrator.userId };
    } else if (body.action === "unfeature") {
      update = { is_featured: false, featured_at: null, featured_by: null };
    } else if (body.action === "hide") {
      if (existing.deleted_at) throw new SetActionError(409, "Deleted sets cannot be hidden.");
      update = { is_public: false, is_featured: false, featured_at: null, featured_by: null, hidden_at: now, hidden_by: administrator.userId, moderation_note: reason };
    } else if (body.action === "unhide") {
      if (existing.deleted_at) throw new SetActionError(409, "Restore this set before making it visible.");
      update = { is_public: true, hidden_at: null, hidden_by: null, moderation_note: reason || null };
    } else if (body.action === "delete") {
      update = { is_public: false, is_featured: false, featured_at: null, featured_by: null, deleted_at: now, deleted_by: administrator.userId, moderation_note: reason };
    } else {
      if (!existing.deleted_at) throw new SetActionError(409, "This set is not deleted.");
      update = { is_public: false, deleted_at: null, deleted_by: null, moderation_note: reason };
    }

    const { data: updated, error: updateError } = await supabase.from("lesson_sets").update(update).eq("id", setId).select(fields).single();
    if (updateError) throw updateError;
    await writeAdminAuditLog({
      actorUserId: administrator.userId,
      action: `admin.community_set_${body.action}`,
      targetType: "lesson_set",
      targetId: setId,
      beforeState: snapshot(existing),
      afterState: snapshot(updated),
    });
    return NextResponse.json({ ok: true, message: `Community set ${body.action} action completed.` });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: error.code === "mfa_required" ? "Verify your owner MFA session before deleting a set." : "You are not authorized to moderate this set.", code: error.code }, { status: error.status });
    }
    if (error instanceof SetActionError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Administrator Community moderation failed:", error);
    return NextResponse.json({ error: "The Community set could not be updated." }, { status: 500 });
  }
}
