"use client";

import { RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminSubscriptionReconcileButton({
  userId,
  canManage,
  mfaVerified,
}: {
  userId: string;
  canManage: boolean;
  mfaVerified: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!canManage) return null;

  if (!mfaVerified) {
    return (
      <Link
        href="/admin/security"
        className="text-xs font-semibold text-[#7a674f] underline underline-offset-4"
      >
        Verify MFA to sync
      </Link>
    );
  }

  async function reconcile() {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/subscriptions/${userId}/reconcile`,
        { method: "POST" },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(payload?.error ?? "Sync failed."));
      }

      setMessage("Synced");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={reconcile}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5e7653] hover:text-[#405a37] disabled:opacity-50"
      >
        <RefreshCw
          aria-hidden="true"
          className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
        />
        {loading ? "Syncing…" : "Sync from Stripe"}
      </button>
      {message && (
        <p
          role={message === "Synced" ? "status" : "alert"}
          className="mt-1 max-w-40 text-xs text-[#747d73]"
        >
          {message}
        </p>
      )}
    </div>
  );
}
