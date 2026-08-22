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
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="flex h-[min(90svh,44rem)] max-h-[calc(100svh-1.5rem)] w-[min(92vw,64rem)] min-h-0 flex-col items-center gap-4 overflow-hidden rounded-[2rem] bg-white px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.25)] sm:gap-6 sm:px-8 sm:py-7">
        <div className="flex w-full min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto pb-1 sm:gap-5">
          <div className="w-full shrink-0 text-center">
            <div className="text-lg font-bold">{title}</div>
            {description && <div className="text-sm text-gray-600">{description}</div>}
          </div>

          <div className="flex w-full min-h-0 flex-1 items-center justify-center overflow-hidden">
            {children}
          </div>
        </div>

        <div className="flex shrink-0 gap-5 pt-1">
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
