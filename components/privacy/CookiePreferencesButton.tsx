"use client";

import { OPEN_COOKIE_PREFERENCES_EVENT } from "@/lib/privacy/consent";

export function CookiePreferencesButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT))}
      className="text-left underline-offset-4 hover:underline"
    >
      Cookie preferences
    </button>
  );
}
