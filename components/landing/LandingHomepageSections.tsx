import Link from "next/link";

import { LandingSectionImage } from "@/components/landing/LandingSectionImage";
import { LANDING_FAQ_PREVIEW } from "@/lib/landing/faq";

const featureLinks = [
  ["Flashcards", "/flashcards", "Choose visual vocabulary and build a focused lesson set."],
  ["Classroom Mode", "/flashcards/classroom", "Present classroom flashcards full screen and teach from the same set."],
  ["ESL games", "/games", "Turn your vocabulary flashcards into whole-class games."],
  ["ESL worksheets", "/worksheets", "Create printable vocabulary practice from the cards you already chose."],
  ["Printable teaching materials", "/printables", "Make classroom-ready card sheets and handouts."],
  ["Lesson plans", "/lessons", "Plan a clear classroom flow using the same lesson set."],
] as const;

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#6d8160]">{children}</p>;
}

export default function LandingHomepageSections() {
  return (
    <>
      <section className="mx-auto grid max-w-[1760px] items-center gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[0.82fr_1.18fr] lg:gap-14">
        <div className="max-w-2xl">
          <SectionEyebrow>One lesson, many teaching tools</SectionEyebrow>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Build once. Teach in different ways.</h2>
          <p className="mt-5 text-base leading-8 text-[#5c665c]">
            Choose vocabulary from Classendo&apos;s visual flashcard library, then reuse the same lesson set for classroom flashcards, ESL games, worksheets, printables, and lesson plans.
          </p>
          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {featureLinks.map(([title, href, copy]) => (
              <li key={title}>
                <Link href={href} className="block rounded-2xl border border-[#dfe6d9] bg-white px-4 py-3 text-sm transition hover:border-[#b8cba9] hover:shadow-sm">
                  <span className="block font-semibold text-[#364336]">{title}</span>
                  <span className="mt-1 block leading-5 text-[#687268]">{copy}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <LandingSectionImage path="classendo-images/information/resources.png" alt="Classendo teaching resources across flashcards, games, worksheets, printables and lesson plans" />
      </section>

      <section className="bg-white/70 py-12 md:py-16">
        <div className="mx-auto grid max-w-[1760px] items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.18fr_0.82fr] lg:gap-14">
          <div className="order-2 max-w-2xl lg:order-1">
            <SectionEyebrow>How Classendo works</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">From vocabulary to a ready-to-teach lesson</h2>
            <ol className="mt-7 space-y-4">
              {[
                ["Build a lesson tray", "Search classroom vocabulary flashcards by word, theme, or grammar."],
                ["Choose an activity", "Open the same cards in Classroom Mode, games, worksheets, printables, or a lesson plan."],
                ["Save and reuse", "Free accounts can keep lesson sets organised; Premium expands the tools and limits available."],
              ].map(([title, copy], index) => (
                <li key={title} className="flex gap-4 rounded-2xl border border-[#e3e9dd] bg-[#fbfcf9] p-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#dbe8d2] text-sm font-bold text-[#557249]">{index + 1}</span>
                  <div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm leading-6 text-[#5c665c]">{copy}</p></div>
                </li>
              ))}
            </ol>
          </div>
          <div className="order-1 lg:order-2">
            <LandingSectionImage path="classendo-images/information/flowchart_my_lessons_v2.png" alt="The Classendo flow from vocabulary flashcards to classroom activities" />
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto grid max-w-[1760px] items-center gap-10 px-4 py-12 sm:px-6 md:py-16 lg:grid-cols-[0.82fr_1.18fr] lg:gap-14">
        <div className="max-w-2xl">
          <SectionEyebrow>Plans for growing classrooms</SectionEyebrow>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Start free. Upgrade when you need more.</h2>
          <p className="mt-5 text-base leading-8 text-[#5c665c]">
            The Free plan includes visual flashcards, Classroom Mode, lesson planning, printables, one rotating game, one rotating worksheet, and up to six saved lessons. Premium unlocks the full library and unlimited saving.
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <article className="rounded-3xl border border-[#dfe6d9] bg-white p-5 shadow-sm">
              <h3 className="text-xl font-semibold">Free</h3>
              <p className="mt-2 text-sm leading-6 text-[#5c665c]">Use core teaching tools at no cost. Creating an account lets you save up to six lessons.</p>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-[#566056]"><li>Flashcards, Classroom Mode, printables, and lesson plans</li><li>One rotating game and one rotating worksheet</li><li>Up to six saved lessons with a free account</li></ul>
              <Link href="/flashcards" className="btn btn-secondary mt-5 w-full px-4 py-3 text-center">Explore Free</Link>
            </article>
            <article className="rounded-3xl border border-[#e7ca90] bg-[#fffaf0] p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9a681e]">Premium</p>
              <h3 className="mt-2 text-xl font-semibold">More ways to teach</h3>
              <p className="mt-2 text-sm leading-6 text-[#5c665c]">Monthly and yearly Premium plans with a 14-day welcome trial after email confirmation.</p>
              <ul className="mt-4 space-y-2 text-sm leading-6 text-[#566056]"><li>Expanded games, worksheets, and tools</li><li>More saved and reusable resources</li><li>Premium image and classroom features</li></ul>
              <Link href="/upgrade" className="btn btn-primary mt-5 w-full px-4 py-3 text-center">View Premium pricing</Link>
            </article>
          </div>
        </div>
        <LandingSectionImage path="classendo-images/information/free_vs_premium_my_lessons_v2.png" alt="Classendo Free and Premium teaching plan comparison" />
      </section>

      <section className="mx-auto max-w-[1760px] px-4 pb-12 sm:px-6 md:pb-16">
        <LandingSectionImage path="classendo-images/information/pricing_my_lessons_v2.png" alt="Classendo Premium monthly and yearly plan visual" />
      </section>

      <section className="bg-[#eef4ea] px-4 py-14 sm:px-6 md:py-18">
        <div className="mx-auto grid max-w-6xl gap-8 rounded-[2rem] border border-[#d9e5d3] bg-white p-7 shadow-sm md:grid-cols-[1.2fr_0.8fr] md:p-10">
          <div>
            <SectionEyebrow>Built around your lesson</SectionEyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Make the tools fit your classroom.</h2>
            <p className="mt-5 max-w-2xl text-base leading-8 text-[#5c665c]">Choose the words and images that suit your learners, then carry the same set into presentation, practice, games, worksheets, and printables. Classendo is designed to help teachers adapt a lesson rather than start from a fixed sequence.</p>
          </div>
          <aside className="rounded-3xl border border-[#dfe8da] bg-[#f7faf4] p-6">
            <h3 className="text-xl font-semibold">Help us keep it clear</h3>
            <p className="mt-3 text-sm leading-7 text-[#5c665c]">Spot an unclear image, wording issue, or classroom problem? Signed-in teachers can send feedback from inside Classendo so we can review it in context.</p>
            <Link href="/feedback" className="btn btn-secondary mt-5 px-5 py-3">Send feedback</Link>
          </aside>
        </div>
      </section>

      <section className="bg-white/70 px-4 py-14 sm:px-6 md:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="text-center"><SectionEyebrow>Questions from teachers</SectionEyebrow><h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Frequently asked questions</h2><p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-[#6b756b]">Quick answers for teachers getting started with Classendo.</p></div>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {LANDING_FAQ_PREVIEW.map((faq) => <article key={faq.question} className="rounded-3xl border border-[#e5e8de] bg-white p-6 shadow-sm"><h3 className="text-lg font-semibold">{faq.question}</h3><p className="mt-3 text-sm leading-7 text-[#5c665c]">{faq.answer}</p></article>)}
          </div>
          <div className="mt-8 flex justify-center"><Link href="/faq" className="btn btn-secondary px-7 py-3">View all FAQs</Link></div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 md:py-20">
        <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#e5e8de] bg-white px-6 py-10 shadow-[0_16px_40px_rgba(54,64,46,0.08)] md:px-10 md:py-12">
          <SectionEyebrow>Made for English teachers</SectionEyebrow>
          <h2 className="mt-3 text-3xl font-semibold sm:text-4xl">Teaching resources for modern English classrooms and online lessons</h2>
          <div className="mt-6 space-y-5 text-base leading-8 text-[#5c665c]">
            <p>Classendo helps ESL teachers build adaptable English lessons with vocabulary flashcards, classroom games, ESL worksheets, printable teaching materials, lesson plans, interactive classroom activities, and ready-to-use resources for online teaching.</p>
            <p>Whether you are introducing first vocabulary words, reviewing phonics, practising grammar, building speaking confidence, teaching in person, or leading online English lessons, Classendo provides flexible tools that save preparation time and make learning more engaging.</p>
          </div>
        </div>
      </section>

      <section className="px-4 pb-16 pt-4 text-center sm:px-6 md:pb-24">
        <div className="mx-auto max-w-4xl"><h2 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">Ready to build your first lesson?</h2><p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-[#5c665c]">Create flashcards, games, worksheets, printables, and lesson plans in minutes.</p><div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"><Link href="/flashcards" className="btn btn-primary px-8 py-4">Try Flashcards Free</Link><Link href="/signup?next=%2Fflashcards" className="btn btn-secondary px-8 py-4">Create a free account</Link></div><p className="mt-4 text-sm text-[#6b756b]">Built for teachers. Simple to use. Ready for class.</p></div>
      </section>
    </>
  );
}
