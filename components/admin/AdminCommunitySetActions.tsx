"use client";

import { LockKeyhole, RotateCcw, Star, Trash2, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SetAction = "feature" | "unfeature" | "hide" | "unhide" | "delete" | "restore";

export function AdminCommunitySetActions({ setId, isPublic, isFeatured, hidden, deleted, canDelete, mfaVerified }: { setId: string; isPublic: boolean; isFeatured: boolean; hidden: boolean; deleted: boolean; canDelete: boolean; mfaVerified: boolean }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<SetAction | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function run(action: SetAction) {
    if (["hide", "delete", "restore"].includes(action) && reason.trim().length < 5) {
      setError("Add a reason of at least 5 characters.");
      return;
    }
    if (action === "delete" && !window.confirm("Soft-delete this Community set?")) return;
    setBusy(action); setError(""); setMessage("");
    try {
      const response = await fetch(`/api/admin/community/sets/${setId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(payload?.error ?? "The action failed."));
      setMessage(String(payload?.message ?? "Set updated."));
      router.refresh();
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "The action failed."); }
    finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#dfe4dc] bg-white p-5">
        <h2 className="font-semibold text-[#394439]">Moderation</h2>
        <p className="mt-1 text-sm leading-6 text-[#737d72]">All changes are recorded in the administrator audit log.</p>
        <label className="mt-4 block"><span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#798277]">Moderation reason</span><textarea value={reason} onChange={(event) => setReason(event.target.value.slice(0, 500))} rows={3} placeholder="Required for hide, restore, and delete" className="mt-2 w-full rounded-xl border border-[#d9dfd5] bg-[#fbfcfa] px-3 py-2 text-sm outline-none focus:border-[#88a879]" /></label>
        <div className="mt-4 flex flex-wrap gap-2">
          {!deleted && !hidden && (isFeatured ? <button onClick={() => run("unfeature")} disabled={Boolean(busy)} className="rounded-xl border border-[#dfd3b8] px-3 py-2 text-sm font-semibold text-[#7c693d]">Unfeature</button> : <button onClick={() => run("feature")} disabled={Boolean(busy) || !isPublic} className="inline-flex items-center gap-2 rounded-xl border border-[#dfd3b8] px-3 py-2 text-sm font-semibold text-[#7c693d] disabled:opacity-40"><Star className="h-4 w-4" />Feature</button>)}
          {!deleted && (hidden ? <button onClick={() => run("unhide")} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl border border-[#d4dfcf] px-3 py-2 text-sm font-semibold text-[#58704e]"><RotateCcw className="h-4 w-4" />Unhide</button> : <button onClick={() => run("hide")} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl border border-[#e2d2c7] px-3 py-2 text-sm font-semibold text-[#8a604e]"><EyeOff className="h-4 w-4" />Hide</button>)}
          {deleted && <button onClick={() => run("restore")} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl border border-[#d4dfcf] px-3 py-2 text-sm font-semibold text-[#58704e]"><RotateCcw className="h-4 w-4" />Restore privately</button>}
        </div>
      </section>
      {!deleted && <section className="rounded-2xl border border-[#ebd1ca] bg-[#fffafa] p-5"><h3 className="flex items-center gap-2 font-semibold text-[#5d3e38]"><Trash2 className="h-4 w-4" />Delete set</h3>{!canDelete ? <p className="mt-2 text-sm text-[#80645d]">Only the owner can delete sets.</p> : !mfaVerified ? <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[#80645d]"><LockKeyhole className="h-4 w-4" />MFA verification required. <Link href="/admin/security" className="font-semibold underline">Verify MFA</Link></p> : <button onClick={() => run("delete")} disabled={Boolean(busy)} className="mt-4 rounded-xl bg-[#9d5147] px-4 py-2 text-sm font-semibold text-white">Delete set</button>}</section>}
      {error && <p role="alert" className="rounded-xl bg-[#fff2ef] px-4 py-3 text-sm text-[#974f45]">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-[#edf6e8] px-4 py-3 text-sm text-[#537044]">{message}</p>}
    </div>
  );
}
