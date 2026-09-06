"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Info, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const updateFullscreenState = () => setIsFullscreen(Boolean(document.fullscreenElement));
    updateFullscreenState();
    document.addEventListener("fullscreenchange", updateFullscreenState);
    return () => document.removeEventListener("fullscreenchange", updateFullscreenState);
  }, []);

  useEffect(() => {
    if (isOpen) {
      closeRef.current?.focus();
      wasOpenRef.current = true;
    } else if (wasOpenRef.current) {
      openerRef.current?.focus();
      wasOpenRef.current = false;
    }

    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  if (isFullscreen || pathname.startsWith("/games/")) return null;

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="site-information-drawer"
        className="fixed bottom-[calc(1.25rem+var(--cookie-consent-banner-offset,0px))] left-5 z-50 inline-flex items-center gap-2 rounded-full border border-[#cfdcc8] bg-white px-4 py-2.5 text-sm font-semibold text-[#506a47] opacity-35 shadow-[0_12px_30px_rgba(48,65,43,0.16)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#f7faf5] hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f895f] focus-visible:ring-offset-2"
      >
        <Info aria-hidden="true" className="h-4 w-4" />
        Legal &amp; site info
      </button>

      <div
        className={`fixed inset-0 z-[70] bg-black/35 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
        onClick={() => setIsOpen(false)}
      />
      <section
        id="site-information-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-information-title"
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={`fixed inset-x-0 bottom-0 z-[80] max-h-[min(78dvh,38rem)] overflow-y-auto rounded-t-3xl border-t border-[#dfe4d9] bg-[#eef1e9] px-5 pb-[calc(1.5rem+var(--cookie-consent-banner-offset,0px))] pt-5 text-sm text-[#566056] shadow-[0_-16px_48px_rgba(48,65,43,0.18)] transition-transform duration-200 ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id="site-information-title" className="text-lg font-bold text-[#334033]">Legal &amp; site info</h2>
              <p className="mt-1 text-xs text-[#687268]">Policies, company information, and privacy controls.</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-full border border-[#cfd8c9] bg-white p-2 text-[#506a47] transition hover:bg-[#f7faf5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f895f]"
              aria-label="Close legal and site information"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

          <nav aria-label="Site links" className="flex flex-wrap gap-x-5 gap-y-3 font-medium">
            <Link href="/topics" onClick={() => setIsOpen(false)} className="font-semibold text-[#334033] hover:underline">ESL topics</Link>
            <Link href="/free-resources" onClick={() => setIsOpen(false)} className="font-semibold text-[#334033] hover:underline">Free lesson packs</Link>
            <Link href="/feedback" onClick={() => setIsOpen(false)} className="font-semibold text-[#334033] hover:underline">Send feedback</Link>
            <Link href="/legal" onClick={() => setIsOpen(false)} className="font-semibold text-[#334033] hover:underline">Legal centre</Link>
            {legalLinks.map(([label, href]) => (
              <Link key={href} href={href} onClick={() => setIsOpen(false)} className="underline-offset-4 hover:underline">{label}</Link>
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
      </section>
    </>
  );
}
