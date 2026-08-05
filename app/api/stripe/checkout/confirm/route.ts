import { NextRequest, NextResponse } from "next/server";

import { syncStripeSubscription, upsertStripeCustomerLink } from "@/lib/billing/subscription-sync";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getStripeServer } from "@/lib/server/stripe";

export const runtime = "nodejs";

type ConfirmCheckoutBody = {
  sessionId?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "You must be signed in to confirm checkout." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as ConfirmCheckoutBody;
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    if (!sessionId.startsWith("cs_")) {
      return NextResponse.json({ error: "A valid Checkout Session is required." }, { status: 400 });
    }

    const stripe = getStripeServer();
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    const sessionUserId = session.metadata?.supabase_user_id || session.client_reference_id;

    if (!sessionUserId || sessionUserId !== user.id) {
      return NextResponse.json({ error: "This Checkout Session does not belong to your account." }, { status: 403 });
    }

    if (session.status !== "complete" || session.payment_status === "unpaid") {
      return NextResponse.json(
        { error: "Stripe has not completed this checkout yet.", pending: true },
        { status: 409 },
      );
    }

    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
    const subscription =
      typeof session.subscription === "string"
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;

    if (!customerId || !subscription) {
      return NextResponse.json(
        { error: "Stripe has not attached the subscription yet.", pending: true },
        { status: 409 },
      );
    }

    const supabase = getSupabaseAdmin();
    await upsertStripeCustomerLink({
      supabase,
      userId: user.id,
      stripeCustomerId: customerId,
      stripeLivemode: session.livemode,
    });
    await syncStripeSubscription({
      supabase,
      subscription,
      fallbackUserId: user.id,
    });

    return NextResponse.json({ ok: true, subscriptionStatus: subscription.status });
  } catch (error: unknown) {
    console.error("Failed to confirm Stripe checkout:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Checkout confirmation failed." },
      { status: 500 },
    );
  }
}
