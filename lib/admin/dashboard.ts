import "server-only";

import { unstable_cache } from "next/cache";

import { getOptionalEnv } from "@/lib/server/env";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getStripeServer } from "@/lib/server/stripe";

export type AdminDashboardSnapshot = {
  generatedAt: string;
  users: {
    total: number;
    free: number;
    premium: number;
    new30d: number;
  };
  subscriptions: {
    activePremium: number;
    monthly: number;
    yearly: number;
    unclassified: number;
  };
  content: {
    lessonSets: number;
    cards: number;
    publicSets: number;
    creatorImages: number | null;
    creatorUploaders: number | null;
  };
  platform: {
    feedbackConfigured: boolean;
    feedbackPending: number | null;
    reportsConfigured: boolean;
    reportsPending: number | null;
    rejectedSignups24h: number;
  };
  recent: {
    registrations: Array<{
      id: string;
      email: string | null;
      createdAt: string;
    }>;
    subscriptions: Array<{
      id: string;
      email: string | null;
      tier: string | null;
      status: string | null;
      occurredAt: string;
    }>;
    publicContent: Array<{
      id: string;
      name: string;
      createdAt: string;
    }>;
    adminActivity: Array<{
      id: string;
      action: string;
      targetType: string;
      targetId: string | null;
      createdAt: string;
    }>;
    rejectedSignups: Array<{
      id: string;
      domain: string;
      reason: string;
      createdAt: string;
    }>;
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

function string(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function count(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function nullableCount(value: unknown) {
  return value === null || value === undefined ? null : count(value);
}

function boolean(value: unknown) {
  return value === true;
}

function configuredPriceIds(keys: string[]) {
  return Array.from(new Set(
    keys
      .map((key) => getOptionalEnv(key))
      .filter((value): value is string => Boolean(value)),
  ));
}

const getStripeBillingInterval = unstable_cache(
  async (priceId: string) => {
    const price = await getStripeServer().prices.retrieve(priceId);
    return price.recurring?.interval ?? null;
  },
  ["admin-dashboard-stripe-price-interval"],
  { revalidate: 60 * 60 },
);

export async function getAdminDashboardSnapshot(): Promise<AdminDashboardSnapshot> {
  const monthlyPriceIds = configuredPriceIds([
    "STRIPE_PRICE_PREMIUM_MONTHLY",
    "STRIPE_PREMIUM_MONTHLY_PRICE_ID",
    "STRIPE_MONTHLY_PRICE_ID",
    "STRIPE_PRICE_MONTHLY",
    "NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY",
  ]);
  const yearlyPriceIds = configuredPriceIds([
    "STRIPE_PRICE_PREMIUM_YEARLY",
    "STRIPE_PREMIUM_YEARLY_PRICE_ID",
    "STRIPE_YEARLY_PRICE_ID",
    "STRIPE_PRICE_YEARLY",
    "NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY",
  ]);

  const supabase = getSupabaseAdmin();
  const [dashboardResult, rejectedSignupCountResult, rejectedSignupsResult] = await Promise.all([
    supabase.rpc("get_admin_dashboard_snapshot", {
      monthly_price_ids: monthlyPriceIds,
      yearly_price_ids: yearlyPriceIds,
    }),
    supabase
      .from("signup_rejection_events")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1_000).toISOString()),
    supabase
      .from("signup_rejection_events")
      .select("id,domain,reason,created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);
  const { data, error } = dashboardResult;

  if (error) {
    throw new Error(`Could not load administrator dashboard data: ${error.message}`);
  }
  if (rejectedSignupCountResult.error || rejectedSignupsResult.error) {
    throw new Error(
      `Could not load signup protection data: ${
        rejectedSignupCountResult.error?.message ?? rejectedSignupsResult.error?.message
      }`,
    );
  }

  const root = record(data);
  const users = record(root.users);
  const subscriptions = record(root.subscriptions);
  const content = record(root.content);
  const platform = record(root.platform);
  const recent = record(root.recent);
  let monthlySubscribers = count(subscriptions.monthly);
  let yearlySubscribers = count(subscriptions.yearly);
  let unclassifiedSubscribers = count(subscriptions.unclassified);

  const unclassifiedPrices = array(subscriptions.unclassified_prices).map((value) => {
    const item = record(value);
    return {
      priceId: nullableString(item.price_id),
      subscribers: count(item.subscribers),
    };
  });

  const resolvedIntervals = await Promise.all(
    unclassifiedPrices.map(async (item) => {
      if (!item.priceId) return { ...item, interval: null };

      try {
        const interval = await getStripeBillingInterval(item.priceId);
        return { ...item, interval };
      } catch {
        return { ...item, interval: null };
      }
    }),
  );

  resolvedIntervals.forEach((item) => {
    if (item.interval === "month") {
      monthlySubscribers += item.subscribers;
      unclassifiedSubscribers -= item.subscribers;
    } else if (item.interval === "year") {
      yearlySubscribers += item.subscribers;
      unclassifiedSubscribers -= item.subscribers;
    }
  });

  return {
    generatedAt: string(root.generated_at, new Date().toISOString()),
    users: {
      total: count(users.total),
      free: count(users.free),
      premium: count(users.premium),
      new30d: count(users.new_30d),
    },
    subscriptions: {
      activePremium: count(subscriptions.active_premium),
      monthly: monthlySubscribers,
      yearly: yearlySubscribers,
      unclassified: Math.max(unclassifiedSubscribers, 0),
    },
    content: {
      lessonSets: count(content.lesson_sets),
      cards: count(content.cards),
      publicSets: count(content.public_sets),
      creatorImages: nullableCount(content.creator_images),
      creatorUploaders: nullableCount(content.creator_uploaders),
    },
    platform: {
      feedbackConfigured: boolean(platform.feedback_configured),
      feedbackPending: nullableCount(platform.feedback_pending),
      reportsConfigured: boolean(platform.reports_configured),
      reportsPending: nullableCount(platform.reports_pending),
      rejectedSignups24h: rejectedSignupCountResult.count ?? 0,
    },
    recent: {
      registrations: array(recent.registrations).map((value) => {
        const item = record(value);
        return {
          id: string(item.id),
          email: nullableString(item.email),
          createdAt: string(item.created_at),
        };
      }),
      subscriptions: array(recent.subscriptions).map((value) => {
        const item = record(value);
        return {
          id: string(item.id),
          email: nullableString(item.email),
          tier: nullableString(item.tier),
          status: nullableString(item.status),
          occurredAt: string(item.occurred_at),
        };
      }),
      publicContent: array(recent.public_content).map((value) => {
        const item = record(value);
        return {
          id: string(item.id),
          name: string(item.name, "Untitled set"),
          createdAt: string(item.created_at),
        };
      }),
      adminActivity: array(recent.admin_activity).map((value) => {
        const item = record(value);
        return {
          id: string(item.id),
          action: string(item.action, "admin.action"),
          targetType: string(item.target_type, "record"),
          targetId: nullableString(item.target_id),
          createdAt: string(item.created_at),
        };
      }),
      rejectedSignups: (rejectedSignupsResult.data ?? []).map((item) => ({
        id: String(item.id),
        domain: String(item.domain),
        reason: String(item.reason),
        createdAt: String(item.created_at),
      })),
    },
  };
}
