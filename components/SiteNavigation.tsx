"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";

const primaryLinks = [
  { label: "My Lessons", href: "/dashboard" },
  { label: "Flashcards", href: "/flashcards" },
  { label: "My Uploads", href: "/creator" },
  { label: "Community", href: "/teacher/community" },
];

export default function SiteNavigation() {
  return (
    <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
      {primaryLinks.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-[#41503f] transition hover:bg-[#edf3e9] hover:text-[#35512d]"
        >
          {item.label}
        </Link>
      ))}
      <details className="group relative">
        <summary className="flex cursor-pointer list-none items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-[#41503f] transition hover:bg-[#edf3e9] hover:text-[#35512d] [&::-webkit-details-marker]:hidden">
          Resources <ChevronDown aria-hidden="true" className="h-4 w-4 transition group-open:rotate-180" />
        </summary>
        <div className="absolute right-0 top-full z-[70] mt-2 w-56 rounded-2xl border border-[#dfe7da] bg-white p-2 shadow-[0_18px_42px_rgba(54,64,46,0.16)]">
          <Link href="/free-resources" className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-[#344133] hover:bg-[#f2f7ef]">Free Lesson Packs</Link>
          <Link href="/topics" className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-[#344133] hover:bg-[#f2f7ef]">ESL Topics</Link>
        </div>
      </details>
      <Link
        href="/upgrade"
        className="rounded-lg px-3 py-2 text-sm font-semibold text-[#8b5a17] transition hover:bg-[#fff4d7]"
      >
        Pricing
      </Link>
    </nav>
  );
}
