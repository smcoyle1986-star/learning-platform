import { NextResponse } from "next/server";

import { assertCanCreateDashboardResource, getBillingAccessForUser } from "@/lib/billing/access";
import { getRequestUser } from "@/lib/server/request-auth";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

type AiSaveRequest = {
  title?: string;
  cards?: unknown[];
  prompt?: string;
  source?: string;
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

/* Simple card normalizer */
type NormalizedCard = {
  id: string;
  word: string;
  image: string | null;
  forms: Record<string, unknown> | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function normalizeCard(raw: unknown, idx?: number): NormalizedCard {
  const source = asRecord(raw);
  const forms = asRecord(source.forms);
  const id =
    String(
      source.id ??
        source.uid ??
        source.card_id ??
        source.lesson_card_id ??
        source.word ??
        `${Date.now()}-${idx ?? 0}`
    );
  const word = String(
    source.word ??
      source.front ??
      source.lemma ??
      source.text ??
      forms.singular ??
      forms.base ??
      ""
  );
  const rawImage = source.image ?? source.image_url ?? source.img ?? source.back;
  const image = typeof rawImage === "string" ? rawImage : null;
  return { id, word, image, forms: Object.keys(forms).length ? forms : null };
}
function normalizeCards(arr: unknown[]) {
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
  const body = asRecord(await res.json());
  const choices = Array.isArray(body.choices) ? body.choices : [];
  const firstChoice = asRecord(choices[0]);
  const assistant = String(asRecord(firstChoice.message).content ?? "");
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
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 256 * 1024) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    const body = (await req.json()) as AiSaveRequest;

    if (!body.title && !body.prompt) {
      return NextResponse.json({ error: "title or prompt required" }, { status: 400 });
    }

    const user = await getRequestUser(req);
    if (!user?.id) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
    const supabase = getSupabaseAdmin();
    const teacherId = user.id;

    await assertCanCreateDashboardResource(supabase, teacherId);

    // Build cards array (client-sent or generated)
    let cards: unknown[] = Array.isArray(body.cards) ? body.cards : [];
    if ((!cards || cards.length === 0) && body.prompt) {
      if (body.prompt.length > 2_000) {
        return NextResponse.json({ error: "AI prompts must be 2,000 characters or fewer." }, { status: 400 });
      }
      const access = await getBillingAccessForUser(supabase, teacherId);
      if (!access.isPremium) {
        return NextResponse.json({ error: "Premium is required for AI-generated sets." }, { status: 403 });
      }
      const generated = await callOpenAI(body.prompt);
      cards = Array.isArray(generated) ? generated : [];
    }
    if (cards.length > 100) {
      return NextResponse.json({ error: "Sets can contain up to 100 cards." }, { status: 400 });
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
    const lessonSetId = String(lessonData.id);

    // Insert cards rows; rollback lesson_set if cards insert fails
    if (normalized.length > 0) {
      const cardsToInsert = normalized.map((c, idx) => ({
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
  } catch (err: unknown) {
    console.error("AI save-set error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: /upgrade to premium|free accounts can save/i.test(message) ? 403 : 500 }
    );
  }
}
