import Stripe from "stripe";

import { getEnvAny, getOptionalEnv } from "@/lib/server/env";

let cachedStripe: Stripe | null = null;

export function getStripeServer() {
  if (cachedStripe) return cachedStripe;

  cachedStripe = new Stripe(getEnvAny([
    "STRIPE_SECRET_KEY",
    "STRIPE_SANDBOX_SECRET_KEY",
  ]), {
    apiVersion: "2026-05-27.dahlia",
  });

  return cachedStripe;
}

export function getStripeWebhookSecret() {
  return getEnvAny([
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_SANDBOX_WEBHOOK_SECRET",
  ]);
}

export function getStripePriceId(plan: "monthly" | "yearly") {
  if (plan === "monthly") {
    return getEnvAny([
      "STRIPE_PRICE_PREMIUM_MONTHLY",
      "STRIPE_PREMIUM_MONTHLY_PRICE_ID",
      "STRIPE_MONTHLY_PRICE_ID",
      "STRIPE_PRICE_MONTHLY",
      "NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY",
    ]);
  }

  return getEnvAny([
    "STRIPE_PRICE_PREMIUM_YEARLY",
    "STRIPE_PREMIUM_YEARLY_PRICE_ID",
    "STRIPE_YEARLY_PRICE_ID",
    "STRIPE_PRICE_YEARLY",
    "NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY",
  ]);
}

export function getAppBaseUrl() {
  const explicit = getOptionalEnv("NEXT_PUBLIC_APP_URL")
    ?? getOptionalEnv("NEXT_PUBLIC_SITE_URL")
    ?? getOptionalEnv("APP_URL")
    ?? getOptionalEnv("SITE_URL");

  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  const vercelUrl = getOptionalEnv("VERCEL_URL");
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/\/+$/, "")}`;
  }

  return "http://localhost:3000";
}

export function isStripeManagedPaymentsEnabled() {
  return getOptionalEnv("STRIPE_MANAGED_PAYMENTS_ENABLED")?.toLowerCase() === "true";
}
