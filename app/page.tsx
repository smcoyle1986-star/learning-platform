import Link from "next/link";

import BrandButton from "@/components/BrandButton";
import LandingCarousel from "@/components/landing/LandingCarousel";
import LandingHomepageSections from "@/components/landing/LandingHomepageSections";
import { LANDING_HERO_DESCRIPTION, LANDING_HERO_TITLE, LANDING_SECTIONS } from "@/lib/landing/content";

const previewSlugs = new Set(["games", "worksheets", "dashboard", "community"]);

function navigationHref(slug: string, href: string) {
  return previewSlugs.has(slug) ? `/preview/${slug}` : href;
}

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#2f3a2f]">
      <header className="mx-auto hidden max-w-7xl items-center justify-between px-6 py-6 md:flex">
        <BrandButton className="text-4xl font-extrabold text-blue-700 transition hover:opacity-80 md:text-5xl" />
        <nav aria-label="Classendo tools" className="flex flex-wrap items-center justify-end gap-2 text-sm">
          {LANDING_SECTIONS.map((section) => (
            <Link
              key={section.slug}
              href={navigationHref(section.slug, section.href)}
              className="btn btn-secondary"
            >
              {section.title}
            </Link>
          ))}
          <Link href="/free-resources" className="btn btn-secondary">Free Lesson Packs</Link>
          <Link href="/topics" className="btn btn-secondary">ESL Topics</Link>
          <Link href="/login" className="btn btn-secondary ml-1">Teacher Login</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 md:gap-12 md:py-24">
        <div>
          <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-[#6d8160]">
            ESL teaching resources for real classrooms
          </p>
          <h1 className="mb-5 max-w-3xl whitespace-pre-line text-4xl font-semibold leading-tight sm:text-5xl md:mb-6">
            {LANDING_HERO_TITLE}
          </h1>
          <p className="mb-7 max-w-xl text-base leading-7 text-[#5c665c] sm:text-lg sm:leading-8 md:mb-8">
            {LANDING_HERO_DESCRIPTION}
          </p>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Link href="/flashcards" className="btn btn-primary px-8 py-4">
              Try Flashcards Free
            </Link>
            <Link href="/login" className="text-sm font-medium underline underline-offset-4">
              Sign in as a Teacher →
            </Link>
          </div>
        </div>

        <LandingCarousel />
      </section>

      <LandingHomepageSections />
    </main>
  );
}
