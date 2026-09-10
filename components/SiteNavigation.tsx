"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { useBillingAccess } from "@/lib/billing/useBillingAccess";

const primaryLinks = [
  { label: "Build a lesson", href: "/flashcards" },
  { label: "Classroom", href: "/flashcards/classroom" },
  { label: "Free Games", href: "/games" },
  { label: "My Lessons", href: "/dashboard" },
];

export default function SiteNavigation() {
  const { access } = useBillingAccess();
  const hasPaidPremium = access?.premiumAccessSource === "stripe";

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
          <Link href="/worksheets" className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-[#344133] hover:bg-[#f2f7ef]">Worksheets</Link>
          <Link href="/printables" className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-[#344133] hover:bg-[#f2f7ef]">Printables</Link>
          <Link href="/lessons" className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-[#344133] hover:bg-[#f2f7ef]">Lesson Plans</Link>
          <Link href="/creator" className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-[#344133] hover:bg-[#f2f7ef]">My Uploads</Link>
          <Link href="/teacher/community" className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-[#344133] hover:bg-[#f2f7ef]">Community</Link>
          <Link href="/free-resources" className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-[#344133] hover:bg-[#f2f7ef]">Free Lesson Packs</Link>
          <Link href="/topics" className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-[#344133] hover:bg-[#f2f7ef]">ESL Topics</Link>
        </div>
      </details>
      <Link
        href={hasPaidPremium ? "/profile" : "/upgrade"}
        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
          hasPaidPremium
            ? "text-[#41503f] hover:bg-[#edf3e9] hover:text-[#35512d]"
            : "text-[#8b5a17] hover:bg-[#fff4d7]"
        }`}
      >
        {hasPaidPremium ? "Account" : "Pricing"}
      </Link>
    </nav>
  );
}
