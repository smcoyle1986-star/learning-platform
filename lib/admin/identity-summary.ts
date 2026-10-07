import "server-only";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export async function getAdminIdentitySummary(periodDays: number | null) {
  const { data, error } = await getSupabaseAdmin().rpc("get_admin_identity_summary", { period_days: periodDays });
  if (error) throw new Error(`Could not load identity analytics: ${error.message}`);
  const row = (data ?? {}) as Record<string, unknown>;
  const count = (key: string) => Number(row[key] ?? 0);
  return {
    totalAccounts: count("total_accounts"), verified: count("verified"), unverified: count("unverified"),
    teachers: count("teachers"), tutors: count("tutors"), students: count("students"), parents: count("parents"),
    other: count("other"), unclassified: count("unclassified"), activeUsers: count("active_users"), newUsers: count("new_users"),
    uniqueGuests: count("unique_guests"), returningGuests: count("returning_guests"), guestSessions: count("guest_sessions"),
    meaningfulGuests: count("meaningful_guests"), guestSignups: count("guest_signups"),
    cohortVerified: count("cohort_verified"), cohortTrialStarted: count("cohort_trial_started"),
    trialStarted: count("trial_started"), premium: count("premium"),
  };
}
