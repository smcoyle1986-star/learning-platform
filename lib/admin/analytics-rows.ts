import "server-only";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export async function readAdminAnalyticsRows(
  table: string,
  columns: string,
  filterColumn: string,
  values: string[],
  options: { guestOnly?: boolean; orderColumn?: string } = {},
) {
  if (!values.length) return { data: [] as Array<Record<string, unknown>>, error: null };
  const rows: Array<Record<string, unknown>> = [];
  for (let index = 0; index < values.length; index += 100) {
    const batch = values.slice(index, index + 100);
    for (let offset = 0; ; offset += 1000) {
      let query = getSupabaseAdmin().from(table).select(columns)
        .in(filterColumn, batch)
        .order(options.orderColumn ?? "created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + 999);
      if (options.guestOnly) query = query.is("user_id", null);
      const { data, error } = await query;
      if (error) throw new Error(`Could not load ${table} journey: ${error.message}`);
      rows.push(...((data ?? []) as unknown as Array<Record<string, unknown>>));
      if (!data || data.length < 1000) break;
    }
  }
  return { data: rows, error: null };
}
