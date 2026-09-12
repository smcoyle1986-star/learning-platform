"use client";

const attempted = new Set<string>();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Only call with the one-time receipt returned after first email verification. */
export function trackGoogleAdsSignup(conversionId: unknown): void {
  try {
    if (typeof window === "undefined" || typeof conversionId !== "string" || !UUID.test(conversionId)) return;
    const target = window as typeof window & {
      gtag?: (command: "event", event: "conversion", parameters: { send_to: string; transaction_id: string }) => void;
    };
    if (typeof target.gtag !== "function" || attempted.has(conversionId)) return;
    const storageKey = `classendo-google-ads-signup:${conversionId}`;
    try {
      if (window.sessionStorage.getItem(storageKey)) return;
    } catch {
      // In-memory deduplication still works when storage is unavailable.
    }
    // Mark before calling third-party code, including if it throws. No retries
    // on navigation, login, or refresh; signup never waits for an ad request.
    attempted.add(conversionId);
    try {
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Advertising must not interrupt authentication or redirects.
    }
    target.gtag("event", "conversion", {
      send_to: "AW-18437580530/g0dSCMS9ofEcEPLN3NdE",
      transaction_id: conversionId,
    });
  } catch {
    // Missing/blocked/broken advertising code must never fail signup.
  }
}
