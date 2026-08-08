"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LANDING_FAQ_PREVIEW } from "@/lib/landing/faq";

type LandingHomepageSectionsProps = {
  isLoggedIn: boolean;
  primaryCtaHref: string;
  primaryCtaLabel: string;
};

function getPreviewHref(isLoggedIn: boolean, slug: string) {
  if (isLoggedIn || slug === "flashcards" || slug === "printables" || slug === "lessons") {
    return `/${slug}`;
  }
  return `/preview/${slug}`;
}

type ExpandedImage = {
  src: string;
  alt: string;
};

function LandingSectionImage({
  path,
  alt,
  onExpand,
}: {
  path: string;
  alt: string;
  onExpand: (image: ExpandedImage) => void;
}) {
  const src = `/api/landing-image?path=${encodeURIComponent(path)}`;

  return (
    <button
      type="button"
      onClick={() => onExpand({ src, alt })}
      className="group block w-full touch-manipulation cursor-zoom-in rounded-[2rem] text-left outline-none transition-transform duration-200 hover:-translate-y-1 focus-visible:ring-4 focus-visible:ring-[#86a96a]/50"
      aria-label={`Expand ${alt}`}
      title="Tap or click to view fullscreen"
    >
      <div className="rounded-[2rem] border-[3px] border-[#d8e6ce] bg-[#fcfcf8] p-3 shadow-[0_16px_40px_rgba(54,64,46,0.08)] transition-shadow duration-200 group-hover:shadow-[0_22px_48px_rgba(54,64,46,0.16)]">
      <img
        src={src}
        alt={alt}
        className="block h-full w-full rounded-[1.35rem] object-contain"
        style={{ maxHeight: "min(80vh, 1200px)" }}
        loading="lazy"
        decoding="async"
      />
      </div>
    </button>
  );
}

export default function LandingHomepageSections({
  isLoggedIn,
  primaryCtaHref,
  primaryCtaLabel,
}: LandingHomepageSectionsProps) {
  const [expandedImage, setExpandedImage] = useState<ExpandedImage | null>(null);

  useEffect(() => {
    if (!expandedImage) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedImage(null);
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [expandedImage]);

  return (
    <>
      {expandedImage ? (
        <button
          type="button"
          onClick={() => setExpandedImage(null)}
          className="fixed inset-0 z-[200] flex touch-manipulation cursor-zoom-out items-center justify-center bg-[#182016]/90 p-4 outline-none sm:p-8"
          aria-label="Close fullscreen image"
          title="Tap or click anywhere to close"
        >
          <img
            src={expandedImage.src}
            alt={expandedImage.alt}
            className="max-h-full max-w-full rounded-2xl object-contain shadow-2xl"
          />
          <span className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-sm font-medium text-white">
            Tap or click anywhere to close
          </span>
        </button>
      ) : null}

      <section className="mx-auto max-w-[1760px] px-6 py-12 md:py-16">
        <LandingSectionImage
          path="classendo-images/information/resources.png"
          alt="Classendo resources for every lesson and learner"
          onExpand={setExpandedImage}
        />
      </section>

      <section className="mx-auto max-w-[1760px] px-6 py-12 md:py-16">
        <LandingSectionImage
          path="classendo-images/information/flowchart.png"
          alt="How teachers use Classendo"
          onExpand={setExpandedImage}
        />
      </section>

      <section className="mx-auto max-w-[1760px] px-6 py-12 md:py-16">
        <LandingSectionImage
          path="classendo-images/information/free_vs_premium.png"
          alt="Classendo free and premium plan comparison"
          onExpand={setExpandedImage}
        />
      </section>

      <section className="px-6 py-20 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#2f3a2f] md:text-5xl">
            Ready to unlock everything?
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#5c665c]">
            Choose the plan that works for your classroom. Start free, then upgrade when you need more games, worksheets, saves, images, and classroom tools.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/upgrade"
              className="inline-flex items-center justify-center rounded-full bg-[#86a96a] px-8 py-4 text-base font-semibold text-white shadow-[0_12px_30px_rgba(134,169,106,0.28)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#7a9b61]"
            >
              Go Premium
            </Link>
            <Link
              href="/upgrade"
              className="inline-flex items-center justify-center rounded-full border border-[#d7ddd1] bg-white px-8 py-4 text-base font-semibold text-[#2f3a2f] shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#fbfbf8]"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-[1760px] px-6 py-12 md:py-16">
        <LandingSectionImage
          path="classendo-images/information/pricing.png"
          alt="Classendo premium monthly and yearly pricing"
          onExpand={setExpandedImage}
        />
      </section>

      <section className="px-6 py-20 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-semibold text-[#2f3a2f] md:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-[#6b756b]">
              Quick answers for teachers getting started with Classendo.
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {LANDING_FAQ_PREVIEW.map((faq) => (
              <article
                key={faq.question}
                className="rounded-3xl border border-[#e5e8de] bg-white p-6 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-[#2f3a2f]">{faq.question}</h3>
                <p className="mt-3 text-sm leading-7 text-[#5c665c]">{faq.answer}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Link
              href="/faq"
              className="inline-flex items-center justify-center rounded-full bg-[#86a96a] px-8 py-4 text-base font-semibold text-white shadow-[0_12px_30px_rgba(134,169,106,0.28)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#7a9b61]"
            >
              View All FAQs
            </Link>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:py-24">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#e5e8de] bg-white px-6 py-10 shadow-[0_16px_40px_rgba(54,64,46,0.08)] md:px-10 md:py-12">
          <h2 className="text-3xl font-semibold text-[#2f3a2f] md:text-4xl">
            Teaching resources designed for modern English classrooms and online lessons
          </h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5c665c]">
            <p>
              Classendo helps teachers create engaging English lessons with flashcards, classroom games, worksheets, lesson plans, printables, interactive classroom activities, and ready-to-use resources for online teaching. Resources are organised into clear vocabulary categories and themes, making it easy to find materials for kindergarten, elementary, middle school, and beginner-to-intermediate English learners.
            </p>
            <p>
              Whether teachers are introducing first vocabulary words, reviewing phonics, practising grammar, building speaking confidence, teaching in person, or leading online English lessons, Classendo provides flexible tools that save preparation time and make learning more engaging.
            </p>
            <p>
              Build one lesson set and use it across flashcards, games, worksheets, printables, classroom presentations, online teaching activities, and lesson planning tools.
            </p>
          </div>
        </div>
      </section>

      <section className="px-6 py-20 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[#2f3a2f] md:text-5xl">
            Ready to build your first lesson?
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#5c665c]">
            Create flashcards, games, worksheets, printables, and lesson plans in minutes.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={primaryCtaHref}
              className="inline-flex items-center justify-center rounded-full bg-[#86a96a] px-8 py-4 text-base font-semibold text-white shadow-[0_12px_30px_rgba(134,169,106,0.28)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#7a9b61]"
            >
              {primaryCtaLabel}
            </Link>
            <Link
              href="/faq"
              className="inline-flex items-center justify-center rounded-full border border-[#d7ddd1] bg-white px-8 py-4 text-base font-semibold text-[#2f3a2f] shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#fbfbf8]"
            >
              View FAQ
            </Link>
          </div>

          <p className="mt-4 text-sm text-[#6b756b]">
            Built for teachers. Simple to use. Ready for class.
          </p>
        </div>
      </section>

      <footer className="border-t border-black/10 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center text-sm text-[#6b756b] md:flex-row md:text-left">
          <p>© 2026 Classendo. Built for teachers.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            {[
              { label: "FAQ", href: "/faq" },
              { label: "Flashcards", href: getPreviewHref(isLoggedIn, "flashcards") },
              { label: "Lesson Plans", href: getPreviewHref(isLoggedIn, "lessons") },
              { label: "Games", href: getPreviewHref(isLoggedIn, "games") },
              { label: "Worksheets", href: getPreviewHref(isLoggedIn, "worksheets") },
              { label: "Printables", href: getPreviewHref(isLoggedIn, "printables") },
              { label: "Community", href: getPreviewHref(isLoggedIn, "community") },
              { label: "Pricing", href: "/upgrade" },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="transition-colors hover:text-[#2f3a2f]">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </>
  );
}
