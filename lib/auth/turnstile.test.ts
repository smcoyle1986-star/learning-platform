import assert from "node:assert/strict";
import test from "node:test";

import { TurnstileVerificationError, verifyTurnstileToken } from "./turnstile";

test("rejects a missing token as a client error without calling Turnstile", async () => {
  let called = false;
  await assert.rejects(verifyTurnstileToken({
    token: "", secret: "secret", remoteIp: "127.0.0.1",
    fetcher: async () => { called = true; return new Response("{}", { status: 200 }); },
  }), (error: unknown) => error instanceof TurnstileVerificationError && error.status === 400);
  assert.equal(called, false);
});

test("rejects expired or failed verification as a client error", async () => {
  await assert.rejects(verifyTurnstileToken({
    token: "expired-token", secret: "secret", remoteIp: "127.0.0.1",
    fetcher: async () => new Response(JSON.stringify({ success: false, "error-codes": ["timeout-or-duplicate"] }), { status: 200 }),
  }), (error: unknown) => error instanceof TurnstileVerificationError && error.status === 400 && /expired|could not be verified/i.test(error.message));
});

test("accepts a valid Turnstile response", async () => {
  await verifyTurnstileToken({
    token: "valid-token", secret: "secret", remoteIp: "127.0.0.1",
    fetcher: async () => new Response(JSON.stringify({ success: true }), { status: 200 }),
  });
});

test("treats Turnstile transport and service failures as recoverable server errors", async () => {
  await assert.rejects(verifyTurnstileToken({
    token: "token", secret: "secret", remoteIp: "127.0.0.1",
    fetcher: async () => { throw new Error("offline"); },
  }), (error: unknown) => error instanceof TurnstileVerificationError && error.status === 503);
  await assert.rejects(verifyTurnstileToken({
    token: "token", secret: "secret", remoteIp: "127.0.0.1",
    fetcher: async () => new Response("{}", { status: 502 }),
  }), (error: unknown) => error instanceof TurnstileVerificationError && error.status === 503);
});
