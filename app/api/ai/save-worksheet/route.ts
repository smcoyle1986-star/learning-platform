import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type AiSaveWorksheetRequest = {
  teacher_id?: string;
  title?: string;
  cefr_level?: string;
  worksheet_types?: string[]; // text[]
  filters?: any; // JSONB: options, cards, etc.
  pdf_url?: string | null;
  content?: string | null; // (optional) html content
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AiSaveWorksheetRequest;

    if (!body.title) {
      return NextResponse.json({ error: "title required" }, { status: 400 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: "Missing Supabase server keys" }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Resolve teacher id: prefer body.teacher_id, fallback to Authorization Bearer <token>
    let teacherId = body.teacher_id ?? null;
    if (!teacherId) {
      const authHeader = req.headers.get("authorization") || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
      if (token) {
        try {
          const userResult: any = await supabase.auth.getUser(token);
          const user = userResult?.data?.user ?? null;
          if (user && user.id) teacherId = user.id;
        } catch (e) {
          console.warn("Could not derive teacher id from token:", e);
        }
      }
    }

    if (!teacherId) {
      return NextResponse.json({ error: "teacher_id required (either in body or via Authorization header)" }, { status: 400 });
    }

    const insertPayload: any = {
      teacher_id: teacherId,
      title: body.title,
      cefr_level: body.cefr_level ?? "A1",
      worksheet_types: Array.isArray(body.worksheet_types) ? body.worksheet_types : [],
      filters: body.filters ?? {},
      pdf_url: body.pdf_url ?? null,
    };

    // Optionally include content in filters so the HTML is preserved
    if (body.content) insertPayload.filters = { ...(insertPayload.filters || {}), content: body.content };

    const { data: saved, error: saveErr } = await supabase
      .from("ai_worksheets")
      .insert(insertPayload)
      .select("id, created_at")
      .single();

    if (saveErr) {
      console.error("Insert ai_worksheets error:", saveErr);
      throw saveErr;
    }

    return NextResponse.json({ ok: true, id: String((saved as any).id), worksheet: insertPayload });
  } catch (err: any) {
    console.error("AI save-worksheet error:", err);
    return NextResponse.json({ error: err?.message ?? "Unknown error" }, { status: 500 });
  }
}