import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/ai/save-worksheet
 * Body: { teacher_id, title?, content_html, cefr_level? }
 * Uses SUPABASE_SERVICE_ROLE_KEY server-side to insert into ai_worksheets.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing Supabase envs: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const teacher_id = body.teacher_id;
    const content_html = body.content_html;

    if (!teacher_id || !content_html) {
      return NextResponse.json({ error: "Missing teacher_id or content_html" }, { status: 400 });
    }

    const payload = {
      teacher_id,
      title: body.title ?? `Worksheet ${new Date().toLocaleDateString()}`,
      content_html,
      cefr_level: body.cefr_level ?? null,
    };

    const { data, error } = await supabaseAdmin.from("ai_worksheets").insert(payload).select("id").single();

    if (error) {
      console.error("save-worksheet insert error:", error);
      return NextResponse.json({ error: error.message ?? "Insert failed", details: error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err: any) {
    console.error("save-worksheet unexpected error:", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}