import Link from "next/link";

import type { LegalDocument } from "@/lib/legal/documents";
import { LEGAL_EFFECTIVE_DATE } from "@/lib/legal/constants";

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <main className="min-h-screen bg-[#f7f6f2] px-5 py-10 text-[#2f3a2f] sm:px-7 sm:py-14">
      <article className="mx-auto max-w-4xl">
        <Link href="/legal" className="text-sm font-semibold text-[#607357] underline underline-offset-4">
          ← Legal centre
        </Link>
        <header className="mt-7 rounded-[2rem] border border-[#e2e6da] bg-white p-6 shadow-[0_18px_40px_rgba(54,64,46,0.08)] md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#718d63]">Classendo legal</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">{document.title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5c665c]">{document.summary}</p>
          <p className="mt-5 text-sm font-medium text-[#778176]">Effective: {LEGAL_EFFECTIVE_DATE}</p>
        </header>

        <div className="mt-7 space-y-5">
          {document.sections.map((section) => (
            <section key={section.title} className="rounded-[1.6rem] border border-[#e2e6da] bg-white p-6 md:p-8">
              <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{section.title}</h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-[0.98rem] leading-8 text-[#596459]">
                  {paragraph}
                </p>
              ))}
              {section.bullets ? (
                <ul className="mt-4 list-disc space-y-3 pl-6 text-[0.98rem] leading-7 text-[#596459]">
                  {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
