import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const ABANDONED_AFTER_DAYS = 14;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const supabase = getSupabaseAdmin();
    const threshold = Date.now() - ABANDONED_AFTER_DAYS * 24 * 60 * 60 * 1000;
    let page = 1;
    let deleted = 0;
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
      if (error) throw error;
      const users = data.users ?? [];
      for (const user of users) {
        if (!user.created_at || new Date(user.created_at).getTime() > threshold) continue;
        const { data: verification } = await supabase.from("classendo_email_verifications")
          .select("verified_at").eq("user_id", user.id).maybeSingle();
        if (verification?.verified_at) continue;
        const checks = await Promise.all([
          supabase.from("lesson_sets").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("worksheets").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("creator_images").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("game_prompt_sets").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        ]);
        if (checks.some((result) => (result.count ?? 0) > 0)) continue;
        const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
        if (deleteError) throw deleteError;
        deleted += 1;
      }
      if (users.length < 100) break;
      page += 1;
    }
    return NextResponse.json({ deleted, retainedAfterDays: ABANDONED_AFTER_DAYS });
  } catch (error) {
    console.error("Unverified-account cleanup failed:", error);
    return NextResponse.json({ error: "Cleanup failed." }, { status: 500 });
  }
}
