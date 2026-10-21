import "server-only";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type Counts = {
  modalViews: number;
  uniqueExposed: number;
};

export type AdminConversionFunnels = {
  verification: Counts & {
    resendClicks: number;
    successfulResends: number;
    remindLaterClicks: number;
    subsequentlyVerified: number;
    verifiedWithoutObservedModal: number;
  };
  guest: Counts & {
    signupClicks: number;
    signupArrivals: number;
    attributedSignups: number;
    convertedGuests: number;
    attributedVerified: number;
    byGame: Array<{ gameKey: string; signups: number }>;
  };
};

export async function getAdminConversionFunnels(periodDays: number | null): Promise<AdminConversionFunnels> {
  const { data, error } = await getSupabaseAdmin().rpc("get_admin_conversion_funnels", { period_days: periodDays });
  if (error) throw new Error(`Could not load conversion funnels: ${error.message}`);
  return data as AdminConversionFunnels;
}
