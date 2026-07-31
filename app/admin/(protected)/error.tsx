"use client";

import { RefreshCw } from "lucide-react";

export default function AdminDashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="px-5 py-12 sm:px-7 lg:px-10">
      <div className="max-w-2xl rounded-3xl border border-[#ead8ce] bg-white p-8 shadow-[0_12px_34px_rgba(74,55,45,0.06)]">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a06d55]">
          Data temporarily unavailable
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#383d37]">
          The administrator dashboard could not load
        </h1>
        <p className="mt-4 leading-7 text-[#6f756e]">
          Your administrator session remains protected. Try loading the live
          platform snapshot again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="btn btn-primary mt-6 inline-flex items-center gap-2 px-5 py-3"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          Try again
        </button>
      </div>
    </section>
  );
}
