import "server-only";

import { unstable_cache } from "next/cache";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getStripeServer } from "@/lib/server/stripe";

export const ADMIN_SUBSCRIPTIONS_PAGE_SIZE = 25;

export type AdminSubscription = {
  userId: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  status: string;
  subscriptionTier: string;
  priceId: string | null;
  billingInterval: "month" | "year" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeLivemode: boolean | null;
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
  syncState: "synced" | "drift" | "unavailable" | "no_subscription";
  stripeCustomerUrl: string | null;
  stripeSubscriptionUrl: string | null;
};

export type AdminSubscriptionList = {
  subscriptions: AdminSubscription[];
  total: number;
  limit: number;
  offset: number;
  summary: {
    active: number;
    trialing: number;
    pastDue: number;
    canceling: number;
  };
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function array(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableText(value: unknown) {
  return typeof value === "string" ? value : null;
}

function count(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function bool(value: unknown) {
  return value === true;
}

function interval(value: unknown): "month" | "year" | null {
  return value === "month" || value === "year" ? value : null;
}

function sameInstant(left: string | null, right: string | null) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return Math.abs(new Date(left).getTime() - new Date(right).getTime()) < 1000;
}

const retrieveStripeSubscription = unstable_cache(
  async (subscriptionId: string) => {
    const subscription = await getStripeServer().subscriptions.retrieve(subscriptionId);
    const item = subscription.items.data[0];
    const currentPeriodEnd = item?.current_period_end
      ? new Date(item.current_period_end * 1000).toISOString()
      : null;
    const billingInterval = interval(item?.price?.recurring?.interval);

    return {
      status: subscription.status,
      priceId: item?.price?.id ?? null,
      billingInterval,
      currentPeriodEnd,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      livemode: Boolean(subscription.livemode),
    };
  },
  ["admin-subscription-stripe-record"],
  { revalidate: 5 * 60 },
);

function stripeDashboardUrl(params: {
  livemode: boolean | null;
  resource: "customers" | "subscriptions";
  id: string | null;
}) {
  if (!params.id || params.livemode === null) return null;
  const mode = params.livemode ? "" : "/test";
  return `https://dashboard.stripe.com${mode}/${params.resource}/${encodeURIComponent(params.id)}`;
}

async function enrichSubscription(value: unknown): Promise<AdminSubscription> {
  const item = record(value);
  const stripeSubscriptionId = nullableText(item.stripe_subscription_id);
  const localStatus = text(item.status, "unknown");
  const localPriceId = nullableText(item.price_id);
  const localInterval = interval(item.billing_interval);
  const localPeriodEnd = nullableText(item.current_period_end);
  const localCancelAtPeriodEnd = bool(item.cancel_at_period_end);
  const localLivemode =
    typeof item.stripe_livemode === "boolean"
      ? item.stripe_livemode
      : null;
  let status = localStatus;
  let billingInterval = localInterval;
  let currentPeriodEnd = localPeriodEnd;
  let cancelAtPeriodEnd = localCancelAtPeriodEnd;
  let livemode = localLivemode;
  let syncState: AdminSubscription["syncState"] =
    stripeSubscriptionId ? "unavailable" : "no_subscription";

  if (stripeSubscriptionId) {
    try {
      const remote = await retrieveStripeSubscription(stripeSubscriptionId);
      status = remote.status;
      billingInterval = remote.billingInterval;
      currentPeriodEnd = remote.currentPeriodEnd;
      cancelAtPeriodEnd = remote.cancelAtPeriodEnd;
      livemode = remote.livemode;
      syncState =
        localStatus === remote.status
        && localPriceId === remote.priceId
        && localInterval === remote.billingInterval
        && sameInstant(localPeriodEnd, remote.currentPeriodEnd)
        && localCancelAtPeriodEnd === remote.cancelAtPeriodEnd
        && localLivemode === remote.livemode
          ? "synced"
          : "drift";
    } catch {
      syncState = "unavailable";
    }
  }

  const stripeCustomerId = nullableText(item.stripe_customer_id);

  return {
    userId: text(item.user_id),
    email: nullableText(item.email),
    username: nullableText(item.username),
    displayName: nullableText(item.display_name),
    stripeCustomerId,
    stripeSubscriptionId,
    status,
    subscriptionTier: text(item.subscription_tier, "free"),
    priceId: localPriceId,
    billingInterval,
    currentPeriodEnd,
    cancelAtPeriodEnd,
    stripeLivemode: livemode,
    lastSyncedAt: nullableText(item.last_synced_at),
    createdAt: text(item.created_at),
    updatedAt: text(item.updated_at),
    syncState,
    stripeCustomerUrl: stripeDashboardUrl({
      livemode,
      resource: "customers",
      id: stripeCustomerId,
    }),
    stripeSubscriptionUrl: stripeDashboardUrl({
      livemode,
      resource: "subscriptions",
      id: stripeSubscriptionId,
    }),
  };
}

export async function getAdminSubscriptions(params: {
  query?: string;
  status?: string;
  interval?: string;
  page?: number;
}): Promise<AdminSubscriptionList> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const offset = (page - 1) * ADMIN_SUBSCRIPTIONS_PAGE_SIZE;
  const { data, error } = await getSupabaseAdmin().rpc(
    "get_admin_subscriptions",
    {
      search_query: params.query?.trim() ?? "",
      status_filter: params.status ?? "all",
      interval_filter: params.interval ?? "all",
      page_size: ADMIN_SUBSCRIPTIONS_PAGE_SIZE,
      page_offset: offset,
    },
  );

  if (error) {
    throw new Error(`Could not load subscriptions: ${error.message}`);
  }

  const root = record(data);
  const summary = record(root.summary);

  return {
    subscriptions: await Promise.all(
      array(root.subscriptions).map(enrichSubscription),
    ),
    total: count(root.total),
    limit: count(root.limit) || ADMIN_SUBSCRIPTIONS_PAGE_SIZE,
    offset: count(root.offset),
    summary: {
      active: count(summary.active),
      trialing: count(summary.trialing),
      pastDue: count(summary.past_due),
      canceling: count(summary.canceling),
    },
  };
}
