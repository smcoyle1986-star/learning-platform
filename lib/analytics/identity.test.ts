import assert from "node:assert/strict";
import { test } from "node:test";

import { clearAnalyticsIdentity, getAnalyticsAnonymousId, getAnalyticsSessionKey } from "./client";

test("anonymous identity is consent gated, persists across sessions, and clears on rejection", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNow = Date.now;
  const local = new Map<string, string>();
  const session = new Map<string, string>();
  const storage = (values: Map<string, string>) => ({
    get length() { return values.size; },
    key: (index: number) => [...values.keys()][index] ?? null,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  });
  Object.defineProperty(globalThis, "window", { configurable: true, value: { localStorage: storage(local), sessionStorage: storage(session) } });
  try {
    assert.equal(getAnalyticsAnonymousId(), "");
    assert.equal(getAnalyticsSessionKey(), "");
    assert.equal(local.size, 0);
    assert.equal(session.size, 0);

    local.set("classendo-cookie-consent", JSON.stringify({ analytics: true, decidedAt: "2026-10-07", version: 1 }));
    let now = 1_000_000;
    Date.now = () => now;
    const anonymousId = getAnalyticsAnonymousId();
    const firstSession = getAnalyticsSessionKey();
    assert.match(anonymousId, /^[0-9a-f-]{36}$/);
    assert.match(firstSession, /^[0-9a-f-]{36}$/);
    now += 10 * 60 * 1000;
    assert.equal(getAnalyticsAnonymousId(), anonymousId);
    assert.equal(getAnalyticsSessionKey(), firstSession);
    now += 31 * 60 * 1000;
    assert.notEqual(getAnalyticsSessionKey(), firstSession);
    assert.equal(getAnalyticsAnonymousId(), anonymousId);

    session.set("classendo-free-game-event:old-session", "1");
    clearAnalyticsIdentity();
    local.set("classendo-cookie-consent", JSON.stringify({ analytics: false, decidedAt: "2026-10-07", version: 1 }));
    assert.equal(getAnalyticsAnonymousId(), "");
    assert.equal(getAnalyticsSessionKey(), "");
    assert.equal(local.has("classendo-analytics-anonymous-id"), false);
    assert.equal(session.has("classendo-analytics-session"), false);
    assert.equal(session.has("classendo-free-game-event:old-session"), false);
  } finally {
    Date.now = originalNow;
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
