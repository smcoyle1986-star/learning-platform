import Link from "next/link";
import BrandButton from "@/components/BrandButton";
import { LANDING_FAQ_FULL } from "@/lib/landing/faq";
import { PAGE_CONTENT } from "@/lib/seo/page-content";

export default function FaqPage() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#2f3a2f]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <BrandButton className="text-4xl font-extrabold text-blue-700 hover:opacity-80 md:text-5xl" />
        <Link href="/" className="btn btn-secondary">
          Back to home
        </Link>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-[#2f3a2f] md:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#5c665c]">
            {PAGE_CONTENT.faq.description}
          </p>
        </div>

        <div className="mt-14 grid gap-4">
          {LANDING_FAQ_FULL.map((faq) => (
            <article
              key={faq.question}
              className="rounded-3xl border border-[#e5e8de] bg-white p-6 shadow-sm md:p-7"
            >
              <h2 className="text-lg font-semibold text-[#2f3a2f] md:text-xl">{faq.question}</h2>
              <p className="mt-3 text-sm leading-7 text-[#5c665c] md:text-base">{faq.answer}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center rounded-full bg-[#86a96a] px-8 py-4 text-base font-semibold text-white shadow-[0_12px_30px_rgba(134,169,106,0.28)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#7a9b61]"
          >
            Start Free
          </Link>
        </div>
      </section>

      <footer className="border-t border-black/10 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center text-sm text-[#6b756b] md:flex-row md:text-left">
          <p>© 2026 Classendo. Built for teachers.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {[
              { label: "Flashcards", href: "/flashcards" },
              { label: "Lesson Plans", href: "/lessons" },
              { label: "Games", href: "/games" },
              { label: "Worksheets", href: "/worksheets" },
              { label: "Printables", href: "/printables" },
              { label: "Community", href: "/teacher/community" },
              { label: "Pricing", href: "/upgrade" },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="transition-colors hover:text-[#2f3a2f]">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
