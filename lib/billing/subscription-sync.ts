import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

function toIsoDate(value: number | null | undefined) {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

export async function upsertStripeCustomerLink(params: {
  supabase: SupabaseClient;
  userId: string;
  stripeCustomerId: string;
  stripeLivemode?: boolean | null;
}) {
  const { error } = await params.supabase.from("user_subscriptions").upsert(
    {
      user_id: params.userId,
      stripe_customer_id: params.stripeCustomerId,
      stripe_livemode: params.stripeLivemode ?? null,
      subscription_tier: "free",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
}

async function findUserIdForSubscription(params: {
  supabase: SupabaseClient;
  subscription: Stripe.Subscription;
  fallbackUserId?: string | null;
}) {
  const metadataUserId =
    params.subscription.metadata?.supabase_user_id
    || params.fallbackUserId
    || null;

  if (metadataUserId) return metadataUserId;

  const customerId =
    typeof params.subscription.customer === "string"
      ? params.subscription.customer
      : params.subscription.customer?.id ?? null;

  if (!customerId) return null;

  const { data, error } = await params.supabase
    .from("user_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) throw error;
  return data?.user_id ? String(data.user_id) : null;
}

export async function syncStripeSubscription(params: {
  supabase: SupabaseClient;
  subscription: Stripe.Subscription;
  fallbackUserId?: string | null;
}) {
  const userId = await findUserIdForSubscription(params);
  if (!userId) {
    throw new Error(`Could not determine Classendo user for Stripe subscription ${params.subscription.id}.`);
  }

  const customerId =
    typeof params.subscription.customer === "string"
      ? params.subscription.customer
      : params.subscription.customer?.id ?? null;

  const subscriptionItem = params.subscription.items.data[0];
  const priceId = subscriptionItem?.price?.id ?? null;
  const billingInterval = subscriptionItem?.price?.recurring?.interval ?? null;
  const { error } = await params.supabase.from("user_subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: params.subscription.id,
      subscription_status: params.subscription.status,
      subscription_tier: params.subscription.status === "canceled" ? "free" : "premium",
      price_id: priceId,
      billing_interval:
        billingInterval === "month" || billingInterval === "year"
          ? billingInterval
          : null,
      current_period_end: toIsoDate(subscriptionItem?.current_period_end),
      cancel_at_period_end: Boolean(params.subscription.cancel_at_period_end),
      stripe_livemode: Boolean(params.subscription.livemode),
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
}
