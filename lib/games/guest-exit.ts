import { GAME_NAMES } from "./topics";

export function shouldInviteGuestOnExit(pathname: string, userId: string | null) {
  const gameId = pathname.split("/")[2] ?? "";
  return !userId && pathname === `/games/${gameId}` && Object.hasOwn(GAME_NAMES, gameId);
}
