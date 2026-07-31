"use client";

import {
  CheckCircle2,
  Eye,
  LockKeyhole,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { FeedbackStatus } from "@/lib/admin/feedback";

type FeedbackAction =
  | "mark_read"
  | "resolve"
  | "reopen"
  | "save_note"
  | "delete";

export function AdminFeedbackActions({
  feedbackId,
  initialStatus,
  initialNote,
  canDelete,
  mfaVerified,
}: {
  feedbackId: string;
  initialStatus: FeedbackStatus;
  initialNote: string | null;
  canDelete: boolean;
  mfaVerified: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState(initialNote ?? "");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState<FeedbackAction | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function runAction(action: FeedbackAction) {
    if (action === "delete" && confirmation !== "DELETE") {
      setError("Type DELETE to confirm this action.");
      return;
    }

    setBusy(action);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/feedback/${feedbackId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          note: action === "save_note" ? note : undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(payload?.error ?? "The action failed."));
      }

      setMessage(String(payload?.message ?? "Feedback updated."));
      if (action === "delete") {
        router.replace("/admin/feedback");
      }
      router.refresh();
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "The action failed.",
      );
    } finally {
      setBusy(null);
    }
  }

  if (initialStatus === "deleted") {
    return (
      <div className="rounded-2xl border border-[#ead8d3] bg-[#fff9f7] p-4 text-sm leading-6 text-[#815d53]">
        This feedback was deleted from the active inbox. Its audit record and
        original submission remain retained for accountability.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-[#dfe4dc] bg-white p-5">
        <h3 className="font-semibold text-[#394439]">Workflow status</h3>
        <p className="mt-1 text-sm leading-6 text-[#70796f]">
          Mark the item as reviewed or resolved. These changes are written to
          the administrator audit log.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {initialStatus === "pending" && (
            <button
              type="button"
              onClick={() => runAction("mark_read")}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#d4dfcf] px-4 py-2 text-sm font-semibold text-[#58704e] hover:bg-[#f5f8f3] disabled:opacity-50"
            >
              <Eye aria-hidden="true" className="h-4 w-4" />
              {busy === "mark_read" ? "Updating…" : "Mark read"}
            </button>
          )}
          {initialStatus !== "resolved" ? (
            <button
              type="button"
              onClick={() => runAction("resolve")}
              disabled={Boolean(busy)}
              className="btn btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
            >
              <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
              {busy === "resolve" ? "Resolving…" : "Resolve"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => runAction("reopen")}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#d4dfcf] px-4 py-2 text-sm font-semibold text-[#58704e] hover:bg-[#f5f8f3] disabled:opacity-50"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              {busy === "reopen" ? "Reopening…" : "Reopen"}
            </button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-[#dfe4dc] bg-white p-5">
        <label className="block">
          <span className="font-semibold text-[#394439]">Internal note</span>
          <span className="mt-1 block text-sm leading-6 text-[#70796f]">
            Notes are visible only to administrators.
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value.slice(0, 4000))}
            rows={5}
            placeholder="Record context, follow-up, or the resolution."
            className="mt-3 w-full rounded-xl border border-[#d9dfd5] bg-[#fbfcfa] px-3 py-2.5 text-sm leading-6 outline-none focus:border-[#88a879] focus:ring-4 focus:ring-[#edf3e9]"
          />
          <span className="mt-1 block text-right text-xs text-[#858d83]">
            {note.length.toLocaleString()} / 4,000
          </span>
        </label>
        <button
          type="button"
          onClick={() => runAction("save_note")}
          disabled={Boolean(busy)}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#d4dfcf] px-4 py-2 text-sm font-semibold text-[#58704e] hover:bg-[#f5f8f3] disabled:opacity-50"
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          {busy === "save_note" ? "Saving…" : "Save note"}
        </button>
      </section>

      <section className="rounded-2xl border border-[#ebd1ca] bg-[#fffafa] p-5">
        <div className="flex items-start gap-3">
          <Trash2
            aria-hidden="true"
            className="mt-0.5 h-5 w-5 shrink-0 text-[#a24f43]"
          />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[#5d3e38]">Delete feedback</h3>
            <p className="mt-1 text-sm leading-6 text-[#80645d]">
              Removes the item from the active inbox while retaining an
              auditable record.
            </p>
            {!canDelete ? (
              <p className="mt-3 text-sm text-[#80645d]">
                Only the Classendo owner can delete feedback.
              </p>
            ) : !mfaVerified ? (
              <div className="mt-4 rounded-xl border border-[#e6dccf] bg-white p-4">
                <p className="flex items-center gap-2 text-sm font-semibold text-[#765c45]">
                  <LockKeyhole aria-hidden="true" className="h-4 w-4" />
                  MFA verification required
                </p>
                <Link
                  href="/admin/security"
                  className="mt-2 inline-block text-sm font-semibold text-[#617c53] underline underline-offset-4"
                >
                  Verify owner MFA
                </Link>
              </div>
            ) : (
              <div className="mt-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[#80645d]">
                    Type DELETE to confirm
                  </span>
                  <input
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-[#e2cbc5] bg-white px-3 py-2 text-sm outline-none focus:border-[#b47869]"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => runAction("delete")}
                  disabled={Boolean(busy) || confirmation !== "DELETE"}
                  className="mt-3 rounded-xl bg-[#9d5147] px-4 py-2 text-sm font-semibold text-white hover:bg-[#86453d] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy === "delete" ? "Deleting…" : "Delete feedback"}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-[#ead7cf] bg-[#fff8f5] px-4 py-3 text-sm text-[#915844]"
        >
          {error}
        </p>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl border border-[#d7e4d0] bg-[#f4f9f1] px-4 py-3 text-sm text-[#526f47]"
        >
          {message}
        </p>
      )}
    </div>
  );
}
