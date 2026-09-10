import { getGameTopic } from "./topics";
import { LESSON_TRAY_KEY } from "@/lib/lessons/tray";

export const GAME_SOURCE_KEY = "classendo-games-source";
export function currentGameTopic() {
  if (typeof window === "undefined" || !/^\/games\/[^/]+$/.test(window.location.pathname)) return undefined;
  return getGameTopic(new URLSearchParams(window.location.search).get("topic"));
}
// Public play always uses canonical cards, never an account tray or a caller-supplied payload.
export function readGameTrayRaw() {
  const topic = currentGameTopic();
  return topic ? JSON.stringify(topic.cards) : window.localStorage.getItem(LESSON_TRAY_KEY);
}
export function writeGameTrayRaw(raw: string, publicTopicId?: string) {
  // Consuming cards inside a public game must not consume the teacher's full topic tray.
  if (!publicTopicId) window.localStorage.setItem(LESSON_TRAY_KEY, raw);
}

export function getGameSource() {
  try { return sessionStorage.getItem(GAME_SOURCE_KEY) === "tray" ? "tray" : "topics"; } catch { return "topics"; }
}
export function setGameSource(source: "topics" | "tray") {
  try { sessionStorage.setItem(GAME_SOURCE_KEY, source); } catch {}
  window.dispatchEvent(new Event("game-source-updated"));
}
export function subscribeGameSource(notify: () => void) {
  window.addEventListener("game-source-updated", notify);
  return () => window.removeEventListener("game-source-updated", notify);
}
