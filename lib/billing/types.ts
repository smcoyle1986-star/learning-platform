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
  premiumTrialStartedAt: string | null;
  premiumTrialEndsAt: string | null;
  premiumTrialUsed: boolean;
  premiumTrialExpirySeenAt: string | null;
  basicLessonAccessAssignedAt: string | null;
};

export type WelcomeTrialAccess = {
  active: boolean;
  startedAt: string | null;
  endsAt: string | null;
  used: boolean;
  daysRemaining: number;
  expiredNoticeRequired: boolean;
};

export type AccountPlanState =
  | "guest"
  | "basic"
  | "welcome_trial"
  | "premium"
  | "past_due"
  | "cancelled";

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
  accountPlan: AccountPlanState;
  premiumAccessSource: "stripe" | "complimentary" | "welcome_trial" | null;
  administratorRole: "owner" | "admin" | "moderator" | null;
  isAdministrator: boolean;
  complimentaryPremiumAccess: ComplimentaryPremiumAccess | null;
  featuredGameId: string;
  featuredWorksheetType: WorksheetType;
  dashboardSaveLimit: number | null;
  subscription: SubscriptionRecord | null;
  welcomeTrial: WelcomeTrialAccess;
};
