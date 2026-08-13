import Link from "next/link";

import { TOPICS } from "@/lib/seo/topics";

type Tool = "games" | "worksheets" | "community";

const toolContent = {
  games: {
    eyebrow: "Classendo for ESL teachers",
    title: "Vocabulary games for lively ESL lessons",
    description: "Turn a small set of visual vocabulary cards into a quick, teacher-led classroom game. Build a lesson set first, then choose an activity that suits your class.",
    benefits: [
      ["Image Reveal", "Reveal a picture gradually while learners guess the word."],
      ["Memory Flip", "Match visual vocabulary cards for a focused review activity."],
      ["Spin and Speak", "Use a simple prompt to get learners speaking and moving."],
    ],
  },
  worksheets: {
    eyebrow: "Classendo for ESL teachers",
    title: "Make vocabulary worksheets from your lesson cards",
    description: "Choose vocabulary in Flashcards, then turn the same set into a classroom worksheet. Classendo helps you prepare matching, word-search, reading, writing, and other practice activities without rebuilding the content.",
    benefits: [
      ["One shared lesson set", "Keep the vocabulary consistent from introduction to follow-up practice."],
      ["Flexible activities", "Choose an activity that works for your learners and the time available."],
      ["Ready to print", "Preview, save, and export resources when your worksheet is ready."],
    ],
  },
  community: {
    eyebrow: "Classendo teacher community",
    title: "Share and reuse ESL teaching resources",
    description: "Classendo Community is a library of teacher-made lesson sets and worksheets. Sign in to browse resources, preview a useful idea, and copy it to your own dashboard for adapting in class.",
    benefits: [
      ["Lesson sets", "Find visual vocabulary collections prepared by other teachers."],
      ["Worksheets", "Explore classroom practice activities that can be adapted for your group."],
      ["Your dashboard", "Save a useful resource, then make it your own before teaching."],
    ],
  },
} as const;

export function PublicToolLanding({ tool }: { tool: Tool }) {
  const content = toolContent[tool];
  const nextPath = tool === "community" ? "/teacher/community" : `/${tool}`;
  const primaryLabel = tool === "community" ? "Explore Community" : `Open ${tool === "games" ? "Games" : "Worksheet Maker"}`;

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-[#f7f6f2] px-6 py-14 text-[#2f3a2f]">
      <section className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6d8160]">{content.eyebrow}</p>
        <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight md:text-5xl">{content.title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#5c665c]">{content.description}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/signup?next=${encodeURIComponent(nextPath)}`} className="btn btn-primary px-5 py-3">Create a free account</Link>
          <Link href="/flashcards" className="btn btn-secondary px-5 py-3">Build a flashcard set first</Link>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {content.benefits.map(([title, detail]) => (
            <article key={title} className="rounded-3xl border border-[#e2e6da] bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#5c665c]">{detail}</p>
            </article>
          ))}
        </div>

        <section className="mt-14 border-t border-[#e2e6da] pt-10" aria-labelledby="topic-links-heading">
          <h2 id="topic-links-heading" className="text-2xl font-semibold">Start with an ESL vocabulary topic</h2>
          <p className="mt-3 max-w-3xl leading-7 text-[#5c665c]">Each topic includes useful vocabulary and a practical classroom activity idea. Open a topic, then use its vocabulary to build a lesson in Classendo.</p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TOPICS.map((topic) => (
              <li key={topic.slug}>
                <Link href={`/topics/${topic.slug}`} className="block rounded-2xl border border-[#e2e6da] bg-white px-5 py-4 font-semibold transition hover:border-[#bdc9b5] hover:shadow-sm">
                  {topic.shortTitle} ESL activities
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-10 text-sm text-[#5c665c]">Already have an account? <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-[#506a47] underline underline-offset-4">Log in to {primaryLabel.toLowerCase()}</Link>.</p>
      </section>
    </main>
  );
}

export function FlashcardsSearchGuide() {
  return (
    <section className="border-t border-[#dce6d5] bg-[#f7f6f2] px-6 py-14 text-[#2f3a2f]" aria-labelledby="flashcard-guide-heading">
      <div className="mx-auto max-w-6xl">
        <h2 id="flashcard-guide-heading" className="text-3xl font-semibold tracking-tight">Find ESL vocabulary flashcards by topic</h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[#5c665c]">Classendo&apos;s illustrated flashcards help teachers introduce and practise beginner English vocabulary. Search for a word or choose a topic, collect the cards you need, then reuse the same set in classroom activities, printables, lesson plans, and games.</p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOPICS.map((topic) => (
            <li key={topic.slug}>
              <Link href={`/topics/${topic.slug}`} className="block rounded-2xl border border-[#e2e6da] bg-white px-5 py-4 transition hover:border-[#bdc9b5] hover:shadow-sm">
                <h3 className="font-semibold">{topic.shortTitle} flashcards</h3>
                <p className="mt-1 text-sm leading-6 text-[#5c665c]">{topic.vocabulary.join(", ")}</p>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm leading-6 text-[#5c665c]">Looking for ready-made teaching materials? Browse <Link href="/free-resources" className="font-semibold text-[#506a47] underline underline-offset-4">free ESL lesson packs</Link>.</p>
      </div>
    </section>
  );
}
