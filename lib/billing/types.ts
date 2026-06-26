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

export type BillingAccessSnapshot = {
  userId: string | null;
  isAuthenticated: boolean;
  isPremium: boolean;
  featuredGameId: string;
  featuredWorksheetType: WorksheetType;
  dashboardSaveLimit: number | null;
  subscription: SubscriptionRecord | null;
};
