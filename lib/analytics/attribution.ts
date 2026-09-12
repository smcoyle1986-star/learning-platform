import { hasAnalyticsConsent } from "@/lib/privacy/consent";

const STORAGE_KEY = "classendo-signup-attribution";
const MAX_VALUE_LENGTH = 80;

export type SignupAttribution = {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  referrerHost: string | null;
  landingPath: string | null;
};

function clean(value: string | null) {
  const normalized = value?.trim().replace(/[^a-z0-9 _.-]/gi, "") ?? "";
  return normalized ? normalized.slice(0, MAX_VALUE_LENGTH) : null;
}

function externalReferrerHost() {
  try {
    if (!document.referrer) return null;
    const host = new URL(document.referrer).hostname.toLowerCase().replace(/^www\./, "");
    return host === window.location.hostname.toLowerCase().replace(/^www\./, "") ? null : clean(host);
  } catch {
    return null;
  }
}

export function captureCurrentAttribution(): SignupAttribution {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: clean(params.get("utm_source")),
    utmMedium: clean(params.get("utm_medium")),
    utmCampaign: clean(params.get("utm_campaign")),
    utmContent: clean(params.get("utm_content")),
    utmTerm: clean(params.get("utm_term")),
    referrerHost: externalReferrerHost(),
    landingPath: clean(window.location.pathname),
  };
}

function hasAttribution(value: SignupAttribution) {
  return Object.values(value).some(Boolean);
}

export function rememberSignupAttribution(attribution: SignupAttribution | null) {
  if (typeof window === "undefined" || !hasAnalyticsConsent() || !attribution || !hasAttribution(attribution)) return;

  try {
    if (!window.sessionStorage.getItem(STORAGE_KEY)) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
    }
  } catch {
    // Attribution is optional and must never affect the teaching experience.
  }
}

export function clearSignupAttribution() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable in privacy-restricted browser contexts.
  }
}

export function captureSignupAttribution() {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return;
  rememberSignupAttribution(captureCurrentAttribution());
}

export function readSignupAttribution(): SignupAttribution | null {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return null;

  captureSignupAttribution();
  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<SignupAttribution>;
    const attribution: SignupAttribution = {
      utmSource: clean(typeof parsed.utmSource === "string" ? parsed.utmSource : null),
      utmMedium: clean(typeof parsed.utmMedium === "string" ? parsed.utmMedium : null),
      utmCampaign: clean(typeof parsed.utmCampaign === "string" ? parsed.utmCampaign : null),
      utmContent: clean(typeof parsed.utmContent === "string" ? parsed.utmContent : null),
      utmTerm: clean(typeof parsed.utmTerm === "string" ? parsed.utmTerm : null),
      referrerHost: clean(typeof parsed.referrerHost === "string" ? parsed.referrerHost : null),
      landingPath: clean(typeof parsed.landingPath === "string" ? parsed.landingPath : null),
    };
    return hasAttribution(attribution) ? attribution : null;
  } catch {
    return null;
  }
}
