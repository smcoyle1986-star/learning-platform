import type { NextRequest } from "next/server";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getRequestUser(request: NextRequest | Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    return data.user ?? null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error) throw error;
  return data.user ?? null;
}
