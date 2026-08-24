import Link from "next/link";

import LandingCarousel from "@/components/landing/LandingCarousel";
import LandingHomepageSections from "@/components/landing/LandingHomepageSections";
import { LANDING_HERO_DESCRIPTION, LANDING_HERO_TITLE } from "@/lib/landing/content";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#2f3a2f]">
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
