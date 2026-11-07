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

export function resolveVerificationGrace(raw: {
  verified: boolean;
  email?: string | null;
  verifiedAt?: string | null;
  deadline?: string | null;
  serverNow: string;
  activatedAt?: string | null;
}): VerificationGrace {
  // Keep accepting the legacy RPC shape during rollout, but deadline data no
  // longer restricts Free account access or drives countdown messaging.
  const deadline = null;
  const daysRemaining = null;
  const phase = raw.verified ? "verified" : "pending";
  return { verified: raw.verified, email: raw.email ?? null, verifiedAt: raw.verifiedAt ?? null,
    deadline, serverNow: raw.serverNow, activatedAt: raw.activatedAt ?? null, phase, daysRemaining };
}
