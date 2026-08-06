import { NextRequest, NextResponse } from "next/server";

import { assertCanCreateWorksheet, getBillingAccessForUser } from "@/lib/billing/access";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ worksheetId: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await getRequestUser(request);
    if (!user?.id) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    const { worksheetId } = await params;
    const supabase = getSupabaseAdmin();
    const access = await getBillingAccessForUser(supabase, user.id);
    if (!access.isPremium) {
      return NextResponse.json({ error: "Premium is required to copy Community worksheets." }, { status: 403 });
    }

    const { data: source, error: sourceError } = await supabase
      .from("worksheets")
      .select("*")
      .eq("id", worksheetId)
      .maybeSingle();
    if (sourceError) throw sourceError;
    if (!source || source.archived_at || (!source.is_public && source.user_id !== user.id)) {
      return NextResponse.json({ error: "Worksheet not found." }, { status: 404 });
    }
    if (source.user_id === user.id) {
      return NextResponse.json({ worksheetId: source.id, outcome: "owned" });
    }

    const originId = String(source.copied_from ?? source.id);
    const { data: existing, error: existingError } = await supabase
      .from("worksheets")
      .select("id")
      .eq("user_id", user.id)
      .eq("copied_from", originId)
      .limit(1)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing?.id) {
      return NextResponse.json({ worksheetId: existing.id, outcome: "already_saved" });
    }

    await assertCanCreateWorksheet(supabase, user.id);
    const now = new Date().toISOString();
    const { data: copied, error: copyError } = await supabase
      .from("worksheets")
      .insert({
        user_id: user.id,
        name: source.name,
        worksheet_type: source.worksheet_type,
        is_public: false,
        cards: source.cards,
        draft: source.draft,
        tags: source.tags ?? [],
        copied_from: originId,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single();
    if (copyError) {
      if (copyError.code === "23505") {
        const { data: duplicate } = await supabase
          .from("worksheets")
          .select("id")
          .eq("user_id", user.id)
          .eq("copied_from", originId)
          .maybeSingle();
        if (duplicate?.id) return NextResponse.json({ worksheetId: duplicate.id, outcome: "already_saved" });
      }
      throw copyError;
    }

    await supabase
      .from("worksheets")
      .update({ download_count: Number(source.download_count ?? 0) + 1 })
      .eq("id", source.id);
    return NextResponse.json({ worksheetId: copied.id, outcome: "copied" });
  } catch (error: unknown) {
    console.error("Failed to copy community worksheet:", error);
    const message = error instanceof Error ? error.message : "Failed to copy worksheet.";
    return NextResponse.json(
      { error: message },
      { status: /premium|required|free accounts can save|upgrade/i.test(message) ? 403 : 500 },
    );
  }
}
