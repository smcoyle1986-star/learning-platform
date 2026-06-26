"use client";

import Link from "next/link";

type PremiumPreviewOverlayProps = {
  eyebrow?: string;
  title: string;
  description: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export default function PremiumPreviewOverlay({
  eyebrow = "Premium Preview",
  title,
  description,
  secondaryHref = "/flashcards",
  secondaryLabel = "Return to Flashcards",
}: PremiumPreviewOverlayProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[140] flex items-center justify-center bg-[rgba(17,24,39,0.14)] px-4 backdrop-blur-[1.5px]">
      <div className="pointer-events-auto w-full max-w-xl rounded-[2rem] border border-white/80 bg-[rgba(255,253,248,0.82)] p-6 shadow-[0_28px_80px_rgba(15,23,42,0.24)] backdrop-blur-xl">
        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b8d6f]">
          {eyebrow}
        </div>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#2f3a2f]">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-[#5c665c]">{description}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/upgrade" className="btn btn-primary px-6 py-3">
            Upgrade to Premium
          </Link>
          <Link href={secondaryHref} className="btn btn-secondary px-6 py-3">
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
