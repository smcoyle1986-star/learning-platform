import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";

import { syncStripeSubscription, upsertStripeCustomerLink } from "@/lib/billing/subscription-sync";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getStripeServer, getStripeWebhookSecret } from "@/lib/server/stripe";

export const runtime = "nodejs";

async function hasProcessedEvent(eventId: string) {
  const supabase = getSupabaseAdmin();
  const { data: existing, error: existingError } = await supabase
    .from("stripe_webhook_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();

  if (existingError) throw existingError;
  return Boolean(existing?.event_id);
}

async function markEventProcessed(event: Stripe.Event) {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("stripe_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
    livemode: Boolean(event.livemode),
    payload: event,
  });

  if (error) throw error;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
    }

    const stripe = getStripeServer();
    const event = stripe.webhooks.constructEvent(body, signature, getStripeWebhookSecret());
    const alreadyProcessed = await hasProcessedEvent(event.id);
    if (alreadyProcessed) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const supabase = getSupabaseAdmin();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId =
          session.metadata?.supabase_user_id
          || session.client_reference_id
          || null;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;

        if (userId && customerId) {
          await upsertStripeCustomerLink({
            supabase,
            userId,
            stripeCustomerId: customerId,
            stripeLivemode: session.livemode,
          });
        }

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncStripeSubscription({
            supabase,
            subscription,
            fallbackUserId: userId,
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncStripeSubscription({
          supabase,
          subscription: event.data.object,
        });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription | null;
        };
        const subscriptionId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id ?? null;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await syncStripeSubscription({
            supabase,
            subscription,
          });
        }
        break;
      }
      default:
        break;
    }

    await markEventProcessed(event);

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("Stripe webhook handling failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook handling failed." },
      { status: 500 }
    );
  }
}
