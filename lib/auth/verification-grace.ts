export type VerificationGrace = {
  verified: boolean;
  email: string | null;
  verifiedAt: string | null;
  deadline: string | null;
  serverNow: string;
  activatedAt: string | null;
  phase: "verified" | "pending" | "reminder" | "urgent" | "expired";
  daysRemaining: number | null;
};

const DAY = 86_400_000;

export function verificationDeadline(createdAt: string, activatedAt: string | null): string | null {
  if (!activatedAt) return null;
  const start = Math.max(Date.parse(createdAt), Date.parse(activatedAt));
  if (!Number.isFinite(start)) throw new Error("Invalid verification policy timestamp.");
  return new Date(start + 21 * DAY).toISOString();
}


export function resolveVerificationGrace(raw: {
  verified: boolean;
  email?: string | null;
  verifiedAt?: string | null;
  deadline?: string | null;
  serverNow: string;
  activatedAt?: string | null;
}): VerificationGrace {
  const deadline = raw.deadline ?? null;
  const remaining = deadline ? Date.parse(deadline) - Date.parse(raw.serverNow) : null;
  if (deadline && (remaining === null || !Number.isFinite(remaining))) throw new Error("Invalid verification deadline.");
  const daysRemaining = remaining === null ? null : Math.max(0, Math.ceil(remaining / DAY));
  const phase = raw.verified ? "verified"
    : remaining === null ? "pending"
    : remaining <= 0 ? "expired"
    : remaining <= 7 * DAY ? "urgent"
    : "reminder";
  return { verified: raw.verified, email: raw.email ?? null, verifiedAt: raw.verifiedAt ?? null,
    deadline, serverNow: raw.serverNow, activatedAt: raw.activatedAt ?? null, phase, daysRemaining };
}
