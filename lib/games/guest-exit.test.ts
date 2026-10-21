import test from "node:test";
import assert from "node:assert/strict";

import { GAME_NAMES } from "./topics";
import { shouldInviteGuestOnExit } from "./guest-exit";

test("guest Exit Game invitation covers all ten classroom games and excludes signed-in users", () => {
  assert.equal(Object.keys(GAME_NAMES).length, 10);
  for (const gameId of Object.keys(GAME_NAMES)) {
    assert.equal(shouldInviteGuestOnExit(`/games/${gameId}`, null), true, gameId);
    assert.equal(shouldInviteGuestOnExit(`/games/${gameId}`, "signed-in-user"), false, gameId);
  }
  for (const path of ["/games", "/games/topics", "/games/custom", "/demo/animals", "/games/unknown"]) {
    assert.equal(shouldInviteGuestOnExit(path, null), false, path);
  }
});
