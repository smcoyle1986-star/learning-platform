import { NextRequest, NextResponse } from "next/server";

/**
 * AI inflect endpoint
 *
 * - If OPENAI_MOCK=true returns deterministic mock responses (no OpenAI call).
 * - Otherwise calls OpenAI Chat Completions with model from OPENAI_MODEL (fallback gpt-4o-mini).
 *
 * Request body:
 * {
 *   cards: [{ id, type, lemma, forms?, image_url? }, ...],
 *   options: { nouns?: {...}, verbs?: {...}, adjectives?: {...}, modals?: {...}, ... }
 * }
 *
 * Response:
 * { cards: [ { id, forms: {...} }, ... ], mock?: true }
 *
 * Important:
 * - Server-only: requires OPENAI_API_KEY in server environment for real calls.
 * - Keep temperature low (0.0) for deterministic transformations.
 */

type ClientCard = {
  id: string;
  type: string;
  lemma: string;
  forms?: any;
  image_url?: string | null;
};

function simplePlural(noun: string) {
  if (!noun) return noun;
  if (/(s|x|z|ch|sh)$/i.test(noun)) return noun + "es";
  if (/[aeiou]y$/i.test(noun)) return noun + "s";
  if (/[^aeiou]y$/i.test(noun)) return noun.slice(0, -1) + "ies";
  if (/(f|fe)$/i.test(noun)) return noun.replace(/(fe|f)$/, "ves");
  return noun + "s";
}
function articleFor(word: string) {
  if (!word) return "a";
  return /^[aeiou]/i.test(word.trim()) ? "an" : "a";
}

/** Deterministic mock used when OPENAI_MOCK=true or when provider fails. */
function mockInflect(cards: ClientCard[], options: any) {
  const out = cards.map((c) => {
    const forms: any = {};
    if (c.type === "noun") {
      if (options?.nouns?.plural) forms.plural = c.forms?.plural ?? simplePlural(c.lemma);
      if (options?.nouns?.singular) {
        forms.singular = c.forms?.singular ?? c.lemma;
        if (options?.nouns?.article) forms.display_singular = `${articleFor(forms.singular)} ${forms.singular}`;
      }
    } else if (c.type === "verb") {
      const base = c.forms?.base ?? c.lemma;
      if (options?.verbs?.third) {
        if (/(s|x|z|ch|sh)$/i.test(base)) forms.third = base + "es";
        else if (/[^aeiou]y$/i.test(base)) forms.third = base.slice(0, -1) + "ies";
        else forms.third = base + "s";
      }
      if (options?.verbs?.past) {
        forms.past = c.forms?.past ?? (base.endsWith("e") ? base + "d" : base + "ed");
        forms.pastParticiple = c.forms?.pastParticiple ?? forms.past;
      }
      if (options?.verbs?.continuous) {
        forms.presentParticiple = c.forms?.presentParticiple ?? (base.endsWith("e") ? base.slice(0, -1) + "ing" : base + "ing");
      }
    } else if (c.type === "adjective") {
      if (options?.adjectives?.comparative) {
        forms.comparative = c.forms?.comparative ?? (c.lemma.length <= 6 ? c.lemma + "er" : "more " + c.lemma);
      }
      if (options?.adjectives?.superlative) {
        forms.superlative = c.forms?.superlative ?? (c.lemma.length <= 6 ? c.lemma + "est" : "most " + c.lemma);
      }
    } else {
      // phonics / prepositions etc. keep base
      forms.base = c.forms?.base ?? c.lemma;
    }
    return { id: c.id, forms };
  });
  return { cards: out, mock: true };
}

/** Safely try to parse JSON produced by the model. */
function extractJsonFromText(text: string) {
  // try direct parse
  try {
    return JSON.parse(text);
  } catch {
    // try to find last JSON object in text
    const match = text.match(/\{[\s\S]*\}$/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const cards: ClientCard[] = Array.isArray(body.cards) ? body.cards : [];
    const options = body.options ?? {};

    // DEV mock mode
    if (String(process.env.OPENAI_MOCK).toLowerCase() === "true") {
      const payload = mockInflect(cards, options);
      const res = NextResponse.json(payload);
      res.headers.set("x-ai-mock", "true");
      return res;
    }

    // Production: require OPENAI_API_KEY
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) {
      return NextResponse.json({ error: "Server not configured: missing OPENAI_API_KEY" }, { status: 500 });
    }

    const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const systemPrompt = [
      `You are an English morphology assistant. Given a JSON payload of flashcards and options, return strict JSON only with the shape:`,
      `{"cards":[ {"id":"<id>", "forms": { /* only changed or relevant form fields here */ }}, ... ]}`,
      `- DO NOT return any explanation or plain text outside the JSON.`,
      `- The "forms" object should only include fields you changed or new fields (e.g. plural, past, third, presentParticiple, comparative, superlative, display_singular etc.).`,
      `- Do NOT modify images or any metadata; only return textual form changes.`,
      `- Keep output deterministic (temperature 0.0).`,
    ].join("\n\n");

    // Send the cards+options as user content (JSON stringify)
    const userContent = JSON.stringify({ cards, options });

    const payload = {
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.0,
      max_tokens: 1500,
    };

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("OpenAI provider error:", resp.status, text);
      // fallback to mock so UI remains usable
      const fallback = mockInflect(cards, options);
      const res = NextResponse.json({ ...fallback, error: "OpenAI provider error, mock used", providerDetails: text });
      res.headers.set("x-ai-mock", "true");
      return res;
    }

    const data = await resp.json();
    const content = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text;

    if (!content || typeof content !== "string") {
      console.error("OpenAI returned empty content", data);
      const fallback = mockInflect(cards, options);
      const res = NextResponse.json({ ...fallback, error: "AI returned empty content, mock used" });
      res.headers.set("x-ai-mock", "true");
      return res;
    }

    // Try to parse JSON out of model content
    const parsed = extractJsonFromText(content);
    if (!parsed || !Array.isArray(parsed.cards)) {
      console.error("Failed to parse AI JSON. Raw content:", content);
      // fallback with mock, but return the raw content in debug field
      const fallback = mockInflect(cards, options);
      const res = NextResponse.json({ ...fallback, error: "Unable to parse AI output as JSON", aiRaw: content });
      res.headers.set("x-ai-mock", "true");
      return res;
    }

    // Good response — return parsed cards
    return NextResponse.json(parsed);
  } catch (err: any) {
    console.error("AI inflect error:", err);
    // On unexpected errors return mock fallback to keep UI working
    try {
      const cardsFallback: any = mockInflect((await req.json().catch(() => ({}))).cards ?? [], (await req.json().catch(() => ({}))).options ?? {});
      const res = NextResponse.json({ ...cardsFallback, error: String(err?.message ?? err) });
      res.headers.set("x-ai-mock", "true");
      return res;
    } catch (inner) {
      return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
    }
  }
}