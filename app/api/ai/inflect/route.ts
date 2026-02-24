import { NextRequest, NextResponse } from "next/server";

type ClientCard = {
  id: string;
  type: string;
  lemma: string;
  forms?: any;
  image_url?: string | null;
};

type OptionsShape = {
  verbs?: { mode?: string; negative?: boolean; subject?: string };
  nouns?: { mode?: string; skip_uncount?: boolean; negative?: boolean };
  adjectives?: { comparative?: boolean; superlative?: boolean };
  modals?: { include?: string[]; negative?: boolean };
  images?: { transform?: boolean };
  negative?: boolean;
  subject?: string;
};

/* -------------------------
   Irregulars and helpers
   ------------------------- */

const UNCOUNT_NOUNS = new Set([
  "water","rice","information","furniture","advice","bread","money","sand","snow","music","traffic","luggage","equipment",
]);

const IRREGULAR_NOUNS: Record<string,string> = {
  child: "children", person: "people", man: "men", woman: "women", mouse: "mice", goose: "geese", tooth: "teeth", foot: "feet", ox: "oxen",
};

const IRREGULAR_VERBS: Record<string, { past: string; pastParticiple?: string; third?: string; presentParticiple?: string }> = {
  be: { past: "was", pastParticiple: "been", third: "is", presentParticiple: "being" },
  have: { past: "had", pastParticiple: "had", third: "has", presentParticiple: "having" },
  do: { past: "did", pastParticiple: "done", third: "does", presentParticiple: "doing" },
  go: { past: "went", pastParticiple: "gone", third: "goes", presentParticiple: "going" },
  eat: { past: "ate", pastParticiple: "eaten", third: "eats", presentParticiple: "eating" },
  fly: { past: "flew", pastParticiple: "flown", third: "flies", presentParticiple: "flying" },
  break: { past: "broke", pastParticiple: "broken", third: "breaks", presentParticiple: "breaking" },
  catch: { past: "caught", pastParticiple: "caught", third: "catches", presentParticiple: "catching" },
  dig: { past: "dug", pastParticiple: "dug", third: "digs", presentParticiple: "digging" },
  run: { past: "ran", pastParticiple: "run", third: "runs", presentParticiple: "running" },
  see: { past: "saw", pastParticiple: "seen", third: "sees", presentParticiple: "seeing" },
  write: { past: "wrote", pastParticiple: "written", third: "writes", presentParticiple: "writing" },
  make: { past: "made", pastParticiple: "made", third: "makes", presentParticiple: "making" },
  // add more as needed
};

function isUncount(noun?: string) {
  if (!noun) return false;
  return UNCOUNT_NOUNS.has(noun.toLowerCase());
}

function pluralize(noun?: string) {
  if (!noun) return noun ?? "";
  const k = noun.toLowerCase();
  if (IRREGULAR_NOUNS[k]) return IRREGULAR_NOUNS[k];
  if (/(s|x|z|ch|sh)$/i.test(noun)) return noun + "es";
  if (/[^aeiou]y$/i.test(noun)) return noun.slice(0, -1) + "ies";
  if (/(f|fe)$/i.test(noun)) return noun.replace(/(fe|f)$/, "ves");
  return noun + "s";
}

/* Verb helpers with improved rules */
function verbThird(base?: string) {
  if (!base) return base ?? "";
  const k = base.toLowerCase();
  if (IRREGULAR_VERBS[k]?.third) return IRREGULAR_VERBS[k].third!;
  if (/(s|x|z|ch|sh)$/i.test(base)) return base + "es";
  if (/[^aeiou]y$/i.test(base)) return base.slice(0, -1) + "ies";
  return base + "s";
}

function verbPast(base?: string) {
  if (!base) return base ?? "";
  const k = base.toLowerCase();
  if (IRREGULAR_VERBS[k]?.past) return IRREGULAR_VERBS[k].past!;
  if (base.endsWith("e")) return base + "d";
  if (/[^aeiou]y$/i.test(base)) return base.slice(0, -1) + "ied";
  return base + "ed";
}

function verbPastParticiple(base?: string) {
  if (!base) return base ?? "";
  const k = base.toLowerCase();
  if (IRREGULAR_VERBS[k]?.pastParticiple) return IRREGULAR_VERBS[k].pastParticiple!;
  // fallback to past
  return verbPast(base);
}

/* present participle with doubling rule (run -> running, dig -> digging) */
function verbPresentParticiple(base?: string) {
  if (!base) return base ?? "";
  const k = base.toLowerCase();
  if (IRREGULAR_VERBS[k]?.presentParticiple) return IRREGULAR_VERBS[k].presentParticiple!;
  // if ends with 'ie' -> replace with 'ying' (lie -> lying)
  if (base.endsWith("ie")) return base.slice(0, -2) + "ying";
  // drop final 'e' (make -> making) but not 'ee' (see -> seeing)
  if (base.endsWith("e") && !base.endsWith("ee")) return base.slice(0, -1) + "ing";
  // doubling consonant for CVC short words: consonant-vowel-consonant (and not w,x,y)
  if (/^[a-zA-Z]{2,}$/.test(base)) {
    const m = base.match(/([aeiou])([bcdfghjklmnpqrstvwxyz])$/i);
    if (m && base.length <= 3) {
      const last = base.slice(-1);
      if (!/[wxy]/i.test(last)) return base + last + "ing";
    }
  }
  // default
  return base + "ing";
}

/* Subject helpers */
function cleanSubject(s?: string | null) {
  if (!s) return null;
  return String(s).trim().toLowerCase();
}
function isThirdSingularSubject(subject?: string | null) {
  const s = cleanSubject(subject);
  if (!s) return true;
  const thirdSet = new Set(["he","she","it"]);
  const nonThird = new Set(["i","you","we","they","you all","youall"]);
  if (thirdSet.has(s)) return true;
  if (nonThird.has(s)) return false;
  return true;
}
function auxHas(subject?: string) { return isThirdSingularSubject(subject) ? "has" : "have"; }
function auxHasNegative(subject?: string) {
  const h = auxHas(subject);
  return { contracted: h === "has" ? "hasn't" : "haven't", full: `${h} not` };
}
function auxDoPresent(subject?: string) { return isThirdSingularSubject(subject) ? "does" : "do"; }
function auxDoPresentNegatives(subject?: string) {
  const d = auxDoPresent(subject); return { contracted: d === "does" ? "doesn't" : "don't", full: `${d} not` };
}
function auxBePresent(subject?: string) {
  const s = cleanSubject(subject); if (!s) return "is"; if (s === "i") return "am"; if (s === "you") return "are"; if (s === "we"||s==="they") return "are"; return "is";
}
function auxBePresentNegative(subject?: string) { const b = auxBePresent(subject); return { contracted: b === "are" ? "aren't" : b === "is" ? "isn't" : b === "am" ? "am not" : `${b} not`, full: `${b} not` }; }

/* Modal templates */
const MODAL_TEMPLATES: Record<string, (subject:string, base:string, negative?:boolean)=>{phrase:string; phrase_contracted?:string}> = {
  will: (s,b,n)=> n? {phrase:`${s} will not ${b}`, phrase_contracted:`${s} won't ${b}`} : {phrase:`${s} will ${b}`},
  can: (s,b,n)=> n? {phrase:`${s} cannot ${b}`, phrase_contracted:`${s} can't ${b}`} : {phrase:`${s} can ${b}`},
  could: (s,b,n)=> n? {phrase:`${s} could not ${b}`, phrase_contracted:`${s} couldn't ${b}`} : {phrase:`${s} could ${b}`},
  may: (s,b,n)=> n? {phrase:`${s} may not ${b}`} : {phrase:`${s} may ${b}`},
  might: (s,b,n)=> n? {phrase:`${s} might not ${b}`} : {phrase:`${s} might ${b}`},
  shall: (s,b,n)=> n? {phrase:`${s} shall not ${b}`} : {phrase:`${s} shall ${b}`},
  should: (s,b,n)=> n? {phrase:`${s} should not ${b}`, phrase_contracted:`${s} shouldn't ${b}`} : {phrase:`${s} should ${b}`},
};

/* -------------------------
   Normalization tolerant to client shape
   ------------------------- */

function normalizeVerbMode(raw?: string) {
  if (!raw) return undefined;
  const s = String(raw).toLowerCase().replace(/\s+/g,"_").replace(/-/g,"_");
  if (["3rd","3rd_mix","third_mix","thirdmix","third-mix","third mix","3rdmix"].includes(s)) return "third_mix";
  if (["3rd_only","third","3rd"].includes(s)) return "third";
  if (s.includes("past")) return "past";
  if (["continuous","progressive","ing","present_continuous"].includes(s)) return "continuous";
  if (s.includes("perfect")) return "perfect";
  return s;
}
function normalizeNounMode(raw?: string) {
  if (!raw) return undefined;
  const s = String(raw).toLowerCase().replace(/\s+/g,"_").replace(/-/g,"_");
  if (["mix","mixed","both"].includes(s)) return "mix";
  if (["plural","plurals"].includes(s)) return "plural";
  if (["singular","sg"].includes(s)) return "singular";
  return s;
}

function normalizeOptions(raw:any): OptionsShape {
  if (!raw || typeof raw !== "object") return {};
  const opts: OptionsShape = {};
  const topNegative = Boolean(raw.negative);

  // nouns
  const nounRaw = raw.nouns ?? {};
  const nounOption = nounRaw.mode ?? raw.nounOption ?? raw.noun_option ?? null;
  opts.nouns = {
    mode: normalizeNounMode(nounOption ?? nounRaw.mode),
    skip_uncount: Boolean(nounRaw.skip_uncount ?? raw.skip_uncount ?? nounRaw.skipUncount),
    negative: Boolean(nounRaw.negative ?? topNegative),
  };

  // verbs
  const verbRaw = raw.verbs ?? {};
  const verbModeCandidate = verbRaw.mode ?? raw.verbOption ?? raw.verb_option ?? raw.mode ?? verbRaw.mode;
  opts.verbs = {
    mode: normalizeVerbMode(verbModeCandidate),
    negative: Boolean(verbRaw.negative ?? topNegative),
    subject: (verbRaw.subject as string) ?? (raw.subject as string) ?? "he",
  };

  // adjectives
  opts.adjectives = { comparative: false, superlative: false };
  const adjRaw = raw.adjectives ?? {};
  const adjOption = adjRaw.option ?? raw.adjOption ?? raw.adj_option ?? raw.adj ?? raw.adjOption;
  if (typeof adjOption === "string") {
    const s = String(adjOption).toLowerCase();
    if (s.includes("comp")) opts.adjectives.comparative = true;
    if (s.includes("super")) opts.adjectives.superlative = true;
    if (["mix","mixed","both"].includes(s)) { opts.adjectives.comparative = true; opts.adjectives.superlative = true; }
    if (s === "mixed") { opts.adjectives.comparative = true; opts.adjectives.superlative = true; }
  } else if (typeof adjRaw === "object") {
    opts.adjectives.comparative = Boolean(adjRaw.comparative ?? adjRaw.comp ?? false);
    opts.adjectives.superlative = Boolean(adjRaw.superlative ?? adjRaw.super ?? false);
  } else if (raw.adjOption === "mixed") {
    opts.adjectives.comparative = true; opts.adjectives.superlative = true;
  }

  // modals
  const modalSrc = raw.modalOptions ?? raw.modals ?? raw.modal_options ?? {};
  const include: string[] = [];
  if (modalSrc && typeof modalSrc === "object") {
    for (const k of Object.keys(modalSrc)) { if (modalSrc[k]) include.push(k); }
  }
  if (Array.isArray(raw.modals)) raw.modals.forEach((m:string)=> include.push(String(m)));
  opts.modals = { include, negative: Boolean((raw.modals && (raw.modals.negative ?? raw.modals.negative)) ?? raw.modalsNegative ?? topNegative) };

  // images
  opts.images = { transform: Boolean((raw.images && raw.images.transform) ?? raw.imagesTransform ?? raw.images_transform ?? false) };

  if (!opts.verbs) opts.verbs = { mode: undefined, negative: topNegative, subject: raw.subject ?? "he" };
  opts.subject = (raw.subject as string) ?? opts.verbs.subject;

  return opts;
}

/* -------------------------
   Extract JSON helper
   ------------------------- */

function extractJson(text?: string) {
  if (!text || typeof text !== "string") return null;
  let cleaned = text.replace(/```json/gi,"").replace(/```/g,"").trim();
  try { return JSON.parse(cleaned); } catch {}
  const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (match) { try { return JSON.parse(match[0]); } catch {} }
  return null;
}

/* -------------------------
   Deterministic fallback
   ------------------------- */

function mockInflect(cards:ClientCard[], options:OptionsShape) {
  const out:any[] = [];
  for (const c of cards) {
    const base = c.lemma ?? "";
    if (c.type === "noun") {
      const n = options?.nouns;
      if (n?.mode === "mix") {
        if (isUncount(base) && n?.skip_uncount) out.push({ id: c.id, forms: { singular: base } });
        else { out.push({ id: c.id, forms: { singular: base } }); out.push({ id: `${c.id}::plural`, forms: { plural: pluralize(base) } }); }
      } else if (n?.mode === "plural") {
        if (isUncount(base) && n?.skip_uncount) out.push({ id: c.id, forms: { singular: base } });
        else out.push({ id: c.id, forms: { plural: pluralize(base) } });
      } else out.push({ id: c.id, forms: { singular: base } });
    } else if (c.type === "verb") {
      const v = options?.verbs; const subj = v?.subject ?? options?.subject ?? "he";
      const baseForm = c.forms?.base ?? base;
      if (v?.mode === "third_mix") { out.push({ id: c.id, forms: { base: baseForm } }); out.push({ id: `${c.id}::3rd`, forms: { third: verbThird(baseForm) } }); }
      else if (v?.mode === "third") out.push({ id: c.id, forms: { third: verbThird(baseForm) } });
      else if (v?.mode === "past") out.push({ id: c.id, forms: { past: verbPast(baseForm), pastParticiple: verbPastParticiple(baseForm) } });
      else if (v?.mode === "continuous") out.push({ id: c.id, forms: { continuous: `${auxBePresent(subj)} ${verbPresentParticiple(baseForm)}` } });
      else if (v?.mode === "perfect") out.push({ id: c.id, forms: { perfect: `${auxHas(subj)} ${verbPastParticiple(baseForm)}` } });
      else out.push({ id: c.id, forms: { base: baseForm } });
    } else if (c.type === "adjective") {
      const a = options?.adjectives; const forms:any = {};
      if (a?.comparative) forms.comparative = adjectiveComparative(c.lemma); if (a?.superlative) forms.superlative = adjectiveSuperlative(c.lemma);
      out.push({ id: c.id, forms });
    } else out.push({ id: c.id, forms: { base: c.lemma ?? "" } });
  }
  return { mock: true, cards: out };
}

function adjectiveComparative(a?:string) { if (!a) return a ?? ""; return a.length <= 6 ? a + "er" : "more " + a; }
function adjectiveSuperlative(a?:string) { if (!a) return a ?? ""; return a.length <= 6 ? a + "est" : "most " + a; }

/* -------------------------
   Main handler (OpenAI + postprocess)
   ------------------------- */

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(()=>({}));
    const cards:ClientCard[] = Array.isArray(rawBody.cards) ? rawBody.cards : [];
    const receivedOptions = rawBody.options ?? rawBody;
    const options = normalizeOptions(receivedOptions);

    // quick server debug
    console.debug("INFLECT: cardsCount=", cards.length, "normalizedOptions=", options);

    const USE_MOCK = String(process.env.OPENAI_MOCK || "false").toLowerCase() === "true";
    if (USE_MOCK) {
      console.debug("INFLECT: USING MOCK");
      const payload = mockInflect(cards, options);
      const r = NextResponse.json(payload); r.headers.set("x-ai-mock","true"); r.headers.set("x-ai-debug","mock"); return r;
    }

    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_KEY) return NextResponse.json({ error: "OPENAI_API_KEY missing" }, { status: 500 });

    const MODEL = process.env.OPENAI_MODEL ?? "gpt-3.5-turbo";

    // Build messages (concise instructions & examples)
    const system = [
      "You are an English morphology assistant.",
      "Return STRICT JSON only in the format: {\"cards\":[{\"id\":\"<id>\",\"forms\":{...},\"image_hint\":{...}}]}",
      "Only include fields requested. For mix modes add extra entries with id '<orig-id>::variant'.",
      "Keep deterministic; no explanations.",
    ].join("\n");

    const examples = [
      { in: { cards:[{ id:"1", type:"verb", lemma:"eat", forms:{} }], options:{ verbs:{ mode:"third_mix" } } }, out:{ cards:[{ id:"1", forms:{ base:"eat" } },{ id:"1::3rd", forms:{ third:"eats" } }] } },
      { in: { cards:[{ id:"2", type:"verb", lemma:"eat", forms:{} }], options:{ verbs:{ mode:"perfect", subject:"they" } } }, out:{ cards:[{ id:"2", forms:{ perfect:"have eaten" } }] } },
      { in: { cards:[{ id:"3", type:"noun", lemma:"apple", forms:{} }], options:{ nouns:{ mode:"plural" }, images:{ transform:true } } }, out:{ cards:[{ id:"3", forms:{ plural:"apples" }, image_hint:{ variant:"plural", suggestion:"several apples pictured" } }] } },
    ];

    const messages:any[] = [{ role:"system", content: system }];
    messages.push({ role:"user", content: `Transform instructions: verbs=${options.verbs?.mode ?? "none"}, nouns=${options.nouns?.mode ?? "none"}.` });
    for (const ex of examples) { messages.push({ role:"user", content:`Example input: ${JSON.stringify(ex.in)}` }); messages.push({ role:"user", content:`Example output: ${JSON.stringify(ex.out)}` }); }
    messages.push({ role:"user", content: `Now transform: ${JSON.stringify({ cards, options })}. Output strict JSON only.` });

    const payload = { model: MODEL, messages, temperature:0.0, max_tokens:1200 };
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST", headers: { "Content-Type":"application/json", Authorization:`Bearer ${OPENAI_KEY}` }, body: JSON.stringify(payload)
    });

    const rawText = await resp.text();
    console.debug("INFLECT: rawText length=", rawText?.length ?? 0);

    if (!resp.ok) {
      console.error("OpenAI error:", resp.status, rawText.slice?.(0,1000));
      const fallback = mockInflect(cards, options);
      const r = NextResponse.json({ ...fallback, error:"OpenAI error", providerStatus: resp.status, providerPreview: rawText?.slice?.(0,1000) });
      r.headers.set("x-ai-mock","true"); r.headers.set("x-ai-debug","provider-error"); return r;
    }

    let assistantContent = rawText;
    try { const parsedFull = JSON.parse(rawText); assistantContent = parsedFull?.choices?.[0]?.message?.content ?? parsedFull?.choices?.[0]?.text ?? rawText; } catch {}
    console.debug("INFLECT: assistant preview:", assistantContent?.slice?.(0,800));

    const parsed = extractJson(assistantContent);
    if (!parsed || !Array.isArray(parsed.cards)) {
      console.error("INFLECT: parse failed, assistant preview:", assistantContent?.slice?.(0,1000));
      const fallback = mockInflect(cards, options);
      const r = NextResponse.json({ ...fallback, error:"parse_failed", aiPreview: assistantContent?.slice?.(0,1000) });
      r.headers.set("x-ai-mock","true"); r.headers.set("x-ai-debug","parse-failed"); return r;
    }

    // Post-process: ensure requested fields & subject-aware tenses
    const final:any[] = [];
    for (let i=0;i<parsed.cards.length;i++) {
      const c = parsed.cards[i];
      const input = cards.find(ic=>ic.id===c.id) ?? cards[i] ?? null;
      const type = input?.type ?? c?.type ?? "noun";
      const lemma = input?.lemma ?? "";
      const subj = (options?.verbs?.subject ?? options.subject) ?? "he";
      const outForms = { ...(c.forms ?? {}) };

      if (type === "noun") {
        const n = options?.nouns;
        if (n?.mode === "mix") {
          if (n?.skip_uncount && isUncount(lemma)) final.push({ id: c.id ?? input?.id ?? `idx-${i}`, forms:{ singular: lemma } });
          else { final.push({ id: c.id ?? input?.id ?? `idx-${i}`, forms:{ singular: lemma } }); final.push({ id:`${c.id ?? input?.id ?? `idx-${i}`}::plural`, forms:{ plural: outForms.plural ?? pluralize(lemma) }, image_hint: options?.images?.transform ? { variant:"plural", suggestion:`a few ${outForms.plural ?? pluralize(lemma)}` } : undefined }); }
          continue;
        }
        if (n?.mode === "plural") { final.push({ id: c.id ?? input?.id ?? `idx-${i}`, forms:{ plural: outForms.plural ?? pluralize(lemma) }, image_hint: options?.images?.transform ? { variant:"plural", suggestion:`a few ${outForms.plural ?? pluralize(lemma)}` } : undefined }); continue; }
        if (n?.mode === "singular") { final.push({ id: c.id ?? input?.id ?? `idx-${i}`, forms:{ singular: outForms.singular ?? lemma } }); continue; }
        final.push({ id: c.id ?? input?.id ?? `idx-${i}`, forms:{ singular: outForms.singular ?? lemma } }); continue;
      }

      if (type === "verb") {
        const v = options?.verbs; const base = outForms.base ?? input?.forms?.base ?? lemma;
        const wantNeg = Boolean(v?.negative ?? options?.negative);
        if (v?.mode === "third_mix") { final.push({ id: c.id ?? input?.id ?? `idx-${i}`, forms:{ base } }); const third = outForms.third ?? verbThird(base); const doNeg = auxDoPresentNegatives(subj); if (wantNeg) final.push({ id:`${c.id ?? input?.id ?? `idx-${i}`}::3rd`, forms:{ third, third_phrase:`${subj} ${third}`, third_negative:`${doNeg.contracted} ${base}`, third_negative_full:`${doNeg.full} ${base}` } }); else final.push({ id:`${c.id ?? input?.id ?? `idx-${i}`}::3rd`, forms:{ third, third_phrase:`${subj} ${third}` } }); continue; }
        if (v?.mode === "third") { const third = outForms.third ?? verbThird(base); const doNeg = auxDoPresentNegatives(subj); if (wantNeg) final.push({ id:c.id ?? input?.id ?? `idx-${i}`, forms:{ third, third_phrase:`${subj} ${third}`, third_negative:`${doNeg.contracted} ${base}`, third_negative_full:`${doNeg.full} ${base}` } }); else final.push({ id:c.id ?? input?.id ?? `idx-${i}`, forms:{ third, third_phrase:`${subj} ${third}` } }); continue; }
        if (v?.mode === "past") { const past = outForms.past ?? verbPast(base); if (wantNeg) final.push({ id:c.id ?? input?.id ?? `idx-${i}`, forms:{ past, pastParticiple: outForms.pastParticiple ?? verbPastParticiple(base), past_negative:`did not ${base}`, past_negative_contracted:`didn't ${base}` } }); else final.push({ id:c.id ?? input?.id ?? `idx-${i}`, forms:{ past, pastParticiple: outForms.pastParticiple ?? verbPastParticiple(base) } }); continue; }
        if (v?.mode === "continuous") { const be = auxBePresent(subj); const pres = outForms.presentParticiple ?? verbPresentParticiple(base); if (wantNeg) { const beNeg = auxBePresentNegative(subj); final.push({ id:c.id ?? input?.id ?? `idx-${i}`, forms:{ continuous:`${be} ${pres}`, continuous_negative:`${beNeg.contracted} ${pres}`, continuous_negative_full:`${beNeg.full} ${pres}` } }); } else final.push({ id:c.id ?? input?.id ?? `idx-${i}`, forms:{ continuous:`${be} ${pres}` } }); continue; }
        if (v?.mode === "perfect") { const h = auxHas(subj); const pastPart = outForms.pastParticiple ?? verbPastParticiple(base); if (wantNeg) { const hasNeg = auxHasNegative(subj); final.push({ id:c.id ?? input?.id ?? `idx-${i}`, forms:{ perfect:`${h} ${pastPart}`, perfect_negative:`${hasNeg.full} ${pastPart}`, perfect_negative_contracted:`${hasNeg.contracted} ${pastPart}` } }); } else final.push({ id:c.id ?? input?.id ?? `idx-${i}`, forms:{ perfect:`${h} ${pastPart}` } }); continue; }
        final.push({ id:c.id ?? input?.id ?? `idx-${i}`, forms:{ base } }); continue;
      }

      if (type === "adjective") {
        const a = options?.adjectives; const out:any = { ...(c.forms ?? {}) }; if (a?.comparative && !out.comparative) out.comparative = adjectiveComparative(lemma); if (a?.superlative && !out.superlative) out.superlative = adjectiveSuperlative(lemma); if (options?.images?.transform && (out.comparative || out.superlative)) final.push({ id:c.id ?? input?.id ?? `idx-${i}`, forms:out, image_hint:{ variant: out.comparative ? "comparative" : "superlative", suggestion:`${out.comparative ? "comparative" : "superlative"} ${lemma}` } }); else final.push({ id:c.id ?? input?.id ?? `idx-${i}`, forms:out }); continue;
      }

      final.push({ id:c.id ?? input?.id ?? `idx-${i}`, forms:c.forms ?? {} });
    }

    // append modal variants if requested
    if (Array.isArray(options?.modals?.include) && options?.modals?.include.length>0) {
      const mods = options.modals.include; const modalCards:any[] = [];
      for (const fc of final) {
        const ic = cards.find(c=>c.id===fc.id) ?? null; if (!ic || ic.type!=="verb") continue;
        const base = ic.lemma; const subj = options?.verbs?.subject ?? options?.subject ?? "he"; const wantNeg = Boolean(options?.modals?.negative);
        for (const m of mods) { const t = (MODAL_TEMPLATES[m]||MODAL_TEMPLATES["can"])(subj, base, wantNeg); const id = `${fc.id}::modal::${m}`; const formObj:any = {}; formObj[`modal_${m}`] = t.phrase; if (t.phrase_contracted) formObj[`modal_${m}_contracted`] = t.phrase_contracted; modalCards.push({ id, forms: formObj }); }
      }
      final.push(...modalCards);
    }

    // final debug log & return
    console.debug("INFLECT: returning finalCards preview:", JSON.stringify(final.slice(0,20), null, 2));
    const r = NextResponse.json({ source:"openai", cards: final }); r.headers.set("x-ai-mock","false"); r.headers.set("x-ai-debug","ok"); return r;

  } catch (err:any) {
    console.error("INFLECT unexpected:", err);
    try {
      const body = await req.json().catch(()=>({})); const cards:ClientCard[] = Array.isArray(body.cards)? body.cards:[]; const options:OptionsShape = (body.options as OptionsShape)??{}; const fallback = mockInflect(cards, options);
      const res = NextResponse.json({ ...fallback, error: String(err?.message ?? err) }); res.headers.set("x-ai-mock","true"); res.headers.set("x-ai-debug","exception"); return res;
    } catch { return NextResponse.json({ error: String(err?.message ?? err) }, { status:500 }); }
  }
}