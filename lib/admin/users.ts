import "server-only";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const ADMIN_USERS_PAGE_SIZE = 25;

export type AdminUserListItem = {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: "owner" | "admin" | "moderator" | "user";
  tier: "premium" | "free";
  status: string;
  subscriptionStatus: string | null;
  hasStripePremium: boolean;
  hasComplimentaryPremium: boolean;
  complimentaryExpiresAt: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  bannedUntil: string | null;
};

export type AdminUserList = {
  users: AdminUserListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type AdminUserDetail = AdminUserListItem & {
  countryRegion: string | null;
  effectivePremium: boolean;
  subscription: {
    tier: string | null;
    status: string | null;
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
    priceId: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  complimentaryAccess: {
    active: boolean;
    reason: string;
    grantedAt: string;
    expiresAt: string | null;
    revokedAt: string | null;
  } | null;
  counts: {
    lessonSets: number;
    publicSets: number;
    worksheets: number;
    creatorImages: number;
  };
  lessonSets: Array<{
    id: string;
    name: string;
    isPublic: boolean;
    createdAt: string;
  }>;
  worksheets: Array<{
    id: string;
    name: string;
    worksheetType: string;
    isPublic: boolean;
    createdAt: string;
  }>;
  creatorImages: Array<{
    id: string;
    originalFilename: string;
    status: string;
    sizeBytes: number;
    createdAt: string;
  }>;
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

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function bool(value: unknown) {
  return value === true;
}

function role(value: unknown): AdminUserListItem["role"] {
  return value === "owner" || value === "admin" || value === "moderator"
    ? value
    : "user";
}

function listItem(value: unknown): AdminUserListItem {
  const item = record(value);
  return {
    id: text(item.id),
    email: nullableText(item.email),
    username: nullableText(item.username),
    displayName: nullableText(item.display_name),
    avatarUrl: nullableText(item.avatar_url),
    role: role(item.role),
    tier: item.tier === "premium" ? "premium" : "free",
    status: text(item.status, "free"),
    subscriptionStatus: nullableText(item.subscription_status),
    hasStripePremium: bool(item.has_stripe_premium),
    hasComplimentaryPremium: bool(item.has_complimentary_premium),
    complimentaryExpiresAt: nullableText(item.complimentary_expires_at),
    currentPeriodEnd: nullableText(item.current_period_end),
    createdAt: text(item.created_at),
    lastSignInAt: nullableText(item.last_sign_in_at),
    bannedUntil: nullableText(item.banned_until),
  };
}

export async function getAdminUsers(params: {
  query?: string;
  role?: string;
  tier?: string;
  status?: string;
  page?: number;
}): Promise<AdminUserList> {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const offset = (page - 1) * ADMIN_USERS_PAGE_SIZE;
  const { data, error } = await getSupabaseAdmin().rpc("get_admin_users", {
    search_query: params.query?.trim() ?? "",
    role_filter: params.role ?? "all",
    tier_filter: params.tier ?? "all",
    status_filter: params.status ?? "all",
    page_size: ADMIN_USERS_PAGE_SIZE,
    page_offset: offset,
  });

  if (error) {
    throw new Error(`Could not load users: ${error.message}`);
  }

  const root = record(data);
  return {
    users: array(root.users).map(listItem),
    total: number(root.total),
    limit: number(root.limit) || ADMIN_USERS_PAGE_SIZE,
    offset: number(root.offset),
  };
}

export async function getAdminUserDetail(
  userId: string,
): Promise<AdminUserDetail | null> {
  const { data, error } = await getSupabaseAdmin().rpc(
    "get_admin_user_detail",
    { target_user_id: userId },
  );

  if (error) {
    if (error.code === "P0001" && error.message.toLowerCase().includes("not found")) {
      return null;
    }
    throw new Error(`Could not load user details: ${error.message}`);
  }

  const root = record(data);
  const base = listItem({
    ...root,
    tier: root.effective_premium === true ? "premium" : "free",
    status:
      root.banned_until && new Date(String(root.banned_until)).getTime() > Date.now()
        ? "suspended"
        : root.effective_premium === true
          ? "premium"
          : "free",
    subscription_status: record(root.subscription).status,
    has_stripe_premium:
      record(root.subscription).tier === "premium"
      && ["active", "trialing", "past_due"].includes(
        text(record(root.subscription).status).toLowerCase(),
      ),
    has_complimentary_premium: record(root.complimentary_access).active === true,
    complimentary_expires_at: record(root.complimentary_access).expires_at,
    current_period_end: record(root.subscription).current_period_end,
  });
  const subscription = root.subscription ? record(root.subscription) : null;
  const complimentary = root.complimentary_access
    ? record(root.complimentary_access)
    : null;
  const counts = record(root.counts);

  return {
    ...base,
    countryRegion: nullableText(root.country_region),
    effectivePremium: bool(root.effective_premium),
    subscription: subscription
      ? {
          tier: nullableText(subscription.tier),
          status: nullableText(subscription.status),
          stripeCustomerId: nullableText(subscription.stripe_customer_id),
          stripeSubscriptionId: nullableText(subscription.stripe_subscription_id),
          priceId: nullableText(subscription.price_id),
          currentPeriodEnd: nullableText(subscription.current_period_end),
          cancelAtPeriodEnd: bool(subscription.cancel_at_period_end),
        }
      : null,
    complimentaryAccess: complimentary
      ? {
          active: bool(complimentary.active),
          reason: text(complimentary.reason),
          grantedAt: text(complimentary.granted_at),
          expiresAt: nullableText(complimentary.expires_at),
          revokedAt: nullableText(complimentary.revoked_at),
        }
      : null,
    counts: {
      lessonSets: number(counts.lesson_sets),
      publicSets: number(counts.public_sets),
      worksheets: number(counts.worksheets),
      creatorImages: number(counts.creator_images),
    },
    lessonSets: array(root.lesson_sets).map((value) => {
      const item = record(value);
      return {
        id: text(item.id),
        name: text(item.name, "Untitled set"),
        isPublic: bool(item.is_public),
        createdAt: text(item.created_at),
      };
    }),
    worksheets: array(root.worksheets).map((value) => {
      const item = record(value);
      return {
        id: text(item.id),
        name: text(item.name, "Untitled worksheet"),
        worksheetType: text(item.worksheet_type),
        isPublic: bool(item.is_public),
        createdAt: text(item.created_at),
      };
    }),
    creatorImages: array(root.creator_images).map((value) => {
      const item = record(value);
      return {
        id: text(item.id),
        originalFilename: text(item.original_filename, "Unnamed image"),
        status: text(item.status),
        sizeBytes: number(item.size_bytes),
        createdAt: text(item.created_at),
      };
    }),
  };
}
