"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import BrandButton from "@/components/BrandButton";

type PageHeaderItem = {
  label: string;
  href?: string;
  onClick?: () => void;
  tone?: "default" | "classroom";
  icon?: ReactNode;
  highlight?: boolean;
};

type PageHeaderProps = {
  title?: string;
  description?: ReactNode;
  primaryItems?: PageHeaderItem[];
  secondaryItems?: PageHeaderItem[];
  rightSlot?: ReactNode;
  sticky?: boolean;
  className?: string;
};

function pillClassName(tone: PageHeaderItem["tone"], highlight = false) {
  if (tone === "classroom") {
    return `btn rounded-full border-[#7ea76a] bg-[#89ad70] px-5 py-3 text-sm text-white hover:bg-[#7ea76a] shadow-[0_8px_18px_rgba(126,167,106,0.18)] ${highlight ? "animate-classroom-prompt" : ""}`;
  }
  return "btn btn-secondary rounded-full";
}

export default function PageHeader({
  title,
  description,
  primaryItems = [],
  secondaryItems = [],
  rightSlot,
  sticky = true,
  className = "",
}: PageHeaderProps) {
  return (
    <>
      <header
        className={`${sticky ? "sticky top-0 z-50" : ""} bg-[var(--color-bg-main)]/80 backdrop-blur-md border-b border-black/5 ${className}`.trim()}
      >
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6 md:py-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[auto_1fr_auto] xl:items-center">
          <div className="flex items-center justify-between gap-4 xl:justify-start">
            <BrandButton className="hidden shrink-0 text-4xl font-extrabold text-blue-700 hover:opacity-80 md:block md:text-5xl" />
            {rightSlot ? <div className="hidden shrink-0 xl:hidden">{rightSlot}</div> : null}
          </div>

          <div className="flex flex-col gap-3 xl:min-w-0 xl:items-center">
            {title ? (
              <div className="min-w-0 xl:text-center">
                <h1 className="text-2xl font-bold text-black sm:text-3xl xl:whitespace-nowrap xl:text-4xl">{title}</h1>
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:hidden md:flex-wrap md:overflow-visible md:pb-0">
              {primaryItems.map((item) =>
                item.href ? (
                  <Link key={`${item.label}-${item.href}`} href={item.href} className={pillClassName(item.tone, item.highlight)}>
                    {item.icon}{item.label}
                  </Link>
                ) : (
                  <button
                    key={item.label}
                    type="button"
                    onClick={item.onClick}
                    className={pillClassName(item.tone, item.highlight)}
                  >
                    {item.icon}{item.label}
                  </button>
                )
              )}
            </div>
          </div>

          <div className="hidden xl:flex xl:shrink-0 xl:items-center xl:justify-end xl:gap-2">
            {primaryItems.map((item) =>
              item.href ? (
                <Link key={`${item.label}-${item.href}`} href={item.href} className={pillClassName(item.tone, item.highlight)}>
                  {item.icon}{item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className={pillClassName(item.tone, item.highlight)}
                >
                  {item.icon}{item.label}
                </button>
              )
            )}
            {rightSlot}
          </div>
        </div>

        {secondaryItems.length > 0 ? (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto border-t border-black/5 pb-1 pt-3 md:flex-wrap md:overflow-visible md:pb-0">
            {secondaryItems.map((item) =>
              item.href ? (
                <Link
                  key={`${item.label}-${item.href}`}
                  href={item.href}
                  className={`${pillClassName(item.tone, item.highlight)} px-3 py-1.5 text-sm`}
                >
                  {item.icon}{item.label}
                </Link>
              ) : (
                <button
                  key={item.label}
                  type="button"
                  onClick={item.onClick}
                  className={`${pillClassName(item.tone, item.highlight)} px-3 py-1.5 text-sm`}
                >
                  {item.icon}{item.label}
                </button>
              )
            )}
          </div>
        ) : null}
        </div>
      </header>
      {description ? (
        <section className="mx-auto w-full max-w-7xl px-4 pt-4 md:px-6 md:pt-5" aria-label={title ? `About ${title}` : "About this page"}>
          <p className="max-w-3xl text-sm leading-6 text-[var(--color-text-muted)] md:text-base">
            {description}
          </p>
        </section>
      ) : null}
    </>
  );
}
