"use client";

import Link from "next/link";

type PremiumPreviewOverlayProps = {
  eyebrow?: string;
  title: string;
  description: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  variant?: "overlay" | "inline";
};

export default function PremiumPreviewOverlay({
  eyebrow = "Premium Preview",
  title,
  description,
  secondaryHref = "/flashcards",
  secondaryLabel = "Return to Flashcards",
  variant = "overlay",
}: PremiumPreviewOverlayProps) {
  const card = (
    <div className={`pointer-events-auto min-w-0 w-full rounded-[2rem] border border-white/80 bg-[rgba(255,253,248,0.9)] shadow-[0_28px_80px_rgba(15,23,42,0.24)] backdrop-blur-xl ${
      variant === "inline" ? "max-w-sm p-4" : "max-w-xl p-6"
    }`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7b8d6f]">
        {eyebrow}
      </div>
      <h2 className={`${variant === "inline" ? "mt-2 text-xl leading-6" : "mt-3 text-3xl"} font-bold tracking-tight text-[#2f3a2f]`}>
        {title}
      </h2>
      <p className={`${variant === "inline" ? "mt-2 text-xs leading-5" : "mt-3 text-sm leading-7"} text-[#5c665c]`}>
        {description}
      </p>

      <div className={`${variant === "inline" ? "mt-4 gap-2" : "mt-6 gap-3"} flex flex-wrap`}>
        <Link href="/upgrade" className={`btn btn-primary ${variant === "inline" ? "px-3 py-2 text-xs" : "px-6 py-3"}`}>
          Upgrade to Premium
        </Link>
        <Link href={secondaryHref} className={`btn btn-secondary ${variant === "inline" ? "px-3 py-2 text-xs" : "px-6 py-3"}`}>
          {secondaryLabel}
        </Link>
      </div>
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="flex h-full min-h-0 min-w-0 items-center justify-center">
        {card}
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[140] flex items-center justify-center bg-[rgba(17,24,39,0.14)] px-4 backdrop-blur-[1.5px]">
      {card}
    </div>
  );
}
