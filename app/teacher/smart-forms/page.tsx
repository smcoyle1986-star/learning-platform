"use client";

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { saveWorksheetClient } from "@/lib/ai/saveWorksheetClient";
import { saveAiSetClient } from "@/lib/ai/saveAiClient";

/* Small reusable Save button (calls client helper) */
function SaveAiSetButton({
  defaultPrompt = "Generate 8 simple animal words (word only)",
  defaultTitle = "AI Set",
}: {
  defaultPrompt?: string;
  defaultTitle?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await saveAiSetClient({
        title: defaultTitle,
        prompt: defaultPrompt,
      });
      alert("Saved AI set: " + result.id);
      // Optionally: redirect to flashcards or open dashboard
      // window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("Save failed:", err);
      alert("Save failed: " + (err?.message || "unknown"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-2 rounded bg-[var(--color-primary)] text-white"
    >
      {loading ? "Saving…" : "Save AI Set"}
    </button>
  );
}

/* Types */
type Mode = "cards" | "worksheets";
type WordType = "noun" | "verb" | "adjective" | "phonics" | "preposition";
type NounOption = "singular" | "plural" | "mix";
type VerbOption = "third" | "third-mixed" | "past" | "continuous" | "perfect";
type AdjOption = "base" | "comparative" | "superlative" | "mixed";
type ModalType = "can" | "could" | "will" | "shall" | "should" | "may" | "might";

type FormData =
  | { kind: "noun"; singular?: string; plural?: string; display_singular?: string }
  | { kind: "verb"; base?: string; third?: string; past?: string; pastParticiple?: string; presentParticiple?: string; mixed?: string; negative?: string }
  | { kind: "adjective"; base?: string; comparative?: string; superlative?: string; mixed?: string }
  | { kind: "phonics" | "preposition"; base?: string };

type LocalCard = {
  id: string;
  type: WordType;
  lemma: string;
  forms: FormData;
  image_url?: string | null;
};

/* Compatibility keys used across app */
const LESSON_TRAY_KEY_CANDIDATES = [
  "classbloom-lesson-tray",
  "classbloom_lesson_tray",
  "lesson-tray",
  "lesson_tray",
];
const SAVED_SETS_KEY = "classbloom-saved-sets";

/* Small text helpers / mock AI */
function suggestPlural(noun: string) {
  if (!noun) return noun;
  if (/(s|x|z|ch|sh)$/i.test(noun)) return noun + "es";
  if (/[aeiou]y$/i.test(noun)) return noun + "s";
  if (/[^aeiou]y$/i.test(noun)) return noun.slice(0, -1) + "ies";
  if (/(f|fe)$/i.test(noun)) return noun.replace(/(fe|f)$/, "ves");
  return noun + "s";
}
function suggestPast(v: string) {
  if (v.endsWith("e")) return v + "d";
  if (/[^aeiou]y$/i.test(v)) return v.slice(0, -1) + "ied";
  return v + "ed";
}
function suggestPresentParticiple(v: string) {
  if (v.endsWith("e") && !v.endsWith("ee")) return v.slice(0, -1) + "ing";
  return v + "ing";
}
function suggestVerb3rd(v: string) {
  if (/(s|x|z|ch|sh)$/i.test(v)) return v + "es";
  if (/[^aeiou]y$/i.test(v)) return v.slice(0, -1) + "ies";
  if (v.endsWith("e")) return v + "s";
  return v + "s";
}
function articleFor(word: string) {
  if (!word) return "a";
  const w = word.trim().toLowerCase();
  return /^[aeiou]/.test(w) ? "an" : "a";
}

/* Deterministic mock transform (only returns changed forms) */
function mockTransform(cards: LocalCard[], options: any) {
  const out = cards.map((c) => {
    const forms: any = {};
    if (c.type === "noun") {
      if (options.nounOption === "plural" || options.nounOption === "mix") {
        forms.plural = (c.forms as any).plural ?? suggestPlural(c.lemma);
      }
      if (options.nounOption === "singular" || options.nounOption === "mix") {
        const raw = (c.forms as any).singular ?? c.lemma;
        if (options.nounOption === "singular") forms.display_singular = `${articleFor(raw)} ${raw}`;
        else forms.singular = raw;
      }
    } else if (c.type === "verb") {
      const base = (c.forms as any).base ?? c.lemma;
      if (options.verbOption === "past" || options.verbOption === "perfect") {
        const past = (c.forms as any).past ?? suggestPast(base);
        forms.past = past;
        forms.pastParticiple = (c.forms as any).pastParticiple ?? past;
      }
      if (options.verbOption === "continuous") {
        forms.presentParticiple = (c.forms as any).presentParticiple ?? suggestPresentParticiple(base);
      }
      if (options.verbOption === "third" || options.verbOption === "third-mixed") {
        forms.third = (c.forms as any).third ?? suggestVerb3rd(base);
      }
      if (options.negative) forms.negative = `did not ${base}`;
      if (options.verbOption === "third-mixed") forms.mixed = `${base} / ${suggestVerb3rd(base)}`;
    } else if (c.type === "adjective") {
      if (options.adjOption === "comparative") forms.comparative = (c.forms as any).comparative ?? `${c.lemma}er`;
      if (options.adjOption === "superlative") forms.superlative = (c.forms as any).superlative ?? `${c.lemma}est`;
      if (options.adjOption === "mixed") forms.mixed = `${c.lemma} / ${c.lemma}er`;
    } else {
      forms.base = (c.forms as any).base ?? c.lemma;
    }
    return { id: c.id, forms };
  });
  return { cards: out, mock: true };
}

/* Robust POST helper */
async function postJson(path: string, payload: any) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const e: any = new Error("Non-JSON response");
    e.body = text;
    e.status = res.status;
    throw e;
  }
  try {
    return { res, data: JSON.parse(text) };
  } catch (err) {
    const e: any = new Error("Malformed JSON");
    e.body = text;
    e.status = res.status;
    throw e;
  }
}

/* Normalize raw object to LocalCard */
function normalizeRawToLocal(raw: any, idx: number): LocalCard {
  if (raw && raw.id && raw.lemma && raw.forms) {
    return {
      id: String(raw.id),
      lemma: raw.lemma,
      type: (raw.type as WordType) ?? ("noun" as WordType),
      forms: raw.forms,
      image_url: raw.image_url ?? raw.image ?? raw.img ?? null,
    };
  }

  const lemma = raw?.word ?? raw?.front ?? raw?.lemma ?? raw?.text ?? `card-${idx}`;
  const image_url = raw?.image ?? raw?.back ?? raw?.img ?? raw?.image_url ?? null;
  const type = (raw?.type as WordType) ?? (raw?.pos as WordType) ?? ("noun" as WordType);

  let forms: FormData;
  if (type === "verb") forms = { kind: "verb", base: lemma };
  else if (type === "adjective") forms = { kind: "adjective", base: lemma };
  else if (type === "phonics" || type === "preposition") forms = { kind: type, base: lemma };
  else forms = { kind: "noun", singular: lemma, plural: "" };

  const id = raw?.id ?? raw?.uid ?? `${Date.now()}-${idx}`;

  return { id: String(id), lemma: String(lemma), type, forms, image_url };
}

/* ------------------------------- Component ------------------------------- */

export default function SmartFormsPageClient() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("cards");

  const [activeTab, setActiveTab] = useState<"noun" | "verb" | "adjective" | "modals">("noun");
  const [nounOption, setNounOption] = useState<NounOption>("mix");
  const [verbOption, setVerbOption] = useState<VerbOption>("third");
  const [adjOption, setAdjOption] = useState<AdjOption>("mixed");
  const [modalOptions, setModalOptions] = useState<Record<ModalType, boolean>>({
    can: false,
    could: false,
    will: false,
    shall: false,
    should: false,
    may: false,
    might: false,
  });
  const [includeNegatives, setIncludeNegatives] = useState(false);

  const [cefr, setCefr] = useState<"A1" | "A2" | "B1" | "B2">("A1");
  const [worksheetTypes, setWorksheetTypes] = useState<Record<string, boolean>>({
    q_and_a: true,
    make_sentence: false,
    translate: false,
    fill_blanks: false,
    unscramble: false,
    tracing: false,
    answer_question: false,
  });

  const [trayCards, setTrayCards] = useState<LocalCard[]>([]);
  const [previewCards, setPreviewCards] = useState<LocalCard[]>([]);
  const [lastAiSnapshot, setLastAiSnapshot] = useState<LocalCard[] | null>(null);

  const [applyingAI, setApplyingAI] = useState(false);
  const [loadingWorksheet, setLoadingWorksheet] = useState(false);
  const [worksheetHtml, setWorksheetHtml] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "info" | "success" | "error"; text: string } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      let loadedRaw: any[] | null = null;
      for (const k of LESSON_TRAY_KEY_CANDIDATES) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            loadedRaw = parsed;
            break;
          }
        } catch {}
      }
      if (loadedRaw) {
        const normalized = loadedRaw.map((r, i) => normalizeRawToLocal(r, i));
        setTrayCards(normalized);
        setPreviewCards(normalized.map((c) => ({ ...c })));
      }
    } catch (e) {
      console.warn("Failed to load lesson tray", e);
    }

    function onStorage(e: StorageEvent) {
      if (!e.key) return;
      const keysToWatch = [...LESSON_TRAY_KEY_CANDIDATES, "lesson-tray"];
      if (!keysToWatch.includes(e.key)) return;
      if (!e.newValue) {
        setTrayCards([]);
        setPreviewCards([]);
        return;
      }
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) {
          const normalized = parsed.map((r: any, i: number) => normalizeRawToLocal(r, i));
          setTrayCards(normalized);
          setPreviewCards(normalized.map((c) => ({ ...c })));
        }
      } catch {}
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    try {
      const s = JSON.stringify(trayCards);
      localStorage.setItem(LESSON_TRAY_KEY_CANDIDATES[0], s);
      localStorage.setItem("lesson-tray", s);
    } catch {}
  }, [trayCards]);

  function showToast(text: string, kind: "info" | "success" | "error" = "info", duration = 3500) {
    setToast({ kind, text });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = (window.setTimeout(() => setToast(null), duration) as unknown) as number;
  }

  function onDragStart(e: React.DragEvent, idx: number) {
    e.dataTransfer.setData("text/plain", String(idx));
    e.dataTransfer.effectAllowed = "move";
  }
  function onDropThumbnail(e: React.DragEvent, idx: number) {
    e.preventDefault();
    const src = Number(e.dataTransfer.getData("text/plain"));
    if (Number.isNaN(src)) return;
    setTrayCards((prev) => {
      const arr = [...prev];
      const [moved] = arr.splice(src, 1);
      arr.splice(idx, 0, moved);
      return arr;
    });
    showToast("Thumbnails reordered", "info");
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
  }
  function removeThumbnail(idx: number) {
    const removed = trayCards[idx];
    setTrayCards((prev) => prev.filter((_, i) => i !== idx));
    showToast(`Removed: ${removed?.lemma}`, "info");
  }

  function mergeAiResults(aiCards: any[]) {
    const map = new Map<string, any>();
    aiCards.forEach((rc) => {
      if (rc?.id && rc.forms) map.set(String(rc.id), rc.forms);
    });
    setPreviewCards((prev) =>
      prev.map((c) => {
        const newForms = map.get(String(c.id));
        if (!newForms) return c;
        return { ...c, forms: { ...(c.forms as any), ...newForms } as FormData };
      })
    );
  }

  /* Defensive preview text calculation (fixes the runtime error) */
  function getPreviewFrontText(card: LocalCard) {
    const f = (card.forms ?? {}) as any;
    // guard: if no forms at all
    if (!f || typeof f !== "object") return card.lemma ?? "";

    if (card.type === "noun") {
      if (nounOption === "plural" && f.plural) return f.plural;
      if (nounOption === "singular" && f.display_singular) return f.display_singular;
      if (f.display_singular) return f.display_singular;
      if (f.plural && nounOption === "mix") return f.plural;
      return f.singular ?? card.lemma;
    }

    if (card.type === "verb") {
      if (verbOption === "past" && f.past) return f.past;
      if (verbOption === "continuous" && f.presentParticiple) return f.presentParticiple;
      if (verbOption === "third" && f.third) return f.third;
      if (verbOption === "third-mixed") {
        if (f.mixed) return f.mixed;
        const base = f.base ?? card.lemma;
        return `${base} / ${suggestVerb3rd(base)}`;
      }
      if (verbOption === "perfect" && f.pastParticiple) return f.pastParticiple;
      if (f.past) return f.past;
      if (f.third) return f.third;
      return f.base ?? card.lemma;
    }

    if (card.type === "adjective") {
      if (adjOption === "comparative" && f.comparative) return f.comparative;
      if (adjOption === "superlative" && f.superlative) return f.superlative;
      if (adjOption === "mixed" && f.mixed) return f.mixed ?? `${f.base ?? card.lemma} / ${(f.comparative ?? card.lemma + "er")}`;
      return f.base ?? card.lemma;
    }

    return (f.base ?? card.lemma) as string;
  }

  async function applyAiToCards() {
    if (trayCards.length === 0) {
      showToast("Add cards to the lesson tray first", "error");
      return;
    }
    setLastAiSnapshot(JSON.parse(JSON.stringify(previewCards)));
    setApplyingAI(true);
    setMessage(null);

    const options = { nounOption, verbOption, adjOption, modalOptions, negative: includeNegatives, mode: "cards" };
    const payload = { cards: trayCards.map((c) => ({ id: c.id, type: c.type, lemma: c.lemma, forms: c.forms })), options };

    try {
      const { res, data } = await postJson("/api/ai/inflect", payload);
      if (data?.error) {
        setMessage("AI provider error — using local mock.");
        showToast("AI provider error — mock used", "info");
        const mocked = mockTransform(trayCards, options);
        mergeAiResults(mocked.cards);
      } else {
        const headerMock = res.headers.get("x-ai-mock");
        const isMock = data?.mock === true || headerMock === "true";
        mergeAiResults(data.cards || []);
        showToast(isMock ? "AI (mock) applied" : "AI (real) applied", isMock ? "info" : "success");
      }
    } catch (err) {
      console.error("applyAiToCards error", err);
      setMessage("AI unavailable — using local mock.");
      showToast("AI unavailable — mock used", "info");
      const mocked = mockTransform(trayCards, options);
      mergeAiResults(mocked.cards);
    } finally {
      setApplyingAI(false);
    }
  }

  function undoAi() {
    if (!lastAiSnapshot) {
      showToast("Nothing to undo", "info");
      return;
    }
    setPreviewCards(lastAiSnapshot);
    setLastAiSnapshot(null);
    showToast("Reverted last AI transform", "info");
  }

  function completeApplyToTray() {
    if (previewCards.length === 0) {
      showToast("Nothing to complete", "error");
      return;
    }
    const newTray = previewCards.map((p) => {
      const orig = trayCards.find((t) => t.id === p.id);
      if (orig) return { ...orig, forms: p.forms };
      return { ...p };
    });
    setTrayCards(newTray);
    try {
      const s = JSON.stringify(newTray);
      localStorage.setItem(LESSON_TRAY_KEY_CANDIDATES[0], s);
      localStorage.setItem("lesson-tray", s);
    } catch {}
    showToast("Lesson tray replaced with AI-modified cards", "success");
  }

  async function generateWorksheet() {
    if (trayCards.length === 0) {
      showToast("Add cards to the lesson tray first", "error");
      return;
    }
    setLoadingWorksheet(true);
    setWorksheetHtml(null);
    setMessage(null);

    const options = { difficulty: cefr, worksheetTypes, nounOption, verbOption, adjOption, modalOptions, negative: includeNegatives, mode: "worksheet" };
    const payload = { cards: trayCards.map((c) => ({ id: c.id, type: c.type, lemma: c.lemma, forms: c.forms })), options };

    try {
      const { res, data } = await postJson("/api/ai/inflect", payload);
      if (data?.worksheetHtml) {
        setWorksheetHtml(data.worksheetHtml);
        showToast("Worksheet ready", "success");
      } else {
        const html = buildLocalWorksheetHtml(trayCards, options);
        setWorksheetHtml(html);
        showToast("Worksheet (local) ready", "info");
      }
    } catch (err) {
      console.error("generateWorksheet error", err);
      const html = buildLocalWorksheetHtml(trayCards, options);
      setWorksheetHtml(html);
      showToast("AI unavailable — local worksheet generated", "info");
    } finally {
      setLoadingWorksheet(false);
    }
  }

  function buildLocalWorksheetHtml(cards: LocalCard[], options: any) {
    const title = `Worksheet (${options.difficulty || "A1"})`;
    const rows = cards.map((c, i) => {
      let text = c.lemma;
      if (c.type === "noun") {
        if (options.nounOption === "plural") text = (c.forms as any).plural ?? suggestPlural(c.lemma);
        if (options.nounOption === "singular") text = `${articleFor((c.forms as any).singular ?? c.lemma)} ${(c.forms as any).singular ?? c.lemma}`;
      } else if (c.type === "verb") {
        if (options.verbOption === "past") text = (c.forms as any).past ?? suggestPast(c.lemma);
        if (options.verbOption === "continuous") text = (c.forms as any).presentParticiple ?? suggestPresentParticiple(c.lemma);
        if (options.verbOption === "third") text = (c.forms as any).third ?? suggestVerb3rd(c.lemma);
      } else if (c.type === "adjective") {
        if (options.adjOption === "comparative") text = (c.forms as any).comparative ?? `${c.lemma}er`;
        if (options.adjOption === "superlative") text = (c.forms as any).superlative ?? `${c.lemma}est`;
      }
      return `<li>${i + 1}. ${escapeHtml(String(text))}</li>`;
    });
    return `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Inter, system-ui, sans-serif;padding:20px;color:#0f172a}h1{color:#2f3a2f}</style></head><body><h1>${escapeHtml(title)}</h1><p>Difficulty: ${escapeHtml(options.difficulty || "A1")}</p><ol>${rows.join("\n")}</ol><footer style="margin-top:24px;color:#64748b;font-size:12px">Made with Bloom AI</footer></body></html>`;
  }

  function escapeHtml(s: string) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  /* ------------------ Render ------------------ */

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header: styled to match flashcards header buttons */}
      <header className="sticky top-0 z-50 bg-[var(--color-bg-main)]/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Brand */}
          <a role="button" onClick={() => (window.location.href = "/")} className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80 cursor-pointer">
            ClassBloom
          </a>

          {/* Center title (keeps exact positioning as Flashcards) */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <nav className="flex items-center text-4xl font-bold text-black">Bloom AI</nav>
          </div>

          {/* Right: buttons (copied style from flashcards + added Flashcards & Printables) */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => (window.location.href = "/games")}
              className="btn btn-secondary"
            >
              Games
            </button>

            <button
              onClick={() => (window.location.href = "/dashboard")}
              className="btn btn-secondary"
            >
              Dashboard
            </button>

            <button
              onClick={() => (window.location.href = "/flashcards/classroom")}
              className="btn btn-secondary"
            >
              Classroom
            </button>

            <button
              onClick={() => (window.location.href = "/flashcards")}
              className="btn btn-secondary"
            >
              Flashcards
            </button>

            <button
              onClick={() => (window.location.href = "/printables")}
              className="btn btn-secondary"
            >
              Printables
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <p className="mb-4 text-slate-700">Bloom AI lets teachers transform flashcards or generate worksheets using smart grammar and difficulty controls.</p>

        <div className="flex items-center justify-center mb-6">
          <div className="inline-flex rounded-full bg-gray-200 p-1">
            <button
              onClick={() => setMode("cards")}
              className={`btn px-6 py-2 ${mode === "cards" ? "btn-primary" : "btn-secondary"}`}
            >
              Smart Cards
            </button>
            <button
              onClick={() => setMode("worksheets")}
              className={`btn px-6 py-2 ${mode === "worksheets" ? "btn-primary" : "btn-secondary"}`}
            >
              Worksheets
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-4 bg-white border rounded-lg p-4 shadow-sm">
            <div className="mb-3 flex gap-2">
              {(["noun", "verb", "adjective", "modals"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  className={`btn px-3 py-2 rounded ${
                    activeTab === t ? "btn-primary" : "btn-secondary"
                  }`}
                >
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {activeTab === "noun" && (
                <div>
                  <div className="text-sm font-medium mb-2">Noun options</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNounOption("singular")}
                      className={`btn px-3 py-2 rounded ${
                        nounOption === "singular" ? "btn-primary" : "btn-secondary"
                      }`}
                    >
                      Singular
                    </button>
                    <button
                      onClick={() => setNounOption("plural")}
                      className={`btn px-3 py-2 rounded ${
                        nounOption === "plural" ? "btn-primary" : "btn-secondary"
                      }`}
                    >
                      Plural
                    </button>
                    <button
                      onClick={() => setNounOption("mix")}
                      className={`btn px-3 py-2 rounded ${
                        nounOption === "mix" ? "btn-primary" : "btn-secondary"
                      }`}
                    >
                      Mix
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "verb" && (
                <div>
                  <div className="text-sm font-medium mb-2">Verb options</div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(["third", "third-mixed", "past", "continuous", "perfect"] as VerbOption[]).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setVerbOption(opt)}
                        className={`btn px-3 py-2 rounded ${
                          verbOption === opt ? "btn-primary" : "btn-secondary"
                        }`}
                      >
                        {opt.replace("-", " ")}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={includeNegatives} onChange={(e) => setIncludeNegatives(e.target.checked)} /> Include negative forms</label>
                </div>
              )}

              {activeTab === "adjective" && (
                <div>
                  <div className="text-sm font-medium mb-2">Adjective options</div>
                  <div className="flex gap-2">
                    {(["base", "comparative", "superlative", "mixed"] as AdjOption[]).map((o) => (
                      <button
                        key={o}
                        onClick={() => setAdjOption(o)}
                        className={`btn px-3 py-2 rounded ${
                          adjOption === o ? "btn-primary" : "btn-secondary"
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "modals" && (
                <div>
                  <div className="text-sm font-medium mb-2">Modal verbs</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(modalOptions) as ModalType[]).map((m) => (
                      <label key={m} className="flex items-center gap-2"><input type="checkbox" checked={modalOptions[m]} onChange={(e) => setModalOptions((p) => ({ ...p, [m]: e.target.checked }))} /> <span className="capitalize">{m}</span></label>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 mt-2 text-sm"><input type="checkbox" checked={includeNegatives} onChange={(e) => setIncludeNegatives(e.target.checked)} /> Include negatives</label>
                </div>
              )}
            </div>

            {mode === "worksheets" && (
              <div className="mt-6 border-t pt-4">
                <div className="text-sm font-medium mb-2">Difficulty (CEFR)</div>
                <div className="flex gap-2 flex-wrap mb-3">
                  {(["A1", "A2", "B1", "B2"] as const).map((d) => (
                    <button
                      key={d}
                      onClick={() => setCefr(d)}
                      className={`btn px-3 py-1 rounded ${
                        cefr === d ? "btn-primary" : "btn-secondary"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                <div className="text-sm font-medium mb-2">Worksheet types</div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(worksheetTypes).map(([k, v]) => (
                    <label key={k} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v} onChange={() => setWorksheetTypes((p) => ({ ...p, [k]: !p[k] }))} /> <span>{k.replace(/_/g, " ")}</span></label>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 border-t pt-4">
              <div className="text-sm font-semibold mb-2">Lesson tray thumbnails</div>
              <div className="grid grid-cols-4 gap-2">
                {trayCards.length === 0 && <div className="col-span-4 text-xs text-gray-500">No cards in the lesson tray.</div>}
                {trayCards.map((c, idx) => (
                  <div key={c.id} draggable onDragStart={(e) => onDragStart(e, idx)} onDragOver={onDragOver} onDrop={(e) => onDropThumbnail(e, idx)} className="relative border rounded p-2 flex items-center justify-center bg-white">
                    <div className="text-xs text-center">{c.lemma}</div>
                    <button
                      title="Remove"
                      onClick={() => removeThumbnail(idx)}
                      className="btn btn-secondary absolute -top-2 -right-2 w-6 h-6 p-0 text-xs flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          <section className="col-span-8 bg-white border rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-semibold">{mode === "cards" ? "Preview: Smart Cards" : "Preview: Worksheet"}</div>

              <div className="flex gap-3 items-center">
                {mode === "cards" && (
                  <>
                    <button
                      onClick={applyAiToCards}
                      disabled={applyingAI}
                      className="btn btn-primary px-3 py-2 disabled:opacity-60"
                    >
                      {applyingAI ? "Applying…" : "Apply AI"}
                    </button>
                    <button onClick={undoAi} className="btn btn-secondary px-3 py-2">
                      Undo AI
                    </button>
                    <button onClick={completeApplyToTray} className="btn btn-primary px-3 py-2">
                      Complete
                    </button>

                    <button
  onClick={async () => {
    const n = prompt("Set name", `Bloom AI Set ${new Date().toLocaleDateString()}`);
    if (!n) return;
    try {
      const cardsToSave = previewCards.length > 0 ? previewCards : trayCards;
      if (!cardsToSave || cardsToSave.length === 0) {
        alert("No cards to save — add cards to the tray or apply AI first.");
        return;
      }
      await saveAiSetClient({ title: n, prompt: "", cards: cardsToSave });
      alert("AI set saved");
    } catch (e: any) {
      alert("Save failed: " + (e?.message || e));
    }
  }}
  className="btn btn-primary px-3 py-2"
>
  Save set
</button>
                  </>
                )}

                {mode === "worksheets" && (
                  <>
                    <button
                      onClick={generateWorksheet}
                      disabled={loadingWorksheet}
                      className="btn btn-primary px-3 py-2 disabled:opacity-60"
                    >
                      {loadingWorksheet ? "Generating…" : "Send to AI"}
                    </button>

                    /* Replace the existing "Save worksheet" button in your SmartForms page with this block.
   It collects the current CEFR, selected worksheet types, and filters and sends them to
   the saveWorksheetClient helper above. Paste this over the current Save worksheet button. */

<button
  onClick={async () => {
    const n = prompt("Worksheet name", `Worksheet ${new Date().toLocaleDateString()}`);
    if (!n) return;
    try {
      const types = Object.keys(worksheetTypes).filter((k) => worksheetTypes[k]);
      const filters = {
        nounOption,
        verbOption,
        adjOption,
        modalOptions,
        negative: includeNegatives,
        // include any other filters/state you want preserved
      };
      // Optionally include generated HTML if available
      const content = worksheetHtml ?? null;
      // Optionally include the cards used
      const cards = trayCards;

      await saveWorksheetClient({
        title: n,
        cefr_level: cefr,
        worksheet_types: types,
        filters,
        content,
        cards,
      });
      alert("Worksheet saved");
    } catch (e: any) {
      alert("Save failed: " + (e?.message || e));
    }
  }}
  className="btn btn-primary px-3 py-2"
>
  Save worksheet
</button>

                    <button
                      onClick={() => {
                        if (!worksheetHtml) {
                          showToast("No worksheet to print", "error");
                          return;
                        }
                        const blob = new Blob([worksheetHtml], { type: "text/html" });
                        const url = URL.createObjectURL(blob);
                        window.open(url, "_blank");
                      }}
                      className="btn btn-primary px-3 py-2"
                    >
                      Send to Printables
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="h-[60vh] overflow-auto rounded p-4 bg-gray-50 border">
              {mode === "cards" && (
                <div className="grid grid-cols-2 gap-4">
                  {previewCards.length === 0 && <div className="text-sm text-gray-500">No preview cards. Apply AI to transform the cards from your lesson tray.</div>}
                  {previewCards.map((c) => (
                    <div key={c.id} className="p-3 border rounded bg-white shadow-sm flex gap-3 items-center">
                      <div className="w-24 h-20 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                        {c.image_url ? <img src={c.image_url} alt={c.lemma} className="object-cover w-full h-full" /> : <div className="text-xs text-gray-400">No image</div>}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-lg">{getPreviewFrontText(c)}</div>
                        <div className="text-xs text-gray-500 mt-1">Original: {c.lemma} · {c.type}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {mode === "worksheets" && (
                <div>
                  {!worksheetHtml && <div className="text-sm text-gray-500">No worksheet generated yet — choose filters and click "Send to AI".</div>}
                  {worksheetHtml && <iframe title="worksheet preview" srcDoc={worksheetHtml} className="w-full h-[60vh] border rounded" />}
                </div>
              )}
            </div>

            {message && <div className="mt-3 text-sm text-red-600">{message}</div>}
          </section>
        </div>
      </main>

      {toast && (
        <div className="fixed right-4 bottom-6 z-60">
          <div className={`px-4 py-2 rounded shadow-lg text-sm ${toast.kind === "error" ? "bg-red-600 text-white" : toast.kind === "success" ? "bg-green-600 text-white" : "bg-blue-600 text-white"}`}>
            {toast.text}
          </div>
        </div>
      )}
    </div>
  );
}
