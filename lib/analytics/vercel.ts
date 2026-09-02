"use client";

import { track } from "@vercel/analytics";

import { hasAnalyticsConsent } from "@/lib/privacy/consent";

type ConversionEvent =
  | "signup_submitted"
  | "signup_account_created"
  | "welcome_trial_started"
  | "lesson_opened";

type ConversionProperties = Record<string, string | number | boolean | null>;

/**
 * Sends privacy-safe product events to Vercel Web Analytics. Keep properties
 * aggregate-only: never include email addresses, user IDs, or lesson content.
 */
export function trackConversion(
  event: ConversionEvent,
  properties?: ConversionProperties,
) {
  if (
    typeof window === "undefined"
    || navigator.doNotTrack === "1"
    || !hasAnalyticsConsent()
  ) {
    return;
  }

  track(event, properties);
}
