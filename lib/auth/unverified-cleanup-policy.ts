export type CleanupDecisionInput = {
  createdAt: string | null;
  now: number;
  verified: boolean | null;
  contentCounts: Record<string, number> | null;
  contentChecksCertain: boolean;
  activityStatus: "active" | "inactive" | "unknown";
};

export function decideUnverifiedAccountCleanup(input: CleanupDecisionInput) {
  const threshold = input.now - 30 * 24 * 60 * 60 * 1000;
  const createdAt = input.createdAt ? Date.parse(input.createdAt) : NaN;
  if (!Number.isFinite(createdAt) || createdAt > threshold) return "keep" as const;
  if (input.verified !== false || !input.contentChecksCertain || !input.contentCounts) return "keep" as const;
  const counts = Object.values(input.contentCounts);
  if (counts.some((count) => !Number.isFinite(count) || count < 0 || count > 0)) return "keep" as const;
  if (input.activityStatus !== "inactive") return "keep" as const;
  return "delete" as const;
}
