import { createClient } from "@supabase/supabase-js";

import { getEnv } from "@/lib/server/env";

type LooseDatabase = any;

let cachedClient: ReturnType<typeof createClient<LooseDatabase>> | null = null;

export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient;

  cachedClient = createClient<LooseDatabase>(
    getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    getEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  return cachedClient;
}
