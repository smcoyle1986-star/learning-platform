import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

function toIsoDate(value: number | null | undefined) {
  if (!value) return null;
  return new Date(value * 1000).toISOString();
}

function isPaidPremiumState(value: {
  subscription_tier?: unknown;
  subscription_status?: unknown;
} | null | undefined) {
  const tier = String(value?.subscription_tier ?? "").toLocaleLowerCase();
  const status = String(value?.subscription_status ?? "").toLocaleLowerCase();
  return tier === "premium" && (status === "active" || status === "trialing");
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
  const scheduledCancellation = Boolean(
    params.subscription.cancel_at_period_end || params.subscription.cancel_at,
  );
  const nextState = {
    subscription_tier: params.subscription.status === "canceled" ? "free" : "premium",
    subscription_status: params.subscription.status,
  };
  const { error } = await params.supabase.from("user_subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: params.subscription.id,
      subscription_status: nextState.subscription_status,
      subscription_tier: nextState.subscription_tier,
      price_id: priceId,
      billing_interval:
        billingInterval === "month" || billingInterval === "year"
          ? billingInterval
          : null,
      current_period_end: toIsoDate(subscriptionItem?.current_period_end),
      cancel_at_period_end: scheduledCancellation,
      stripe_livemode: Boolean(params.subscription.livemode),
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(isPaidPremiumState(nextState)
        ? { basic_lesson_access_assigned_at: null }
        : {}),
    },
    { onConflict: "user_id" }
  );

  if (error) throw error;

  if (isPaidPremiumState(nextState)) {
    const { error: analyticsError } = await params.supabase
      .from("analytics_events")
      .insert({
        event_type: "premium_upgrade",
        event_key: `premium:${params.subscription.id}`,
        user_id: userId,
        item_key: billingInterval ?? "unclassified",
        item_label: billingInterval === "year" ? "Yearly Premium" : "Monthly Premium",
        category: "subscription",
      });
    if (analyticsError && analyticsError.code !== "23505") {
      // Billing state remains authoritative even if optional analytics is unavailable.
      console.error("Premium upgrade analytics failed:", analyticsError);
    }
  }
}
