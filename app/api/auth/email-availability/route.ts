import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
    const email = String(body?.email ?? "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("account_email_registry")
      .select("normalized_email")
      .eq("normalized_email", email)
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json({ available: !data });
  } catch (error: unknown) {
    console.error("Failed to check signup email availability:", error);
    return NextResponse.json({ error: "Email availability could not be checked." }, { status: 500 });
  }
}
