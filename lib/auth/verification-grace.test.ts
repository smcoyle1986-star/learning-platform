import assert from "node:assert/strict";
import test from "node:test";
import { resolveVerificationGrace, verificationDeadline } from "./verification-grace";

const activation = "2026-10-20T00:00:00.000Z";
const now = "2026-10-20T00:00:00.000Z";
const base = { verified: false, email: "teacher@example.com", serverNow: now, activatedAt: activation };

test("new account has 21 days from creation", () => {
  const deadline = verificationDeadline("2026-10-21T00:00:00.000Z", activation);
  assert.equal(deadline, "2026-11-11T00:00:00.000Z");
  const state = resolveVerificationGrace({ ...base, deadline: "2026-11-10T00:00:00.000Z" });
  assert.equal(state.phase, "reminder");
  assert.equal(state.daysRemaining, 21);
});
test("existing account receives 21 days from activation", () => {
  assert.equal(verificationDeadline("2025-01-01T00:00:00.000Z", activation), "2026-11-10T00:00:00.000Z");
  const state = resolveVerificationGrace({ ...base, deadline: "2026-11-10T00:00:00.000Z" });
  assert.equal(state.daysRemaining, 21);
});
test("last seven days are urgent, once expired access is blocked", () => {
  assert.equal(resolveVerificationGrace({ ...base, serverNow: "2026-10-26T23:59:59.999Z", deadline: "2026-11-03T00:00:00.000Z" }).phase, "reminder");
  assert.equal(resolveVerificationGrace({ ...base, deadline: "2026-10-27T00:00:00.000Z" }).phase, "urgent");
  assert.equal(resolveVerificationGrace({ ...base, deadline: now }).phase, "expired");
});
test("verification restores access without changing the deadline history", () => {
  assert.equal(resolveVerificationGrace({ ...base, verified: true, deadline: now }).phase, "verified");
});
test("policy remains pending until production activation", () => {
  assert.equal(resolveVerificationGrace({ ...base, deadline: null, activatedAt: null }).phase, "pending");
});
