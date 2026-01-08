"use client";

import Link from "next/link";
import NavBar from "@/components/NavBar";
import AIToolsSection from "@/components/AIToolsSection";
import { useFadeInOnScroll } from "@/components/useFadeInOnScroll";

/* ---------------------------
   Feature card data
---------------------------- */
const FEATURE_CARDS = [
  {
    title: "Interactive Flashcards",
    desc: "Clean, fast flashcards with shuffle, full-screen, and difficulty levels.",
    href: "/flashcards",
  },
  {
    title: "Classroom Mode",
    desc: "Teacher-controlled screens for group learning and games.",
    href: "/classroom",
  },
  {
    title: "Printable Resources",
    desc: "Generate printable flashcards and worksheets in one click.",
    href: "/printables",
  },
  {
    title: "Games & Quizzes",
    desc: "Engaging activities that make vocabulary stick.",
    href: "/games",
  },
  {
    title: "Teacher Tools",
    desc: "Track progress, manage word lists, and prepare lessons faster.",
    href: "/classroom",
  },
  {
    title: "AI Tools",
    desc: "Create worksheets and activities instantly with AI.",
    href: "/ai-tools",
  },
];

export default function HomePage() {
  const hero = useFadeInOnScroll();
  const features = useFadeInOnScroll();

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
      {/* Sticky Navigation */}
      <NavBar />

      {/* Hero */}
      <main className="max-w-6xl mx-auto px-6 pt-28 pb-32 text-center">
        <div
          ref={hero.ref}
          className={hero.visible ? "animate-fade-up" : "opacity-0"}
        >
          <h2 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            A smarter way to learn
            <br />
            and teach vocabulary
          </h2>

          <p className="text-lg md:text-xl text-[var(--color-text-muted)] max-w-2xl mx-auto mb-12">
            Interactive flashcards, classroom tools, printable resources,
            games, and quizzes — all in one clean platform.
          </p>
        </div>

        <div className="flex justify-center gap-4 mb-28 animate-fade-up animate-delay-2">
          <Link
            href="/flashcards"
            className="px-8 py-4 rounded-xl bg-[var(--color-primary)] text-white text-lg
            transition-all duration-200 hover:-translate-y-0.5 hover:opacity-90"
          >
            Start Now
          </Link>

          <a
            href="#features"
            className="px-8 py-4 rounded-xl bg-[var(--color-bg-soft)]
            border border-black/10 text-lg hover:bg-white transition"
          >
            View Features
          </a>
        </div>

        {/* Features */}
        <section
          id="features"
          ref={features.ref}
          className={`mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left
          ${features.visible ? "animate-fade-up" : "opacity-0"}`}
        >
          {FEATURE_CARDS.map((item) => (
            <Link key={item.title} href={item.href}>
              <div
                className="cursor-pointer rounded-2xl bg-[var(--color-bg-card)] p-6 shadow-sm
                hover:shadow-xl hover:-translate-y-1
                transition-all duration-300 ease-out"
              >
                <h3 className="text-xl font-semibold mb-2">
                  {item.title}
                </h3>
                <p className="text-[var(--color-text-muted)]">
                  {item.desc}
                </p>
              </div>
            </Link>
          ))}
        </section>

        {/* AI Tools */}
        <AIToolsSection />

        {/* CTA */}
        <section className="mt-40 mb-32 rounded-3xl bg-[var(--color-primary-soft)] px-10 py-20 text-center animate-fade-up">
          <h3 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to build better lessons?
          </h3>

          <p className="text-[var(--color-text-muted)] mb-10 max-w-xl mx-auto">
            Start using ClassBloom today — no clutter, no setup.
          </p>

          <Link
            href="/flashcards"
            className="inline-block px-8 py-4 rounded-xl bg-[var(--color-primary)]
            text-white text-lg transition-all duration-200
            hover:-translate-y-0.5 hover:opacity-90"
          >
            Get Started
          </Link>
        </section>
      </main>
    </div>
  );
}
