import assert from "node:assert/strict";
import test from "node:test";

import { buildBillingAccessSnapshot, normalizeSubscriptionRecord } from "../billing/access";

const now = new Date("2026-10-20T00:00:00.000Z");

test("unverified account has no Premium trial before verification", () => {
  const subscription = normalizeSubscriptionRecord({ user_id: "user-1", subscription_status: "free", subscription_tier: "free", premium_trial_used: false });
  const access = buildBillingAccessSnapshot({ userId: "user-1", subscription, now });
  assert.equal(access.welcomeTrial.active, false);
  assert.equal(access.accountPlan, "basic");
});

test("verification-started 14-day trial remains active without changing entitlement", () => {
  const subscription = normalizeSubscriptionRecord({ user_id: "user-1", subscription_status: "free", subscription_tier: "free", premium_trial_used: true, premium_trial_started_at: "2026-10-20T00:00:00.000Z", premium_trial_ends_at: "2026-11-03T00:00:00.000Z" });
  const access = buildBillingAccessSnapshot({ userId: "user-1", subscription, now });
  assert.equal(access.welcomeTrial.active, true);
  assert.equal(access.welcomeTrial.daysRemaining, 14);
  assert.equal(access.premiumAccessSource, "welcome_trial");
});
