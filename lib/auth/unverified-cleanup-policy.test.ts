import assert from "node:assert/strict";
import test from "node:test";
import { decideUnverifiedAccountCleanup } from "./unverified-cleanup-policy";

const NOW = Date.parse("2026-10-02T04:00:00.000Z");
const BASE = {
  createdAt: new Date(NOW - 31 * 24 * 60 * 60 * 1000).toISOString(),
  now: NOW,
  verified: false as boolean | null,
  contentCounts: { lesson_sets: 0, worksheets: 0, creator_images: 0, game_prompt_sets: 0 },
  contentChecksCertain: true,
  activityStatus: "inactive" as "active" | "inactive" | "unknown",
};

test("30+ days old, unverified, empty, and confirmed inactive is eligible", () => {
  assert.equal(decideUnverifiedAccountCleanup(BASE), "delete");
});

test("under 30 days is kept", () => {
  assert.equal(decideUnverifiedAccountCleanup({ ...BASE, createdAt: new Date(NOW - 29 * 86400000).toISOString() }), "keep");
});

test("verified is kept", () => {
  assert.equal(decideUnverifiedAccountCleanup({ ...BASE, verified: true }), "keep");
});

test("unverified but active is kept", () => {
  assert.equal(decideUnverifiedAccountCleanup({ ...BASE, activityStatus: "active" }), "keep");
});

test("unverified account with saved content is kept", () => {
  assert.equal(decideUnverifiedAccountCleanup({ ...BASE, contentCounts: { ...BASE.contentCounts, lesson_sets: 1 } }), "keep");
});

test("uncertain activity is kept", () => {
  assert.equal(decideUnverifiedAccountCleanup({ ...BASE, activityStatus: "unknown" }), "keep");
});

test("any uncertain content lookup is kept", () => {
  assert.equal(decideUnverifiedAccountCleanup({ ...BASE, contentChecksCertain: false }), "keep");
});

test("missing verification state is kept", () => {
  assert.equal(decideUnverifiedAccountCleanup({ ...BASE, verified: null }), "keep");
});
