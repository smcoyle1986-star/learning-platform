import { NextResponse } from "next/server";

import { getStripePriceId, getStripeServer } from "@/lib/server/stripe";

export const runtime = "nodejs";

function serializePrice(price: Awaited<ReturnType<ReturnType<typeof getStripeServer>["prices"]["retrieve"]>>) {
  return {
    id: price.id,
    currency: price.currency,
    unitAmount: price.unit_amount,
    interval: price.recurring?.interval ?? null,
    intervalCount: price.recurring?.interval_count ?? null,
  };
}

export async function GET() {
  try {
    const stripe = getStripeServer();
    const [monthly, yearly] = await Promise.all([
      stripe.prices.retrieve(getStripePriceId("monthly")),
      stripe.prices.retrieve(getStripePriceId("yearly")),
    ]);

    return NextResponse.json({
      monthly: serializePrice(monthly),
      yearly: serializePrice(yearly),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load Stripe pricing.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
