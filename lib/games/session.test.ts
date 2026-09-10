import assert from "node:assert/strict";
import test from "node:test";
import { GAME_TOPICS, TOPICS_PAGE_SIZE } from "./topics";
import { readGameTrayRaw, writeGameTrayRaw } from "./session";

test("public collection has 24 complete sets, in three pages of eight", () => {
  assert.equal(GAME_TOPICS.length, 24);
  assert.equal(GAME_TOPICS.length / TOPICS_PAGE_SIZE, 3);
  assert.equal(new Set(GAME_TOPICS.map((topic) => topic.id)).size, 24);
  for (const topic of GAME_TOPICS) {
    assert.ok([8, 10, 12].includes(topic.cards.length));
    assert.equal(new Set(topic.cards.map((card) => card.id)).size, topic.cards.length);
    assert.ok(topic.cards.every((card) => card.type === topic.category && card.image?.startsWith("https://") && card.word));
  }
});

test("guest public play never reads or overwrites the account tray, including exit cleanup", () => {
  let account = JSON.stringify([{ id: "private", word: "teacher's own card" }]);
  const location = { pathname: "/games/image-reveal", search: "?topic=animals" };
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    location, localStorage: { getItem: () => account, setItem: (_key: string, value: string) => { account = value; } },
  } });
  try {
    const cards = JSON.parse(readGameTrayRaw()!);
    assert.equal(cards.length, 12);
    assert.equal(cards[0].word, "cat");
    // React cleanup runs after the URL has already changed.
    location.pathname = "/games"; location.search = "";
    writeGameTrayRaw(JSON.stringify(cards.slice(1)), "animals");
    assert.equal(JSON.parse(account)[0].id, "private");
    assert.equal(JSON.parse(readGameTrayRaw()!)[0].id, "private");
    writeGameTrayRaw(JSON.stringify([{ id: "custom", word: "updated" }]));
    assert.equal(JSON.parse(account)[0].id, "custom");
  } finally { Reflect.deleteProperty(globalThis, "window"); }
});

test("unchanged public cards remain free in the lesson tray, custom edits do not", async () => {
  const { findTopicForCards } = await import("./topics");
  const cards = GAME_TOPICS[0].cards;
  assert.equal(findTopicForCards([...cards].reverse())?.id, "animals");
  assert.equal(findTopicForCards(cards.slice(1)), undefined);
  assert.equal(findTopicForCards(cards.map((card, index) => index ? card : { ...card, word: "custom" })), undefined);
  assert.equal(findTopicForCards(cards.map((card, index) => index ? card : { ...card, image: "https://example.com/custom.png" })), undefined);
});

test("signup email return paths only allow known local games", async () => {
  const { safeGameReturnPath } = await import("./return-path");
  assert.equal(safeGameReturnPath("/games/custom?game=kaboom&topic=animals"), "/games/custom?game=kaboom&topic=animals");
  for (const value of ["https://example.com", "//example.com", "/games/custom?game=toString", "/games/custom?game=unknown", null]) assert.equal(safeGameReturnPath(value), null);
});
