import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { assertCanCreateDashboardResource } from "@/lib/billing/access";

type AiSaveRequest = {
  title?: string;
  cards?: any[];
  prompt?: string;
  source?: string;
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

/* Simple card normalizer */
function normalizeCard(raw: any, idx?: number) {
  const id =
    String(
      raw?.id ??
        raw?.uid ??
        raw?.card_id ??
        raw?.lesson_card_id ??
        raw?.word ??
        `${Date.now()}-${idx ?? 0}`
    );
  const word = String(
    raw?.word ??
      raw?.front ??
      raw?.lemma ??
      raw?.text ??
      raw?.forms?.singular ??
      raw?.forms?.base ??
      ""
  );
  const image = raw?.image ?? raw?.image_url ?? raw?.img ?? raw?.back ?? null;
  const forms = raw?.forms ?? null;
  return { id, word, image, forms, raw };
}
function normalizeCards(arr: any[]) {
  if (!Array.isArray(arr)) return [];
  return arr.map((r, i) => normalizeCard(r, i));
}

/* Optional: call OpenAI to generate cards from prompt */
async function callOpenAI(prompt: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Missing OPENAI_API_KEY");
  const messages = [
    { role: "system", content: "Return a JSON array of flashcards only. Each item: { word, image? }." },
    { role: "user", content: prompt },
  ];
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: "gpt-3.5-turbo", messages, temperature: 0.7, max_tokens: 800 }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI request failed: ${res.status} ${text}`);
  }
  const body = await res.json();
  const assistant = body?.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(assistant);
    if (!Array.isArray(parsed)) throw new Error("OpenAI did not return an array");
    return parsed;
  } catch (e) {
    const firstJson = assistant.match(/\[[\s\S]*\]/);
    if (firstJson) return JSON.parse(firstJson[0]);
    throw new Error("Failed to parse OpenAI response as JSON: " + String(e));
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AiSaveRequest;

    if (!body.title && !body.prompt) {
      return NextResponse.json({ error: "title or prompt required" }, { status: 400 });
    }

    // server-side Supabase client (service role)
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return NextResponse.json({ error: "Missing Supabase server keys" }, { status: 500 });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Require Authorization Bearer token so we can derive the user (safer than trusting body.teacher_id)
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    if (!token) return NextResponse.json({ error: "Authorization Bearer token required" }, { status: 401 });

    const userRes: any = await supabase.auth.getUser(token);
    const user = userRes?.data?.user ?? null;
    if (!user || !user.id) return NextResponse.json({ error: "Invalid token / user not found" }, { status: 401 });
    const teacherId = user.id;

    await assertCanCreateDashboardResource(supabase, teacherId);

    // Build cards array (client-sent or generated)
    let cards: any[] = Array.isArray(body.cards) ? body.cards : [];
    if ((!cards || cards.length === 0) && body.prompt) {
      const generated = await callOpenAI(body.prompt);
      cards = Array.isArray(generated) ? generated : [];
    }
    const normalized = normalizeCards(cards || []);

    // Create lesson_set
    const lessonPayload = {
      name: body.title ?? "AI Generated Set",
      user_id: teacherId,
      last_used: new Date().toISOString(),
    };

    const { data: lessonData, error: lessonErr } = await supabase
      .from("lesson_sets")
      .insert(lessonPayload)
      .select("id")
      .single();

    if (lessonErr || !lessonData) {
      console.error("Failed to insert lesson_set:", lessonErr);
      throw lessonErr || new Error("Failed to insert lesson_set");
    }
    const lessonSetId = (lessonData as any).id;

    // Insert cards rows; rollback lesson_set if cards insert fails
    if (normalized.length > 0) {
      const cardsToInsert = normalized.map((c: any, idx: number) => ({
        lesson_set_id: lessonSetId,
        front: c.word ?? "",
        back: c.image ?? null,
        position: idx,
      }));

      const { error: cardsErr } = await supabase.from("cards").insert(cardsToInsert);
      if (cardsErr) {
        // rollback lesson_set
        try {
          await supabase.from("lesson_sets").delete().eq("id", lessonSetId);
        } catch (delErr) {
          console.error("Rollback delete lesson_set failed:", delErr);
        }
        console.error("Failed to insert cards:", cardsErr);
        throw cardsErr;
      }
    }

    return NextResponse.json({ ok: true, id: String(lessonSetId), cards: normalized });
  } catch (err: any) {
    console.error("AI save-set error:", err);
    const message = err?.message ?? "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: /upgrade to premium|free accounts can save/i.test(message) ? 403 : 500 }
    );
  }
}
