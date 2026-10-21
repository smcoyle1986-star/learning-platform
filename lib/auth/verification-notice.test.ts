import assert from "node:assert/strict";
import test from "node:test";

import { verificationSendOutcome } from "./verification-notice";

test("does not claim to send an email when the account is already verified", () => {
  assert.deepEqual(verificationSendOutcome(true, { verified: true }), {
    verified: true,
    message: "Your email is already verified.",
  });
});

test("confirms a resend only when the endpoint reports sent", () => {
  assert.deepEqual(verificationSendOutcome(true, { sent: true }), {
    verified: false,
    message: "Verification email sent. Check your inbox.",
  });
});

test("shows endpoint errors and handles unexpected successful responses", () => {
  assert.equal(verificationSendOutcome(false, { error: "Please wait before requesting another verification email." }).message,
    "Please wait before requesting another verification email.");
  assert.equal(verificationSendOutcome(true, null).message,
    "We couldn't confirm that an email was sent. Please try again.");
});
