"use client";

import Link from "next/link";
import { Menu } from "lucide-react";

import { useBrandMenu } from "@/components/BrandMenuContext";

export default function MobileSiteHeader() {
  const { isOpen, open } = useBrandMenu();

  return (
    <header className="border-b border-black/5 bg-[var(--color-bg-main)] px-4 py-3 lg:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link
          href="/"
          className="text-3xl font-extrabold tracking-tight text-blue-700"
          aria-label="Classendo home"
        >
          Classendo
        </Link>
        <button
          type="button"
          onClick={open}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-black/10 bg-white text-[var(--color-text-main)] shadow-sm transition hover:bg-[var(--color-bg-card)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#7fa36a]/25"
          aria-label="Open navigation menu"
          aria-expanded={isOpen}
          aria-controls="brand-menu-drawer"
        >
          <Menu size={22} aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
