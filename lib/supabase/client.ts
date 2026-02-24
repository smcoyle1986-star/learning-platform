import { createClient } from "@supabase/supabase-js";

const SUPABASE_CLIENT_ID = Math.random().toString(36).slice(2, 9);

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// DEV instrumentation
if (typeof window !== "undefined") {
  try {
    (window as any).__SUPABASE_CLIENT__ =
      (window as any).__SUPABASE_CLIENT__ || supabase;
    (window as any).__SUPABASE_CLIENT_ID__ =
      (window as any).__SUPABASE_CLIENT_ID__ || SUPABASE_CLIENT_ID;
  } catch {}

  console.log(
    "lib/supabase/client.ts created supabase client id:",
    (window as any).__SUPABASE_CLIENT_ID__
  );
}
