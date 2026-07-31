import { NextRequest, NextResponse } from "next/server";

import {
  AdminAuthorizationError,
  requireOwner,
} from "@/lib/admin/auth";
import { writeAdminAuditLog } from "@/lib/admin/audit";
import { syncStripeSubscription } from "@/lib/billing/subscription-sync";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getStripeServer } from "@/lib/server/stripe";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  if (error instanceof AdminAuthorizationError) {
    return NextResponse.json(
      {
        error:
          error.code === "mfa_required"
            ? "Verify your owner MFA session before reconciling billing."
            : "You are not authorized to reconcile billing.",
        code: error.code,
      },
      { status: error.status },
    );
  }

  console.error("Administrator subscription reconciliation failed:", error);
  return NextResponse.json(
    { error: "The subscription could not be reconciled." },
    { status: 500 },
  );
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> },
) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || origin !== request.nextUrl.origin) {
      return NextResponse.json(
        { error: "Invalid request origin." },
        { status: 403 },
      );
    }

    const owner = await requireOwner({ requireMfa: true });
    const { userId } = await context.params;
    const supabase = getSupabaseAdmin();
    const { data: record, error: recordError } = await supabase
      .from("user_subscriptions")
      .select(
        "stripe_subscription_id,subscription_status,price_id,billing_interval,current_period_end,cancel_at_period_end,stripe_livemode,last_synced_at",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (recordError) throw recordError;
    if (!record?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "This user does not have a Stripe subscription to reconcile." },
        { status: 400 },
      );
    }

    await writeAdminAuditLog({
      actorUserId: owner.userId,
      action: "admin.subscription_reconcile_requested",
      targetType: "user_subscription",
      targetId: userId,
      beforeState: record,
      metadata: {
        stripe_subscription_id: record.stripe_subscription_id,
      },
    });

    const subscription = await getStripeServer().subscriptions.retrieve(
      record.stripe_subscription_id,
    );
    await syncStripeSubscription({
      supabase,
      subscription,
      fallbackUserId: userId,
    });

    const { data: updated, error: updatedError } = await supabase
      .from("user_subscriptions")
      .select(
        "subscription_status,price_id,billing_interval,current_period_end,cancel_at_period_end,stripe_livemode,last_synced_at",
      )
      .eq("user_id", userId)
      .single();
    if (updatedError) throw updatedError;

    await writeAdminAuditLog({
      actorUserId: owner.userId,
      action: "admin.subscription_reconciled",
      targetType: "user_subscription",
      targetId: userId,
      beforeState: record,
      afterState: updated,
      metadata: {
        stripe_subscription_id: record.stripe_subscription_id,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Subscription synchronized from Stripe.",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
