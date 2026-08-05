import type { SupabaseClient } from "@supabase/supabase-js";

import { FREE_DASHBOARD_SAVE_LIMIT, PREMIUM_ACTIVE_STATUSES } from "@/lib/billing/constants";
import { getFeaturedWeeklyGameId, getFeaturedWeeklyWorksheetType } from "@/lib/billing/featured";
import type {
  BillingAccessSnapshot,
  ComplimentaryPremiumAccess,
  SubscriptionRecord,
  SubscriptionStatus,
  SubscriptionTier,
} from "@/lib/billing/types";
import type { WorksheetType } from "@/lib/worksheets/types";

function normalizeStatus(value: unknown): SubscriptionStatus {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "cancelled") return "cancelled";
  if (
    normalized === "free" ||
    normalized === "trialing" ||
    normalized === "active" ||
    normalized === "past_due" ||
    normalized === "canceled" ||
    normalized === "unpaid" ||
    normalized === "incomplete" ||
    normalized === "incomplete_expired" ||
    normalized === "paused"
  ) {
    return normalized;
  }
  return null;
}

function normalizeTier(value: unknown): SubscriptionTier {
  return String(value ?? "").trim().toLowerCase() === "premium" ? "premium" : "free";
}

export function isPremiumSubscription(record: Pick<SubscriptionRecord, "subscriptionStatus" | "subscriptionTier"> | null | undefined) {
  if (!record) return false;
  return (
    record.subscriptionTier === "premium" &&
    PREMIUM_ACTIVE_STATUSES.has(String(record.subscriptionStatus ?? "").toLowerCase())
  );
}

export function normalizeSubscriptionRecord(raw: unknown): SubscriptionRecord | null {
  const source = (raw ?? {}) as Record<string, unknown>;
  if (!source.user_id) return null;

  return {
    userId: String(source.user_id),
    stripeCustomerId: source.stripe_customer_id ? String(source.stripe_customer_id) : null,
    stripeSubscriptionId: source.stripe_subscription_id ? String(source.stripe_subscription_id) : null,
    subscriptionStatus: normalizeStatus(source.subscription_status),
    subscriptionTier: normalizeTier(source.subscription_tier),
    priceId: source.price_id ? String(source.price_id) : null,
    currentPeriodEnd: source.current_period_end ? new Date(String(source.current_period_end)).toISOString() : null,
    cancelAtPeriodEnd: Boolean(source.cancel_at_period_end),
    createdAt: source.created_at ? String(source.created_at) : null,
    updatedAt: source.updated_at ? String(source.updated_at) : null,
  };
}

export function buildBillingAccessSnapshot(params: {
  userId?: string | null;
  subscription?: SubscriptionRecord | null;
  complimentaryPremiumAccess?: ComplimentaryPremiumAccess | null;
  administratorRole?: "owner" | "admin" | "moderator" | null;
  now?: Date;
}): BillingAccessSnapshot {
  const now = params.now ?? new Date();
  const featuredGameId = getFeaturedWeeklyGameId(now);
  const featuredWorksheetType = getFeaturedWeeklyWorksheetType(now);
  const subscription = params.subscription ?? null;
  const complimentaryPremiumAccess = params.complimentaryPremiumAccess ?? null;
  const administratorRole = params.administratorRole ?? null;
  const hasStripePremium = isPremiumSubscription(subscription);
  const hasComplimentaryPremium = Boolean(
    complimentaryPremiumAccess?.active
    && (
      !complimentaryPremiumAccess.expiresAt
      || new Date(complimentaryPremiumAccess.expiresAt).getTime() > now.getTime()
    ),
  );
  const isPremium = hasStripePremium || hasComplimentaryPremium;

  return {
    userId: params.userId ?? null,
    isAuthenticated: Boolean(params.userId),
    isPremium,
    premiumAccessSource: hasStripePremium
      ? "stripe"
      : hasComplimentaryPremium
        ? "complimentary"
        : null,
    administratorRole,
    isAdministrator: administratorRole !== null,
    complimentaryPremiumAccess,
    featuredGameId,
    featuredWorksheetType,
    dashboardSaveLimit: isPremium ? null : FREE_DASHBOARD_SAVE_LIMIT,
    subscription,
  };
}

function normalizeComplimentaryPremiumAccess(
  raw: unknown,
  now = new Date(),
): ComplimentaryPremiumAccess | null {
  const source = (raw ?? {}) as Record<string, unknown>;
  if (!source.user_id || !source.granted_at) return null;

  const expiresAt = source.expires_at ? String(source.expires_at) : null;
  const revokedAt = source.revoked_at ? String(source.revoked_at) : null;

  return {
    active: !revokedAt && (!expiresAt || new Date(expiresAt).getTime() > now.getTime()),
    expiresAt,
    grantedAt: String(source.granted_at),
    revokedAt,
  };
}

export async function getComplimentaryPremiumAccess(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("admin_user_entitlements")
    .select("user_id,expires_at,granted_at,revoked_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return normalizeComplimentaryPremiumAccess(data);
}

export async function getUserSubscription(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return normalizeSubscriptionRecord(data);
}

export async function getBillingAccessForUser(
  supabase: SupabaseClient,
  userId: string
) {
  const [subscription, complimentaryPremiumAccess, membership] = await Promise.all([
    getUserSubscription(supabase, userId),
    getComplimentaryPremiumAccess(supabase, userId),
    supabase
      .from("admin_memberships")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (membership.error) throw membership.error;
  const administratorRole = ["owner", "admin", "moderator"].includes(
    String(membership.data?.role ?? ""),
  )
    ? membership.data?.role as "owner" | "admin" | "moderator"
    : null;
  return buildBillingAccessSnapshot({
    userId,
    subscription,
    complimentaryPremiumAccess,
    administratorRole,
  });
}

export function canAccessGame(access: BillingAccessSnapshot, gameId: string) {
  return access.isPremium || access.featuredGameId === gameId;
}

export function canAccessWorksheetType(access: BillingAccessSnapshot, worksheetType: WorksheetType) {
  return access.isPremium || access.featuredWorksheetType === worksheetType;
}

export function canUsePrintableOptions(access: BillingAccessSnapshot) {
  return access.isPremium;
}

export function canUsePremiumImageVariations(access: BillingAccessSnapshot) {
  return access.isPremium;
}

export async function countDashboardResourcesForUser(
  supabase: SupabaseClient,
  userId: string
) {
  const [{ count: lessonCount, error: lessonError }, { count: worksheetCount, error: worksheetError }] =
    await Promise.all([
      supabase
        .from("lesson_sets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
      supabase
        .from("worksheets")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

  if (lessonError) throw lessonError;
  if (worksheetError) throw worksheetError;

  return {
    lessons: lessonCount ?? 0,
    worksheets: worksheetCount ?? 0,
    total: (lessonCount ?? 0) + (worksheetCount ?? 0),
  };
}

export async function countLessonSetsForUser(
  supabase: SupabaseClient,
  userId: string
) {
  const { count, error } = await supabase
    .from("lesson_sets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}

export async function countWorksheetsForUser(
  supabase: SupabaseClient,
  userId: string
) {
  const { count, error } = await supabase
    .from("worksheets")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) throw error;
  return count ?? 0;
}

export async function assertCanCreateDashboardResource(
  supabase: SupabaseClient,
  userId: string
) {
  const access = await getBillingAccessForUser(supabase, userId);
  if (access.isPremium) return access;

  const usage = await countDashboardResourcesForUser(supabase, userId);
  if (usage.total >= FREE_DASHBOARD_SAVE_LIMIT) {
    throw new Error(
      `Free accounts can save up to ${FREE_DASHBOARD_SAVE_LIMIT} dashboard resources. Upgrade to Premium to save unlimited lessons and worksheets.`
    );
  }

  return access;
}

export async function assertCanCreateLessonSet(
  supabase: SupabaseClient,
  userId: string
) {
  const access = await getBillingAccessForUser(supabase, userId);
  if (access.isPremium) return access;

  const lessonCount = await countLessonSetsForUser(supabase, userId);
  if (lessonCount >= FREE_DASHBOARD_SAVE_LIMIT) {
    throw new Error(
      `Free accounts can save up to ${FREE_DASHBOARD_SAVE_LIMIT} lesson sets. Upgrade to Premium to save unlimited lessons and worksheets.`
    );
  }

  return access;
}

export async function assertCanCreateWorksheet(
  supabase: SupabaseClient,
  userId: string
) {
  const access = await getBillingAccessForUser(supabase, userId);
  if (access.isPremium) return access;

  const worksheetCount = await countWorksheetsForUser(supabase, userId);
  if (worksheetCount >= FREE_DASHBOARD_SAVE_LIMIT) {
    throw new Error(
      `Free accounts can save up to ${FREE_DASHBOARD_SAVE_LIMIT} worksheets. Upgrade to Premium to save unlimited lessons and worksheets.`
    );
  }

  return access;
}
