import type { Metadata } from "next";
import Link from "next/link";

import { COMPANY, LEGAL_EFFECTIVE_DATE } from "@/lib/legal/constants";
import { LEGAL_DOCUMENTS } from "@/lib/legal/documents";

export const metadata: Metadata = {
  title: "Legal Centre",
  description: "Classendo terms, privacy, billing, safety and legal information.",
};

export default function LegalCentrePage() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] px-5 py-10 text-[#2f3a2f] sm:px-7 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-[2rem] border border-[#e2e6da] bg-white p-7 shadow-[0_18px_40px_rgba(54,64,46,0.08)] md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#718d63]">Legal centre</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-6xl">Clear rules for using Classendo</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[#5c665c]">
            Find our terms, privacy information, subscription and refund rules, community standards and reporting routes.
          </p>
          <p className="mt-5 text-sm text-[#778176]">Documents effective {LEGAL_EFFECTIVE_DATE}</p>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2">
          {LEGAL_DOCUMENTS.map((document) => (
            <Link
              key={document.slug}
              href={`/legal/${document.slug}`}
              className="group rounded-[1.6rem] border border-[#e2e6da] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(54,64,46,0.10)]"
            >
              <h2 className="text-xl font-semibold">{document.title}</h2>
              <p className="mt-3 text-sm leading-7 text-[#667066]">{document.summary}</p>
              <span className="mt-5 inline-block text-sm font-semibold text-[#607b52]">Read document →</span>
            </Link>
          ))}
        </section>

        <section className="mt-8 rounded-[1.6rem] border border-[#dce4d5] bg-[#f3f7f0] p-6 text-sm leading-7 text-[#596459] md:p-8">
          <h2 className="text-xl font-semibold text-[#2f3a2f]">Company and contact</h2>
          <p className="mt-3">{COMPANY.legalName}, company number {COMPANY.companyNumber}, registered in {COMPANY.jurisdiction}.</p>
          <p>Registered office: {COMPANY.registeredOffice}.</p>
          <p>Email: <a className="font-semibold underline underline-offset-4" href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a>.</p>
        </section>
      </div>
    </main>
  );
}
