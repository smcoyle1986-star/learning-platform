"use client";

import { Menu } from "lucide-react";

import { useBrandMenu } from "@/components/BrandMenuContext";

export default function DesktopMenuButton() {
  const { isOpen, open } = useBrandMenu();

  return (
    <button
      type="button"
      onClick={open}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[var(--color-text-main)] shadow-sm transition hover:bg-[var(--color-bg-card)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#7fa36a]/25"
      aria-label="Open navigation menu"
      aria-expanded={isOpen}
      aria-controls="brand-menu-drawer"
    >
      <Menu size={18} aria-hidden="true" />
      Menu
    </button>
  );
}
