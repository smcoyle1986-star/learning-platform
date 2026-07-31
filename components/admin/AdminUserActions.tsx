"use client";

import {
  Ban,
  Gift,
  LockKeyhole,
  RotateCcw,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  userId: string;
  email: string | null;
  isSuspended: boolean;
  protectedAccount: boolean;
  hasStripePremium: boolean;
  hasComplimentaryPremium: boolean;
  canManage: boolean;
  mfaVerified: boolean;
};

type UserAction =
  | "grant_complimentary"
  | "revoke_complimentary"
  | "suspend"
  | "restore"
  | "delete";

export function AdminUserActions({
  userId,
  email,
  isSuspended,
  protectedAccount,
  hasStripePremium,
  hasComplimentaryPremium,
  canManage,
  mfaVerified,
}: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [durationDays, setDurationDays] = useState("90");
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [busy, setBusy] = useState<UserAction | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function runAction(action: UserAction) {
    if (reason.trim().length < 5) {
      setError("Provide a reason of at least five characters.");
      return;
    }

    setBusy(action);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${userId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason: reason.trim(),
          durationDays:
            action === "grant_complimentary"
              ? durationDays === "none"
                ? null
                : Number(durationDays)
              : undefined,
          confirmationEmail:
            action === "delete" ? confirmationEmail.trim() : undefined,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(payload?.error ?? "The action failed."));
      }

      setMessage(String(payload?.message ?? "Action completed."));
      setReason("");
      setConfirmationEmail("");

      if (action === "delete") {
        router.replace("/admin/users");
        router.refresh();
        return;
      }

      router.refresh();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "The action failed.");
    } finally {
      setBusy(null);
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-2xl border border-[#e0e4dd] bg-[#f8faf6] p-5 text-sm leading-6 text-[#687168]">
        User changes are restricted to the Classendo owner.
      </div>
    );
  }

  if (!mfaVerified) {
    return (
      <div className="rounded-2xl border border-[#e6dccf] bg-[#fffdf8] p-5">
        <div className="flex items-start gap-3">
          <LockKeyhole aria-hidden="true" className="mt-0.5 h-5 w-5 text-[#8a6b4c]" />
          <div>
            <h3 className="font-semibold text-[#4b433a]">MFA verification required</h3>
            <p className="mt-1 text-sm leading-6 text-[#756c62]">
              Verify your owner session before changing access, suspending an
              account, or deleting a user.
            </p>
            <Link
              href="/admin/security"
              className="mt-3 inline-block text-sm font-semibold text-[#617c53] underline underline-offset-4"
            >
              Verify owner MFA
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {protectedAccount && (
        <div className="rounded-2xl border border-[#e1ddef] bg-[#faf8fd] p-4 text-sm leading-6 text-[#6a5e7d]">
          This is an administrator account. Suspension and deletion are blocked.
        </div>
      )}

      <label className="block">
        <span className="text-sm font-semibold text-[#465146]">
          Reason for change
        </span>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value.slice(0, 500))}
          rows={3}
          placeholder="Required for the administrator audit log"
          className="mt-2 w-full rounded-xl border border-[#d9dfd5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#88a879] focus:ring-4 focus:ring-[#edf3e9]"
        />
      </label>

      <section className="rounded-2xl border border-[#dfe4dc] bg-white p-5">
        <div className="flex items-start gap-3">
          <Gift aria-hidden="true" className="mt-0.5 h-5 w-5 text-[#5f7d50]" />
          <div className="flex-1">
            <h3 className="font-semibold text-[#394439]">Premium access</h3>
            {hasStripePremium ? (
              <p className="mt-1 text-sm leading-6 text-[#6f786e]">
                This account is premium through Stripe. Paid billing is not
                changed from user management.
              </p>
            ) : hasComplimentaryPremium ? (
              <>
                <p className="mt-1 text-sm leading-6 text-[#6f786e]">
                  Complimentary premium access is active.
                </p>
                <button
                  type="button"
                  onClick={() => runAction("revoke_complimentary")}
                  disabled={Boolean(busy)}
                  className="mt-4 rounded-xl border border-[#d8ddd4] px-4 py-2 text-sm font-semibold text-[#5e685e] hover:bg-[#f6f8f4] disabled:opacity-50"
                >
                  {busy === "revoke_complimentary" ? "Revoking…" : "Revoke complimentary access"}
                </button>
              </>
            ) : (
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="block">
                  <span className="text-xs font-semibold text-[#687168]">Duration</span>
                  <select
                    value={durationDays}
                    onChange={(event) => setDurationDays(event.target.value)}
                    className="mt-1 block rounded-xl border border-[#d9dfd5] bg-white px-3 py-2 text-sm"
                  >
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">1 year</option>
                    <option value="none">No expiry</option>
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => runAction("grant_complimentary")}
                  disabled={Boolean(busy)}
                  className="btn btn-primary px-4 py-2 text-sm disabled:opacity-50"
                >
                  {busy === "grant_complimentary" ? "Granting…" : "Grant premium"}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#eadfd5] bg-white p-5">
        <div className="flex items-start gap-3">
          {isSuspended ? (
            <RotateCcw aria-hidden="true" className="mt-0.5 h-5 w-5 text-[#687b59]" />
          ) : (
            <Ban aria-hidden="true" className="mt-0.5 h-5 w-5 text-[#a2684d]" />
          )}
          <div>
            <h3 className="font-semibold text-[#494139]">
              {isSuspended ? "Restore account" : "Suspend account"}
            </h3>
            <p className="mt-1 text-sm leading-6 text-[#756d66]">
              {isSuspended
                ? "Allow this user to authenticate again."
                : "Prevent new and refreshed authenticated access without deleting data."}
            </p>
            <button
              type="button"
              onClick={() => runAction(isSuspended ? "restore" : "suspend")}
              disabled={Boolean(busy) || (protectedAccount && !isSuspended)}
              className="mt-4 rounded-xl border border-[#dfd4ca] px-4 py-2 text-sm font-semibold text-[#855b47] hover:bg-[#fcf7f3] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "suspend" || busy === "restore"
                ? "Updating…"
                : isSuspended
                  ? "Restore user"
                  : "Suspend user"}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#ebd1ca] bg-[#fffafa] p-5">
        <div className="flex items-start gap-3">
          <ShieldAlert aria-hidden="true" className="mt-0.5 h-5 w-5 text-[#a24f43]" />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[#633d37]">Permanent deletion</h3>
            <p className="mt-1 text-sm leading-6 text-[#805e58]">
              This removes the Supabase Auth account and may cascade through
              owned platform data. It cannot be undone.
            </p>
            <label className="mt-4 block">
              <span className="text-xs font-semibold text-[#795750]">
                Type {email ?? "the user email"} to confirm
              </span>
              <input
                type="email"
                value={confirmationEmail}
                onChange={(event) => setConfirmationEmail(event.target.value)}
                className="mt-1 w-full rounded-xl border border-[#e3cfc9] bg-white px-3 py-2 text-sm outline-none focus:border-[#b9796c]"
              />
            </label>
            <button
              type="button"
              onClick={() => runAction("delete")}
              disabled={
                Boolean(busy)
                || protectedAccount
                || !email
                || confirmationEmail.trim().toLowerCase() !== email.toLowerCase()
              }
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#a64f43] px-4 py-2 text-sm font-semibold text-white hover:bg-[#914238] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              {busy === "delete" ? "Deleting…" : "Permanently delete user"}
            </button>
          </div>
        </div>
      </section>

      {message && (
        <p aria-live="polite" className="rounded-xl bg-[#edf5e8] px-4 py-3 text-sm text-[#527047]">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-[#f9e9e5] px-4 py-3 text-sm text-[#955044]">
          {error}
        </p>
      )}
    </div>
  );
}
