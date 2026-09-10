import assert from "node:assert/strict";
import { test } from "node:test";
import type { User } from "@supabase/supabase-js";

import { newSignupConversionId, SIGNUP_ATTEMPT_KEY } from "../auth/signup-conversion";
import { trackGoogleAdsSignup } from "./google-ads";

const receipt = "b2222222-2222-4222-8222-222222222222";

test("only a new signup with this request's marker and a real identity receives a receipt", () => {
  const user: User = {
    id: "internal-user-id",
    app_metadata: {},
    aud: "authenticated",
    created_at: "2026-09-08T00:00:00Z",
    user_metadata: { [SIGNUP_ATTEMPT_KEY]: receipt },
    identities: [{ id: "identity-id", identity_id: "identity-id", provider: "email", user_id: "internal-user-id" }],
  };
  // This evidence is independent of whether email confirmation requires a session delay.
  assert.equal(newSignupConversionId(user, receipt), receipt);
  assert.equal(newSignupConversionId(user, "another-request"), undefined);
  // Existing confirmed users can echo the new marker in an obfuscated response.
  assert.equal(newSignupConversionId({ ...user, identities: [] }, receipt), undefined);
  assert.equal(newSignupConversionId({ ...user, identities: undefined }, receipt), undefined);
  // Existing unconfirmed accounts retain their original metadata.
  assert.equal(newSignupConversionId({ ...user, user_metadata: {} }, receipt), undefined);
  assert.equal(newSignupConversionId({ ...user, user_metadata: { [SIGNUP_ATTEMPT_KEY]: "original-request" } }, receipt), undefined);
});

test("conversion is optional, deduplicated, carries no account data, and cannot throw", () => {
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const setWindow = (value: unknown) => Object.defineProperty(globalThis, "window", { configurable: true, value });
  const calls: unknown[][] = [];
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  const gtag = (...args: unknown[]) => { calls.push(args); };
  try {
    setWindow(undefined);
    assert.doesNotThrow(() => trackGoogleAdsSignup(receipt));
    setWindow({});
    assert.doesNotThrow(() => trackGoogleAdsSignup(receipt));
    setWindow({ gtag, sessionStorage: storage });
    for (const invalid of [undefined, null, "", "email@example.com", "internal-user-id"]) {
      trackGoogleAdsSignup(invalid);
    }
    assert.equal(calls.length, 0);
    trackGoogleAdsSignup(receipt);
    trackGoogleAdsSignup(receipt);
    assert.deepEqual(calls, [["event", "conversion", {
      send_to: "AW-18437580530/g0dSCMS9ofEcEPLN3NdE",
      transaction_id: receipt,
    }]]);
    const alreadyStored = "c3333333-3333-4333-8333-333333333333";
    values.set(`classendo-google-ads-signup:${alreadyStored}`, "1");
    trackGoogleAdsSignup(alreadyStored);
    assert.equal(calls.length, 1);

    setWindow({ gtag, get sessionStorage() { throw new Error("Storage blocked"); } });
    const storageBlocked = "d4444444-4444-4444-8444-444444444444";
    trackGoogleAdsSignup(storageBlocked);
    trackGoogleAdsSignup(storageBlocked);
    assert.equal(calls.length, 2);

    let failures = 0;
    setWindow({ sessionStorage: storage, gtag() { failures++; throw new Error("Tag blocked"); } });
    const brokenTag = "e5555555-5555-4555-8555-555555555555";
    assert.doesNotThrow(() => trackGoogleAdsSignup(brokenTag));
    trackGoogleAdsSignup(brokenTag);
    assert.equal(failures, 1);
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
