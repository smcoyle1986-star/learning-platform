"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminCommunityReportActions({ reportId, pending }: { reportId: string; pending: boolean }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(action: "resolve" | "dismiss") {
    if (note.trim().length < 3) { setError("Add a short resolution note."); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/community/reports/${reportId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, note }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(payload?.error ?? "The report could not be updated."));
      router.refresh();
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "The report could not be updated."); }
    finally { setBusy(false); }
  }
  if (!pending) return null;
  return <div className="mt-3"><input value={note} onChange={(event) => setNote(event.target.value.slice(0, 500))} placeholder="Resolution note" aria-label="Resolution note" className="w-full rounded-lg border border-[#dce2d8] px-3 py-2 text-xs outline-none focus:border-[#88a879]" /><div className="mt-2 flex gap-2"><button onClick={() => run("resolve")} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-[#5f7d50] px-2.5 py-1.5 text-xs font-semibold text-white"><CheckCircle2 className="h-3.5 w-3.5" />Resolve</button><button onClick={() => run("dismiss")} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-[#d8ddd4] px-2.5 py-1.5 text-xs font-semibold text-[#687266]"><XCircle className="h-3.5 w-3.5" />Dismiss</button></div>{error && <p role="alert" className="mt-2 text-xs text-[#a04f45]">{error}</p>}</div>;
}
