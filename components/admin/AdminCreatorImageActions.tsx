"use client";

import { EyeOff, LockKeyhole, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ImageAction = "hide" | "restore" | "delete";

export function AdminCreatorImageActions({ imageId, available, deleted, canDelete, mfaVerified }: { imageId: string; available: boolean; deleted: boolean; canDelete: boolean; mfaVerified: boolean }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(action: ImageAction) {
    if (reason.trim().length < 5) { setError("Add a reason of at least 5 characters."); return; }
    if (action === "delete" && !window.confirm("Soft-delete this Creator image?")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/admin/community/images/${imageId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }) });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(String(payload?.error ?? "The image could not be updated."));
      router.refresh();
    } catch (nextError) { setError(nextError instanceof Error ? nextError.message : "The image could not be updated."); }
    finally { setBusy(false); }
  }
  return <div className="mt-4"><input value={reason} onChange={(event) => setReason(event.target.value.slice(0, 500))} placeholder="Moderation reason" className="w-full rounded-lg border border-[#dce2d8] px-3 py-2 text-xs outline-none focus:border-[#88a879]" /><div className="mt-2 flex flex-wrap gap-2">{available ? <button onClick={() => run("hide")} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-[#e2d2c7] px-2.5 py-1.5 text-xs font-semibold text-[#8a604e]"><EyeOff className="h-3.5 w-3.5" />Hide</button> : <button onClick={() => run("restore")} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-[#d4dfcf] px-2.5 py-1.5 text-xs font-semibold text-[#58704e]"><RotateCcw className="h-3.5 w-3.5" />Restore</button>}{!deleted && canDelete && mfaVerified && <button onClick={() => run("delete")} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-[#9d5147] px-2.5 py-1.5 text-xs font-semibold text-white"><Trash2 className="h-3.5 w-3.5" />Delete</button>}{!deleted && canDelete && !mfaVerified && <Link href="/admin/security" title="Verify MFA to delete" className="inline-flex items-center gap-1 rounded-lg border border-[#e2d2c7] px-2.5 py-1.5 text-xs font-semibold text-[#8a604e]"><LockKeyhole className="h-3.5 w-3.5" />MFA for delete</Link>}</div>{error && <p role="alert" className="mt-2 text-xs text-[#a04f45]">{error}</p>}</div>;
}
