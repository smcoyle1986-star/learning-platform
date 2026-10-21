import assert from "node:assert/strict";
import test from "node:test";

import { guestExitSignupIsAttributable } from "./guest-exit-eligibility";

const now = Date.parse("2026-10-20T12:00:00Z");
const receipt = {
  clickedAt: "2026-10-20T11:59:00Z",
  arrivedAt: "2026-10-20T11:59:05Z",
  existingUserId: null,
  sessionKey: "session-a",
  anonymousId: "anonymous-a",
};
const browser = { sessionKey: "session-a", anonymousId: "anonymous-a" };
const createdAt = "2026-10-20T11:59:30Z";

test("attributes a newly created account only after the recorded modal click and signup arrival", () => {
  assert.equal(guestExitSignupIsAttributable(receipt, browser, createdAt, now), true);
  assert.equal(guestExitSignupIsAttributable({ ...receipt, arrivedAt: null }, browser, createdAt, now), false);
  assert.equal(guestExitSignupIsAttributable({ ...receipt, existingUserId: "existing" }, browser, createdAt, now), false);
});

test("does not attribute another route, browser identity, or expired receipt", () => {
  assert.equal(guestExitSignupIsAttributable(receipt, { ...browser, sessionKey: "another" }, createdAt, now), false);
  assert.equal(guestExitSignupIsAttributable(receipt, { ...browser, anonymousId: "another" }, createdAt, now), false);
  assert.equal(guestExitSignupIsAttributable(receipt, browser, createdAt, now + 31 * 60_000), false);
  assert.equal(guestExitSignupIsAttributable(receipt, browser, createdAt, now - 2 * 60_000), false);
  assert.equal(guestExitSignupIsAttributable(receipt, browser, "2026-10-20T11:58:00Z", now), false);
});
