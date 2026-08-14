import type { Metadata } from "next";
import Link from "next/link";
import BrandButton from "@/components/BrandButton";
import { TOPICS } from "@/lib/seo/topics";

export const metadata: Metadata = {
  title: "Free Interactive ESL Flashcard Topics & Classroom Activities",
  description: "Browse free interactive ESL flashcard topics for English teachers, with visual vocabulary, classroom activity ideas, worksheets, games, and printable resources.",
  alternates: { canonical: "/topics" },
};

export default function TopicsPage() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#2f3a2f]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <BrandButton className="text-4xl font-extrabold text-blue-700 hover:opacity-80 md:text-5xl" />
        <Link href="/flashcards" className="btn btn-secondary">Open flashcards</Link>
      </header>
      <section className="mx-auto max-w-6xl px-6 py-14 md:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6d8160]">Teaching topics</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight md:text-5xl">Free interactive ESL flashcards and classroom activities by topic</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5c665c]">Choose a classroom topic for ready-to-use visual vocabulary, a practical activity idea, and a simple route into Classendo&apos;s free interactive flashcards, worksheets, games, and printables.</p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((topic) => <Link key={topic.slug} href={`/topics/${topic.slug}`} className="group rounded-3xl border border-[#e2e6da] bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><h2 className="text-xl font-semibold">{topic.shortTitle}</h2><p className="mt-3 text-sm leading-6 text-[#5c665c]">{topic.description}</p><span className="mt-5 inline-block font-semibold text-[#617857]">Explore topic →</span></Link>)}
        </div>
      </section>
    </main>
  );
}
