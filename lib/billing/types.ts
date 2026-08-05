import type { WorksheetType } from "@/lib/worksheets/types";

export type SubscriptionStatus =
  | "free"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "cancelled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | null;

export type SubscriptionTier = "free" | "premium";

export type SubscriptionRecord = {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus;
  subscriptionTier: SubscriptionTier;
  priceId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ComplimentaryPremiumAccess = {
  active: boolean;
  expiresAt: string | null;
  grantedAt: string;
  revokedAt: string | null;
};

export type BillingAccessSnapshot = {
  userId: string | null;
  isAuthenticated: boolean;
  isPremium: boolean;
  premiumAccessSource: "stripe" | "complimentary" | null;
  administratorRole: "owner" | "admin" | "moderator" | null;
  isAdministrator: boolean;
  complimentaryPremiumAccess: ComplimentaryPremiumAccess | null;
  featuredGameId: string;
  featuredWorksheetType: WorksheetType;
  dashboardSaveLimit: number | null;
  subscription: SubscriptionRecord | null;
};
