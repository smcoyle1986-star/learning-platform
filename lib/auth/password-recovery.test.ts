import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import type { User } from "@supabase/supabase-js";
import { hasEmailPasswordProvider } from "./password-recovery";

const user = (app_metadata: Record<string, unknown>) => ({ app_metadata }) as unknown as User;

test("email/password identities can complete password recovery", () => {
  assert.equal(hasEmailPasswordProvider(user({ provider: "email" })), true);
  assert.equal(hasEmailPasswordProvider(user({ provider: "google", providers: ["google", "email"] })), true);
});

test("Google-only identities cannot add a password through this recovery page", () => {
  assert.equal(hasEmailPasswordProvider(user({ provider: "google", providers: ["google"] })), false);
});

test("password recovery updates only the Supabase password and does not invoke verification or trial flows", () => {
  const page = readFileSync("app/reset-password/page.tsx", "utf8");
  assert.match(page, /supabase\.auth\.updateUser\(\{ password \}\)/);
  assert.doesNotMatch(page, /verify_email|verification\/verify|trial|premium_trial/i);
});
