import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const destination = new URL(next, url.origin);
      destination.searchParams.set("email_confirmed", "1");
      return NextResponse.redirect(destination);
    }
  }

  return NextResponse.redirect(new URL("/auth/auth-code-error", url.origin));
}
