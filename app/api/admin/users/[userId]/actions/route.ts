import { NextRequest, NextResponse } from "next/server";

import {
  AdminAuthorizationError,
  requireOwner,
} from "@/lib/admin/auth";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type ActionBody = {
  action?:
    | "grant_complimentary"
    | "revoke_complimentary"
    | "suspend"
    | "restore"
    | "delete";
  reason?: string;
  durationDays?: number | null;
  confirmationEmail?: string;
};

class AdminUserActionError extends Error {
  constructor(
    public readonly status: 400 | 403 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = "AdminUserActionError";
  }
}

function validReason(value: unknown) {
  const reason = typeof value === "string" ? value.trim() : "";
  if (reason.length < 5 || reason.length > 500) {
    throw new AdminUserActionError(
      400,
      "Provide a reason between 5 and 500 characters.",
    );
  }
  return reason;
}

function bannedUntil(user: unknown) {
  if (!user || typeof user !== "object") return null;
  const value = (user as Record<string, unknown>).banned_until;
  return typeof value === "string" ? value : null;
}

function verifySameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) {
    throw new AdminUserActionError(403, "Invalid request origin.");
  }
}

function errorResponse(error: unknown) {
  if (error instanceof AdminAuthorizationError) {
    return NextResponse.json(
      {
        error:
          error.code === "mfa_required"
            ? "Verify your owner MFA session before performing this action."
            : "You are not authorized to perform this action.",
        code: error.code,
      },
      { status: error.status },
    );
  }

  if (error instanceof AdminUserActionError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  console.error("Administrator user action failed:", error);
  return NextResponse.json(
    { error: "The administrator action could not be completed." },
    { status: 500 },
  );
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    verifySameOrigin(request);
    const owner = await requireOwner({ requireMfa: true });
    const { userId } = await context.params;
    const body = await request.json() as ActionBody;
    const reason = validReason(body.reason);
    const supabase = getSupabaseAdmin();
    const {
      data: { user: targetUser },
      error: targetError,
    } = await supabase.auth.admin.getUserById(userId);

    if (targetError || !targetUser) {
      throw new AdminUserActionError(404, "The selected user no longer exists.");
    }

    const [{ data: targetMembership, error: membershipError }, { data: subscription, error: subscriptionError }] =
      await Promise.all([
        supabase
          .from("admin_memberships")
          .select("role")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("user_subscriptions")
          .select("subscription_tier,subscription_status")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);

    if (membershipError) throw membershipError;
    if (subscriptionError) throw subscriptionError;

    const protectedAccount = Boolean(targetMembership);
    const self = owner.userId === userId;
    const stripePremium =
      String(subscription?.subscription_tier ?? "").toLowerCase() === "premium"
      && ["active", "trialing", "past_due"].includes(
        String(subscription?.subscription_status ?? "").toLowerCase(),
      );

    if (body.action === "grant_complimentary") {
      if (stripePremium) {
        throw new AdminUserActionError(
          409,
          "This user already has Stripe-backed premium access.",
        );
      }

      const allowedDurations = new Set<number | null>([30, 90, 365, null]);
      const durationDays =
        body.durationDays === null || body.durationDays === undefined
          ? null
          : Number(body.durationDays);
      if (!allowedDurations.has(durationDays)) {
        throw new AdminUserActionError(400, "Invalid grant duration.");
      }
      const expiresAt = durationDays
        ? new Date(Date.now() + durationDays * 86_400_000).toISOString()
        : null;

      const { error } = await supabase.rpc("admin_set_user_premium_grant", {
        target_user_id: userId,
        actor_user_id: owner.userId,
        grant_enabled: true,
        grant_reason: reason,
        grant_expires_at: expiresAt,
      });
      if (error) throw error;

      return NextResponse.json({ ok: true, message: "Complimentary premium access granted." });
    }

    if (body.action === "revoke_complimentary") {
      const { error } = await supabase.rpc("admin_set_user_premium_grant", {
        target_user_id: userId,
        actor_user_id: owner.userId,
        grant_enabled: false,
        grant_reason: reason,
        grant_expires_at: null,
      });
      if (error) throw error;

      return NextResponse.json({ ok: true, message: "Complimentary premium access revoked." });
    }

    if (body.action === "suspend" || body.action === "restore") {
      if (self || (body.action === "suspend" && protectedAccount)) {
        throw new AdminUserActionError(
          403,
          "Administrator accounts cannot be suspended from user management.",
        );
      }

      const restoring = body.action === "restore";
      await writeAdminAuditLog({
        actorUserId: owner.userId,
        action: restoring
          ? "admin.user_restore_requested"
          : "admin.user_suspend_requested",
        targetType: "auth_user",
        targetId: userId,
        beforeState: { banned_until: bannedUntil(targetUser) },
        metadata: { reason },
      });

      const { data, error } = await supabase.auth.admin.updateUserById(
        userId,
        { ban_duration: restoring ? "none" : "876000h" },
      );
      if (error) throw error;

      await writeAdminAuditLog({
        actorUserId: owner.userId,
        action: restoring ? "admin.user_restored" : "admin.user_suspended",
        targetType: "auth_user",
        targetId: userId,
        beforeState: { banned_until: bannedUntil(targetUser) },
        afterState: { banned_until: bannedUntil(data.user) },
        metadata: { reason },
      });

      return NextResponse.json({
        ok: true,
        message: restoring ? "User access restored." : "User suspended.",
      });
    }

    if (body.action === "delete") {
      if (self || protectedAccount) {
        throw new AdminUserActionError(
          403,
          "Administrator accounts cannot be deleted from user management.",
        );
      }

      const expectedEmail = targetUser.email?.trim().toLowerCase() ?? "";
      const confirmationEmail = body.confirmationEmail?.trim().toLowerCase() ?? "";
      if (!expectedEmail || confirmationEmail !== expectedEmail) {
        throw new AdminUserActionError(
          400,
          "The confirmation email does not match the selected account.",
        );
      }

      await writeAdminAuditLog({
        actorUserId: owner.userId,
        action: "admin.user_delete_requested",
        targetType: "auth_user",
        targetId: userId,
        beforeState: {
          email: targetUser.email ?? null,
          created_at: targetUser.created_at,
          banned_until: bannedUntil(targetUser),
        },
        metadata: { reason },
      });

      const { error } = await supabase.auth.admin.deleteUser(userId, false);
      if (error) throw error;

      await writeAdminAuditLog({
        actorUserId: owner.userId,
        action: "admin.user_deleted",
        targetType: "auth_user",
        targetId: userId,
        beforeState: { email: targetUser.email ?? null },
        afterState: null,
        metadata: { reason },
      });

      return NextResponse.json({ ok: true, message: "User permanently deleted." });
    }

    throw new AdminUserActionError(400, "Unknown administrator action.");
  } catch (error) {
    return errorResponse(error);
  }
}
