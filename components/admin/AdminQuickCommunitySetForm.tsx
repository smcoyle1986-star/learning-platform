"use client";

import { Plus, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DraftCard = { front: string; back: string };

export function AdminQuickCommunitySetForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [featured, setFeatured] = useState(false);
  const [cards, setCards] = useState<DraftCard[]>([
    { front: "", back: "" },
    { front: "", back: "" },
  ]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function updateCard(index: number, field: keyof DraftCard, value: string) {
    setCards((current) => current.map((card, cardIndex) => cardIndex === index ? { ...card, [field]: value } : card));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/admin/community/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          featured,
          tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          cards,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(payload?.error ?? "The set could not be created."));
      router.push(`/admin/community/sets/${payload.id}`);
      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "The set could not be created.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-[#dfe4dc] bg-white p-5 shadow-[0_10px_28px_rgba(52,65,48,0.04)] sm:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="text-sm font-semibold text-[#3c473c]">Set title</span>
          <input required minLength={3} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Classroom warm-up: daily routines" className="mt-2 w-full rounded-xl border border-[#d9dfd5] bg-[#fbfcfa] px-3 py-2.5 text-sm outline-none focus:border-[#88a879] focus:ring-4 focus:ring-[#edf3e9]" />
        </label>
        <label>
          <span className="text-sm font-semibold text-[#3c473c]">Tags</span>
          <input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="warm-up, routines, A1" className="mt-2 w-full rounded-xl border border-[#d9dfd5] bg-[#fbfcfa] px-3 py-2.5 text-sm outline-none focus:border-[#88a879] focus:ring-4 focus:ring-[#edf3e9]" />
        </label>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-[#394439]">Flashcards</h2>
            <p className="mt-1 text-sm text-[#737d72]">The image field accepts a public image URL or the same storage reference used by saved lesson cards.</p>
          </div>
          <span className="text-xs font-semibold text-[#7d867b]">{cards.length} / 50</span>
        </div>
        <div className="mt-4 space-y-3">
          {cards.map((card, index) => (
            <div key={index} className="grid gap-2 rounded-xl border border-[#e4e8e1] bg-[#fbfcfa] p-3 md:grid-cols-[2rem_minmax(9rem,0.65fr)_minmax(12rem,1fr)_2.5rem] md:items-center">
              <span className="text-center text-xs font-bold text-[#7c857b]">{index + 1}</span>
              <input required maxLength={200} value={card.front} onChange={(event) => updateCard(index, "front", event.target.value)} placeholder="Word or prompt" aria-label={`Card ${index + 1} prompt`} className="rounded-lg border border-[#dce2d8] bg-white px-3 py-2 text-sm outline-none focus:border-[#88a879]" />
              <input maxLength={2000} value={card.back} onChange={(event) => updateCard(index, "back", event.target.value)} placeholder="Image URL or storage reference (optional)" aria-label={`Card ${index + 1} image`} className="rounded-lg border border-[#dce2d8] bg-white px-3 py-2 text-sm outline-none focus:border-[#88a879]" />
              <button type="button" onClick={() => setCards((current) => current.filter((_, cardIndex) => cardIndex !== index))} disabled={cards.length <= 2} aria-label={`Remove card ${index + 1}`} className="grid h-9 w-9 place-items-center rounded-lg text-[#8b655e] hover:bg-[#f8eae6] disabled:cursor-not-allowed disabled:opacity-30"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setCards((current) => [...current, { front: "", back: "" }])} disabled={cards.length >= 50} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#d4dfcf] px-4 py-2 text-sm font-semibold text-[#58704e] hover:bg-[#f5f8f3] disabled:opacity-50"><Plus className="h-4 w-4" />Add card</button>
      </div>

      <label className="mt-6 flex items-start gap-3 rounded-xl border border-[#dce5d7] bg-[#f7faf5] p-4">
        <input type="checkbox" checked={featured} onChange={(event) => setFeatured(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#5f7d50]" />
        <span><span className="block text-sm font-semibold text-[#40503c]">Feature immediately</span><span className="mt-1 block text-xs leading-5 text-[#748070]">The set is always published to Community. Featuring gives it additional prominence.</span></span>
      </label>

      {error && <p role="alert" className="mt-4 rounded-xl bg-[#fff2ef] px-4 py-3 text-sm text-[#974f45]">{error}</p>}
      <button type="submit" disabled={busy} className="btn btn-primary mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"><Send className="h-4 w-4" />{busy ? "Publishing…" : "Publish quick-use set"}</button>
    </form>
  );
}
