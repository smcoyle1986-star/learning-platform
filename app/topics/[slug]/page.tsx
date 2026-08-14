import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BrandButton from "@/components/BrandButton";
import { getTopic, TOPICS } from "@/lib/seo/topics";

type TopicPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return TOPICS.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const topic = getTopic((await params).slug);
  if (!topic) return {};
  const path = `/topics/${topic.slug}`;
  const title = `Free Interactive ${topic.shortTitle} Flashcards & ESL Classroom Activities`;
  const description = `Explore free interactive ${topic.shortTitle.toLowerCase()} flashcards and ESL classroom activities for English teachers. Teach visual vocabulary, then reuse the same topic in games, worksheets, printables, and lesson plans.`;
  return { title, description, alternates: { canonical: path }, openGraph: { title, description, url: path, type: "website", siteName: "Classendo" } };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const topic = getTopic((await params).slug);
  if (!topic) notFound();
  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#2f3a2f]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6"><BrandButton className="text-4xl font-extrabold text-blue-700 hover:opacity-80 md:text-5xl" /><Link href="/topics" className="btn btn-secondary">All topics</Link></header>
      <article className="mx-auto max-w-5xl px-6 py-12 md:py-20">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6d8160]">ESL teaching topic</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Free interactive {topic.shortTitle.toLowerCase()} flashcards and ESL classroom activities</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[#5c665c]">{topic.intro} Use these words as free interactive classroom flashcards, then continue with games, printable worksheets, and lesson planning.</p>
        <section className="mt-12 rounded-3xl border border-[#e2e6da] bg-white p-7 shadow-sm md:p-9"><h2 className="text-2xl font-semibold">Vocabulary to practise</h2><div className="mt-5 flex flex-wrap gap-3">{topic.vocabulary.map((word) => <span key={word} className="rounded-full border border-[#d8e6ce] bg-[#f7faf4] px-4 py-2 font-medium">{word}</span>)}</div><Link href="/flashcards" className="mt-7 inline-flex rounded-full bg-[#86a96a] px-6 py-3 font-semibold text-white transition hover:bg-[#7a9b61]">Build free interactive flashcards</Link></section>
        {topic.lessonSteps ? <section className="mt-6 rounded-3xl border border-[#e2e6da] bg-white p-7 shadow-sm md:p-9"><h2 className="text-2xl font-semibold">A simple lesson flow</h2><ol className="mt-5 space-y-4">{topic.lessonSteps.map((step, index) => <li key={step} className="flex gap-4 leading-7 text-[#5c665c]"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eaf2e4] text-sm font-semibold text-[#526849]">{index + 1}</span><span>{step}</span></li>)}</ol>{topic.languageFocus ? <p className="mt-6 rounded-2xl bg-[#f7faf4] p-4 leading-7 text-[#536152]"><span className="font-semibold text-[#2f3a2f]">Useful language: </span>{topic.languageFocus}</p> : null}</section> : null}
        <div className="mt-6 grid gap-6 md:grid-cols-2"><section className="rounded-3xl border border-[#e2e6da] bg-white p-7 shadow-sm"><h2 className="text-2xl font-semibold">Classroom activity idea</h2><p className="mt-4 leading-7 text-[#5c665c]">{topic.classroomIdea}</p><Link href="/games" className="mt-6 inline-block font-semibold text-[#617857]">Explore classroom games →</Link></section><section className="rounded-3xl border border-[#e2e6da] bg-white p-7 shadow-sm"><h2 className="text-2xl font-semibold">Printable follow-up</h2><p className="mt-4 leading-7 text-[#5c665c]">{topic.worksheetIdea}</p><Link href="/worksheets" className="mt-6 inline-block font-semibold text-[#617857]">Create a worksheet →</Link></section></div>
        <section className="mt-10 rounded-3xl bg-[#eaf2e4] p-8"><h2 className="text-2xl font-semibold">Ready to use this topic in class?</h2><p className="mt-3 max-w-2xl leading-7 text-[#536152]">Create a free Classendo account to save lesson sets and use them across flashcards, classroom activities, and printables.</p><Link href="/signup" className="mt-6 inline-flex rounded-full bg-[#86a96a] px-6 py-3 font-semibold text-white transition hover:bg-[#7a9b61]">Start free</Link></section>
      </article>
    </main>
  );
}
