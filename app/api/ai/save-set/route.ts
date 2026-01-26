import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/ai/save-set
 * Body: { teacher_id, title?, source?, cards: [{id, lemma, type, forms, image_url}, ...] }
 * Uses SUPABASE_SERVICE_ROLE_KEY server-side to insert into ai_saved_sets.
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
    const cards = Array.isArray(body.cards) ? body.cards : [];

    if (!teacher_id || !cards.length) {
      return NextResponse.json({ error: "Missing teacher_id or cards" }, { status: 400 });
    }

    const payload = {
      teacher_id,
      title: body.title ?? `Bloom AI Set ${new Date().toLocaleDateString()}`,
      source: body.source ?? "lesson_tray",
      cards,
    };

    const { data, error } = await supabaseAdmin.from("ai_saved_sets").insert(payload).select("id").single();

    if (error) {
      console.error("save-set insert error:", error);
      return NextResponse.json({ error: error.message ?? "Insert failed", details: error }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (err: any) {
    console.error("save-set unexpected error:", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}