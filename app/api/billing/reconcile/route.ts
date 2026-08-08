import { NextRequest, NextResponse } from "next/server";

import { getBillingAccessForUser } from "@/lib/billing/access";
import { syncStripeSubscription } from "@/lib/billing/subscription-sync";
import { getRequestUser } from "@/lib/server/request-auth";
import { getStripeServer } from "@/lib/server/stripe";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "You must be signed in to refresh billing." }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();
    const access = await getBillingAccessForUser(supabase, user.id);
    const subscriptionId = access.subscription?.stripeSubscriptionId;
    if (!subscriptionId) {
      return NextResponse.json({ error: "No Stripe subscription was found for this user." }, { status: 404 });
    }

    const subscription = await getStripeServer().subscriptions.retrieve(subscriptionId);
    await syncStripeSubscription({
      supabase,
      subscription,
      fallbackUserId: user.id,
    });

    return NextResponse.json(await getBillingAccessForUser(supabase, user.id));
  } catch (error: unknown) {
    console.error("Failed to refresh billing from Stripe:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refresh billing." },
      { status: 500 }
    );
  }
}
