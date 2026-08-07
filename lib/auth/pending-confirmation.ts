export const PENDING_CONFIRMATION_STORAGE_KEY = "classendo_pending_email_confirmation";

export type PendingEmailConfirmation = {
  email: string;
  nextPath: string;
  sentAt: number;
};

export function savePendingEmailConfirmation(value: PendingEmailConfirmation) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_CONFIRMATION_STORAGE_KEY, JSON.stringify(value));
}

export function readPendingEmailConfirmation(): PendingEmailConfirmation | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(PENDING_CONFIRMATION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingEmailConfirmation>;
    if (
      typeof parsed.email !== "string"
      || typeof parsed.nextPath !== "string"
      || typeof parsed.sentAt !== "number"
      || !parsed.nextPath.startsWith("/")
      || parsed.nextPath.startsWith("//")
    ) {
      return null;
    }
    return {
      email: parsed.email,
      nextPath: parsed.nextPath,
      sentAt: parsed.sentAt,
    };
  } catch {
    return null;
  }
}

export function clearPendingEmailConfirmation() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_CONFIRMATION_STORAGE_KEY);
}

export function maskEmailAddress(email: string) {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${"•".repeat(Math.max(3, localPart.length - visible.length))}@${domain}`;
}

export function buildConfirmationRedirect(origin: string, nextPath: string) {
  return `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}
