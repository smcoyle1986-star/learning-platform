"use client";

import { startPremiumCheckout } from "@/lib/billing/client";

type UpgradeModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
};

export default function UpgradeModal({
  open,
  onClose,
  title = "Upgrade to Premium",
  description = "This feature is part of Classendo Premium. Upgrade to unlock full access.",
}: UpgradeModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-md rounded-[2rem] border border-[#d9e2d0] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b8d6f]">
          Classendo Premium
        </div>
        <h2 className="mt-3 text-2xl font-bold text-[#2f3a2f]">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-[#5c665c]">{description}</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void startPremiumCheckout("monthly")}
            className="btn btn-primary px-4 py-3 text-sm"
          >
            Go Premium
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary px-4 py-3 text-sm"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
