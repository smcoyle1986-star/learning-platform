export const COOKIE_CONSENT_KEY = "classendo-cookie-consent";
export const COOKIE_CONSENT_EVENT = "classendo-cookie-consent-changed";
export const OPEN_COOKIE_PREFERENCES_EVENT = "classendo-open-cookie-preferences";

export type CookieConsent = {
  analytics: boolean;
  decidedAt: string;
  version: 1;
};

export function readCookieConsent(): CookieConsent | null {
  if (typeof window === "undefined") return null;

  try {
    const value = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<CookieConsent>;
    if (parsed.version !== 1 || typeof parsed.analytics !== "boolean") return null;
    return parsed as CookieConsent;
  } catch {
    return null;
  }
}

export function saveCookieConsent(analytics: boolean) {
  const consent: CookieConsent = {
    analytics,
    decidedAt: new Date().toISOString(),
    version: 1,
  };
  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: consent }));
  return consent;
}

export function hasAnalyticsConsent() {
  return readCookieConsent()?.analytics === true;
}
