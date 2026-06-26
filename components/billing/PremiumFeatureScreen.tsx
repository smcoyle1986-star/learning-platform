"use client";

import Link from "next/link";

type PremiumFeatureScreenProps = {
  title: string;
  description: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export default function PremiumFeatureScreen({
  title,
  description,
  secondaryHref = "/flashcards",
  secondaryLabel = "Return to Flashcards",
}: PremiumFeatureScreenProps) {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-[var(--color-bg-main)] px-6 py-12 text-[var(--color-text-main)]">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-[#dbe3d1] bg-white p-8 shadow-[0_20px_55px_rgba(15,23,42,0.12)]">
        <div className="inline-flex items-center rounded-full border border-[#dbe3d1] bg-[#f7faf4] px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#6d8160]">
          Premium Feature
        </div>

        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#2f3a2f]">{title}</h1>
        <p className="mt-4 text-base leading-8 text-[#5c665c]">{description}</p>

        <div className="mt-8 flex flex-wrap gap-3">
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
