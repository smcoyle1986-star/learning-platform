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
}) {
  const { error } = await params.supabase.from("user_subscriptions").upsert(
    {
      user_id: params.userId,
      stripe_customer_id: params.stripeCustomerId,
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
  const subscriptionWithPeriod = params.subscription as Stripe.Subscription & {
    current_period_end?: number | null;
  };
  const userId = await findUserIdForSubscription(params);
  if (!userId) {
    throw new Error(`Could not determine Classendo user for Stripe subscription ${params.subscription.id}.`);
  }

  const customerId =
    typeof params.subscription.customer === "string"
      ? params.subscription.customer
      : params.subscription.customer?.id ?? null;

  const priceId = params.subscription.items.data[0]?.price?.id ?? null;
  const { error } = await params.supabase.from("user_subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: params.subscription.id,
      subscription_status: params.subscription.status,
      subscription_tier: params.subscription.status === "canceled" ? "free" : "premium",
      price_id: priceId,
      current_period_end: toIsoDate(subscriptionWithPeriod.current_period_end),
      cancel_at_period_end: Boolean(params.subscription.cancel_at_period_end),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;
}
