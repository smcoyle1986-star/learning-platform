import { GAME_NAMES, customGameUrl, getGameTopic } from "./topics";
/** Only a known local game destination may be carried through an email link. */
export function safeGameReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/games/custom?")) return null;
  const params = new URLSearchParams(value.slice(value.indexOf("?") + 1));
  const game = params.get("game") ?? "";
  if (!Object.hasOwn(GAME_NAMES, game)) return null;
  return customGameUrl(game, getGameTopic(params.get("topic"))?.id);
}
