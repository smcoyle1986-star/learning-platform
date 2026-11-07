import assert from "node:assert/strict";
import test from "node:test";
import { resolveVerificationGrace } from "./verification-grace";

const activation = "2026-10-20T00:00:00.000Z";
const now = "2026-10-20T00:00:00.000Z";
const base = { verified: false, email: "teacher@example.com", serverNow: now, activatedAt: activation };

test("unverified accounts remain pending regardless of legacy deadline", () => {
  const state = resolveVerificationGrace({ ...base, deadline: now });
  assert.equal(state.phase, "pending");
  assert.equal(state.daysRemaining, null);
  assert.equal(state.deadline, null);
});
test("verified accounts remain verified", () => {
  assert.equal(resolveVerificationGrace({ ...base, verified: true, deadline: now }).phase, "verified");
});
test("policy remains pending until production activation", () => {
  assert.equal(resolveVerificationGrace({ ...base, deadline: null, activatedAt: null }).phase, "pending");
});
