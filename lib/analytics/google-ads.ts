"use client";

import { hasAnalyticsConsent } from "@/lib/privacy/consent";

export const GOOGLE_ADS_ID = "AW-18437580530";
export const GOOGLE_ADS_SIGNUP_DESTINATION = `${GOOGLE_ADS_ID}/g0dSCMS9ofEcEPLN3NdE`;

const SCRIPT_ID = "classendo-google-ads-tag";
const attempted = new Set<string>();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let initialized = false;

type GoogleAdsWindow = Window & {
  dataLayer?: unknown[][];
  gtag?: (...args: unknown[]) => void;
};

function mayMeasure() {
  return typeof window !== "undefined" && navigator.doNotTrack !== "1" && hasAnalyticsConsent();
}

/** Load the existing Ads tag once, and only after analytics consent. */
export function ensureGoogleAdsTag(): boolean {
  if (!mayMeasure()) return false;
  const target = window as GoogleAdsWindow;
  target.dataLayer ??= [];
  target.gtag ??= (...args: unknown[]) => { target.dataLayer?.push(args); };
  if (!initialized) {
    target.gtag("consent", "default", {
      ad_storage: "granted",
      analytics_storage: "denied",
      ad_user_data: "granted",
      ad_personalization: "denied",
    });
    target.gtag("js", new Date());
    target.gtag("config", GOOGLE_ADS_ID);
    initialized = true;
  }
  if (!document.getElementById(SCRIPT_ID)
      && !document.querySelector(`script[src="https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}"]`)) {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`;
    document.head.appendChild(script);
  }
  return true;
}

export function updateGoogleAdsConsent(accepted: boolean): void {
  if (accepted) {
    if (ensureGoogleAdsTag()) (window as GoogleAdsWindow).gtag?.("consent", "update", { ad_storage: "granted", analytics_storage: "denied", ad_user_data: "granted", ad_personalization: "denied" });
  } else if (typeof window !== "undefined") {
    (window as GoogleAdsWindow).gtag?.("consent", "update", { ad_storage: "denied", analytics_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  }
}

/** Only call with the one-time receipt returned for a newly created Auth identity. */
export function trackGoogleAdsSignup(conversionId: unknown): void {
  try {
    if (typeof conversionId !== "string" || !UUID.test(conversionId) || !ensureGoogleAdsTag() || attempted.has(conversionId)) return;
    const storageKey = `classendo-google-ads-signup:${conversionId}`;
    try {
      if (window.sessionStorage.getItem(storageKey)) return;
    } catch {
      // In-memory deduplication still works when storage is unavailable.
    }
    attempted.add(conversionId);
    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Advertising must never interrupt account access.
    }
    (window as GoogleAdsWindow).gtag?.("event", "conversion", {
      send_to: GOOGLE_ADS_SIGNUP_DESTINATION,
      transaction_id: conversionId,
    });
  } catch {
    // Missing or blocked advertising code must never fail signup.
  }
}
