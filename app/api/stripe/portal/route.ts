import { NextRequest, NextResponse } from "next/server";

import { getBillingAccessForUser } from "@/lib/billing/access";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getAppBaseUrl, getStripeServer } from "@/lib/server/stripe";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user?.id) {
      return NextResponse.json({ error: "You must be signed in to manage billing." }, { status: 401 });
    }

    const access = await getBillingAccessForUser(getSupabaseAdmin(), user.id);
    const customerId = access.subscription?.stripeCustomerId;

    if (!customerId) {
      return NextResponse.json(
        { error: "No Stripe billing account was found for this user yet." },
        { status: 400 }
      );
    }

    const session = await getStripeServer().billingPortal.sessions.create({
      customer: customerId,
      return_url: `${getAppBaseUrl()}/profile`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    console.error("Failed to create Stripe billing portal session:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to open billing portal." },
      { status: 500 }
    );
  }
}
