"use client";

import { useEffect } from "react";

import { ensureGoogleAdsTag, updateGoogleAdsConsent } from "@/lib/analytics/google-ads";
import { COOKIE_CONSENT_EVENT, type CookieConsent } from "@/lib/privacy/consent";

export function GoogleAdsTag() {
  useEffect(() => {
    ensureGoogleAdsTag();
    const onConsentChange = (event: Event) => {
      updateGoogleAdsConsent((event as CustomEvent<CookieConsent>).detail?.analytics === true);
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentChange);
  }, []);
  return null;
}
