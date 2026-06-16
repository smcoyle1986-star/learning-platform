"use client";

import type { ReactNode } from "react";

type KaboomStyleDecisionModalProps = {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onIncorrect: () => void;
  onCorrect: () => void;
  incorrectLabel?: ReactNode;
  correctLabel?: ReactNode;
  incorrectAriaLabel?: string;
  correctAriaLabel?: string;
};

export default function KaboomStyleDecisionModal({
  open,
  title,
  description,
  children,
  onIncorrect,
  onCorrect,
  incorrectLabel = "❌",
  correctLabel = "⭕",
  incorrectAriaLabel = "Incorrect",
  correctAriaLabel = "Correct",
}: KaboomStyleDecisionModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-[2rem] px-6 py-7 sm:px-8 sm:py-8 w-[min(92vw,64rem)] max-h-[90vh] min-h-[36rem] overflow-hidden flex flex-col items-center justify-center gap-8 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
        <div className="w-full min-h-0 flex-1 flex flex-col items-center justify-center gap-6 overflow-hidden pb-2">
          <div className="w-full text-center">
            <div className="text-lg font-bold">{title}</div>
            {description && <div className="text-sm text-gray-600">{description}</div>}
          </div>

          <div className="w-full min-h-0 flex-1 flex items-center justify-center overflow-hidden">
            {children}
          </div>
        </div>

        <div className="flex gap-5 shrink-0 pb-1">
          <button
            onClick={onIncorrect}
            className="px-6 py-3 rounded-full bg-white border border-red-200 text-red-600 text-lg font-semibold shadow-sm hover:-translate-y-0.5 transition-transform"
            aria-label={incorrectAriaLabel}
          >
            {incorrectLabel}
          </button>
          <button
            onClick={onCorrect}
            className="px-6 py-3 rounded-full bg-green-400 text-green-900 text-lg font-semibold shadow-sm hover:-translate-y-0.5 transition-transform"
            aria-label={correctAriaLabel}
          >
            {correctLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
