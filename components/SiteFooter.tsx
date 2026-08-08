"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { COMPANY } from "@/lib/legal/constants";
import { CookiePreferencesButton } from "@/components/privacy/CookiePreferencesButton";

const legalLinks = [
  ["Terms", "/legal/terms"],
  ["Privacy", "/legal/privacy"],
  ["Cookies", "/legal/cookies"],
  ["Refunds", "/legal/refunds"],
  ["Community", "/legal/community-guidelines"],
  ["Copyright", "/legal/copyright"],
  ["Online safety", "/legal/online-safety"],
  ["Accessibility", "/legal/accessibility"],
] as const;

export function SiteFooter() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const updateFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    updateFullscreenState();
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

  if (isFullscreen) return null;

  return (
    <footer className="border-t border-[#dfe4d9] bg-[#eef1e9] px-5 py-8 text-sm text-[#566056]">
      <div className="mx-auto max-w-7xl">
        <nav aria-label="Legal" className="flex flex-wrap gap-x-5 gap-y-3 font-medium">
          <Link href="/legal" className="font-semibold text-[#334033] hover:underline">Legal centre</Link>
          {legalLinks.map(([label, href]) => (
            <Link key={href} href={href} className="underline-offset-4 hover:underline">{label}</Link>
          ))}
          <CookiePreferencesButton />
        </nav>
        <div className="mt-5 space-y-1 leading-6">
          <p>{COMPANY.legalName} · Company number {COMPANY.companyNumber} · Registered in {COMPANY.jurisdiction}</p>
          <p>Registered office: {COMPANY.registeredOffice}</p>
          <p>
            Contact: <a href={`mailto:${COMPANY.supportEmail}`} className="underline underline-offset-4">{COMPANY.supportEmail}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
