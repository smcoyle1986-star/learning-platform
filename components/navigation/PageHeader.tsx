"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

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

function MoreLessonTools({
  isOpen,
  onToggle,
}: {
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isOpen}
      className="btn btn-secondary flex shrink-0 items-center gap-1 rounded-full px-4 py-3 text-sm"
    >
      More lesson tools <span aria-hidden="true" className={`transition ${isOpen ? "rotate-180" : ""}`}>⌄</span>
    </button>
  );
}

function LessonToolsPanel() {
  return (
    <div className="mt-3 flex justify-end">
      <section aria-label="More lesson tools" className="flex w-fit max-w-full flex-wrap justify-end gap-2 rounded-2xl border border-[#dfe7da] bg-[#f7faf5] p-2.5 shadow-[0_10px_24px_rgba(54,64,46,0.08)]">
        <Link href="/games" className="btn btn-secondary rounded-xl px-3 py-2 text-sm">Games</Link>
        <Link href="/worksheets" className="btn btn-secondary rounded-xl px-3 py-2 text-sm">Worksheets</Link>
        <Link href="/printables" className="btn btn-secondary rounded-xl px-3 py-2 text-sm">Print Cards</Link>
        <Link href="/lessons" className="btn btn-secondary rounded-xl px-3 py-2 text-sm">Lesson Plans</Link>
      </section>
    </div>
  );
}

export default function PageHeader({
  title,
  description,
  primaryItems = [],
  secondaryItems: _secondaryItems = [],
  rightSlot,
  sticky = true,
  className = "",
}: PageHeaderProps) {
  const [isLessonToolsOpen, setIsLessonToolsOpen] = useState(false);
  void _secondaryItems;

  return (
    <>
      <header
        className={`${sticky ? "sticky top-0 z-[100]" : ""} bg-[var(--color-bg-main)]/80 backdrop-blur-md border-b border-black/5 ${className}`.trim()}
      >
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6 md:py-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_auto] xl:items-center">

          <div className="flex flex-col gap-3 xl:min-w-0 xl:items-center">
            {title ? (
              <div className="min-w-0 xl:text-center">
                <h1 className="text-2xl font-bold text-black sm:text-3xl xl:whitespace-nowrap xl:text-4xl">{title}</h1>
              </div>
            ) : (
              <div />
            )}

            {primaryItems.length > 0 ? <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#71806d]">Use this lesson</p> : null}
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
              {primaryItems.length > 0 ? <MoreLessonTools isOpen={isLessonToolsOpen} onToggle={() => setIsLessonToolsOpen((current) => !current)} /> : null}
            </div>
          </div>

          <div className="hidden xl:flex xl:shrink-0 xl:items-center xl:justify-end xl:gap-2">
            {primaryItems.length > 0 ? <span className="mr-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#71806d]">Use this lesson</span> : null}
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
            {primaryItems.length > 0 ? <MoreLessonTools isOpen={isLessonToolsOpen} onToggle={() => setIsLessonToolsOpen((current) => !current)} /> : null}
            {rightSlot}
          </div>
        </div>

        {primaryItems.length > 0 && isLessonToolsOpen ? <LessonToolsPanel /> : null}
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
