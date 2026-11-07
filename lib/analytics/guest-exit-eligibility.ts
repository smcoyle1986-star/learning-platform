export const GUEST_EXIT_RECEIPT_LIFETIME_MS = 30 * 60 * 1000;

export function guestExitSignupIsAttributable(input: {
  clickedAt: string;
  arrivedAt: string | null;
  existingUserId: string | null;
  sessionKey: string;
  anonymousId: string;
}, browser: { sessionKey: unknown; anonymousId: unknown }, accountCreatedAt: string, now: number) {
  const clickTime = Date.parse(input.clickedAt);
  const accountTime = Date.parse(accountCreatedAt);
  return Number.isFinite(clickTime)
    && Number.isFinite(accountTime)
    && now >= clickTime
    && now - clickTime <= GUEST_EXIT_RECEIPT_LIFETIME_MS
    && accountTime >= clickTime
    && accountTime - clickTime <= GUEST_EXIT_RECEIPT_LIFETIME_MS
    && Boolean(input.arrivedAt)
    && !input.existingUserId
    && input.sessionKey === browser.sessionKey
    && input.anonymousId === browser.anonymousId;
}
