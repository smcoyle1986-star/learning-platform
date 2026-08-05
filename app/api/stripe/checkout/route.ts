import { NextRequest, NextResponse } from "next/server";

import { getBillingAccessForUser } from "@/lib/billing/access";
import { upsertStripeCustomerLink } from "@/lib/billing/subscription-sync";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getAppBaseUrl, getStripePriceId, getStripeServer } from "@/lib/server/stripe";

export const runtime = "nodejs";

type CheckoutBody = {
  plan?: "monthly" | "yearly";
};

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user?.id || !user.email) {
      return NextResponse.json({ error: "You must be signed in to upgrade." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as CheckoutBody;
    const plan = body.plan === "yearly" ? "yearly" : "monthly";
    const supabase = getSupabaseAdmin();
    const access = await getBillingAccessForUser(supabase, user.id);

    if (access.isPremium && access.premiumAccessSource !== "welcome_trial") {
      return NextResponse.json({ error: "Your account is already Premium." }, { status: 400 });
    }

    const stripe = getStripeServer();
    let customerId = access.subscription?.stripeCustomerId ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      await upsertStripeCustomerLink({
        supabase,
        userId: user.id,
        stripeCustomerId: customer.id,
        stripeLivemode: customer.livemode,
      });
    }

    const baseUrl = getAppBaseUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      adaptive_pricing: {
        enabled: true,
      },
      customer: customerId,
      client_reference_id: user.id,
      success_url: `${baseUrl}/landing?premium=welcome`,
      cancel_url: `${baseUrl}/upgrade?checkout=cancelled`,
      line_items: [
        {
          price: getStripePriceId(plan),
          quantity: 1,
        },
      ],
      metadata: {
        supabase_user_id: user.id,
        subscription_tier: "premium",
        billing_plan: plan,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
          subscription_tier: "premium",
          billing_plan: plan,
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      throw new Error("Stripe checkout did not return a redirect URL.");
    }

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Failed to create Stripe checkout session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start checkout." },
      { status: 500 }
    );
  }
}
