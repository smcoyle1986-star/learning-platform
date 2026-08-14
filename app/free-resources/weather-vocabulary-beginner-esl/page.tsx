import { createFreeResourceMetadata } from "@/lib/seo/free-resource-metadata";
import Link from "next/link";
import { Check, Download, ExternalLink, FileText, Presentation, Printer, Sparkles } from "lucide-react";
import BrandButton from "@/components/BrandButton";
import WeatherClassroomButton from "@/components/free-resources/WeatherClassroomButton";

const slug = "weather-vocabulary-beginner-esl";
const path = `/free-resources/${slug}`;
const asset = "/resources/weather-vocabulary-beginner-esl";
const cards = ["sunny", "cloudy", "raining", "snowing", "windy", "stormy"];

export const metadata = createFreeResourceMetadata({ slug, title: "Weather Vocabulary" });

const featureLinks = [
  { title: "Flashcards", href: "/flashcards?from=free-resource", icon: Sparkles, copy: "Choose up to six free cards for a temporary lesson in this browser." },
  { title: "Classroom", href: "/flashcards/classroom", icon: Presentation, copy: "Present your selected cards in Classroom Mode." },
  { title: "Lesson Plans", href: "/lessons", icon: FileText, copy: "Build and export a guest plan from selected cards." },
  { title: "Printables", href: "/printables", icon: Printer, copy: "Print the default layout from a temporary six-card lesson." },
];

export default function WeatherVocabularyFreeResourcePage() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#2f3a2f]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <BrandButton className="text-3xl font-extrabold text-blue-700 hover:opacity-80 md:text-4xl" />
        <Link href="/flashcards?from=free-resource" className="text-sm font-semibold text-[#52684a] hover:underline">Explore Flashcards</Link>
      </header>
      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-16 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pt-16">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.19em] text-[#6f9560]">Free printable ESL resource</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">Weather Vocabulary - Beginner ESL</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#596456]">A complete six-word weather lesson for beginner English learners. Print it, teach it, and use it with no account required.</p>
          <div className="mt-8 flex flex-wrap gap-3"><a href="/free-resources/weather-vocabulary-beginner-esl.pdf" download className="btn btn-primary px-6 py-3 text-base"><Download size={19} />Download the free PDF</a><a href="#preview" className="btn btn-secondary px-6 py-3 text-base">Preview the pack</a></div>
          <p className="mt-4 text-sm text-[#6c7669]">No email gate. No sign-up required. 10 printable pages.</p>
          <WeatherClassroomButton />
        </div>
        <div className="rounded-[2rem] border border-[#d7e4cf] bg-[#eaf3e5] p-4 shadow-[0_22px_55px_rgba(72,96,62,0.14)]"><img src={`${asset}/weather-vocabulary-full-pack-pinterest.png`} alt="Preview of the Weather Vocabulary beginner ESL pack" className="mx-auto w-full max-w-[440px] rounded-[1.35rem] shadow-lg" /></div>
      </section>
      <section className="border-y border-[#e2e8dd] bg-white"><div className="mx-auto grid max-w-7xl gap-5 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">{["10-page printable PDF", "A0-A1 beginner ESL", "35-40 minute lesson", "Six Classendo visual cards"].map((item) => <div key={item} className="flex items-center gap-3 text-sm font-semibold"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#eaf3e5] text-[#598049]"><Check size={16} /></span>{item}</div>)}</div></section>
      <section className="mx-auto max-w-7xl px-6 py-16"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.19em] text-[#6f9560]">Ready to teach</p><h2 className="mt-3 text-3xl font-semibold">Everything you need for one focused weather lesson</h2></div><div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{["Teacher overview with clear objectives", "Six large printable visual flashcards", "Picture-led Weather Wordsearch", "Weather Crossword", "Weather Tic-Tac-Toe speaking game", "38-minute lesson plan and answer key"].map((item) => <div key={item} className="rounded-2xl border border-[#e1e8dc] bg-white p-5 shadow-sm"><Check className="text-[#6f9560]" size={20} /><p className="mt-3 font-semibold">{item}</p></div>)}</div></section>
      <section id="preview" className="bg-[#edf4e9] py-16"><div className="mx-auto max-w-7xl px-6"><p className="text-sm font-bold uppercase tracking-[0.19em] text-[#6f9560]">Pack preview</p><h2 className="mt-3 text-3xl font-semibold">Print-friendly, visual and simple to use</h2><div className="mt-8 grid gap-6 md:grid-cols-3"><img src={`${asset}/weather-vocabulary-full-pack-pinterest.png`} alt="Weather vocabulary lesson pack cover preview" className="w-full rounded-3xl border border-[#d2e0ca] bg-white shadow-md" /><img src={`${asset}/weather-vocabulary-wordsearch-pinterest.png`} alt="Weather Wordsearch preview" className="w-full rounded-3xl border border-[#d2e0ca] bg-white shadow-md" /><img src={`${asset}/weather-vocabulary-tic-tac-toe-pinterest.png`} alt="Weather Tic-Tac-Toe preview" className="w-full rounded-3xl border border-[#d2e0ca] bg-white shadow-md" /></div></div></section>
      <section className="mx-auto max-w-7xl px-6 py-16"><div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]"><div><p className="text-sm font-bold uppercase tracking-[0.19em] text-[#6f9560]">Vocabulary</p><h2 className="mt-3 text-3xl font-semibold">Six essential weather words</h2><p className="mt-4 leading-7 text-[#5c665c]">The pack deliberately uses six cards so it matches Classendo&apos;s signed-out visitor experience and keeps the lesson manageable for beginners.</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{cards.map((word) => <div key={word} className="rounded-2xl border border-[#dce8d5] bg-white p-3 text-center shadow-sm"><img src={`${asset}/${word}.png`} alt={word} className="mx-auto h-28 w-full object-contain" /><p className="mt-2 font-semibold capitalize">{word}</p></div>)}</div></div></section>
      <section className="bg-white py-16"><div className="mx-auto max-w-7xl px-6"><div className="max-w-2xl"><p className="text-sm font-bold uppercase tracking-[0.19em] text-[#6f9560]">Optional interactive extension</p><h2 className="mt-3 text-3xl font-semibold">Continue with the same six cards online</h2><p className="mt-4 leading-7 text-[#5c665c]">The PDF is complete on its own. If you would like an interactive follow-up, these Classendo tools are available to visitors before sign-in.</p></div><div className="mt-8 grid gap-4 md:grid-cols-2">{featureLinks.map(({ title, href, icon: Icon, copy }) => <Link key={title} href={href} className="group rounded-3xl border border-[#e1e8dc] bg-[#fbfcfa] p-6 transition hover:-translate-y-0.5 hover:border-[#bdd2b2] hover:shadow-md"><Icon className="text-[#6f9560]" size={24} /><h3 className="mt-4 flex items-center gap-2 text-xl font-semibold">{title}<ExternalLink size={15} className="opacity-55" /></h3><p className="mt-2 text-sm leading-6 text-[#5c665c]">{copy}</p></Link>)}</div><div className="mt-8 rounded-3xl bg-[#eaf3e5] p-7"><h3 className="text-xl font-semibold">Want to save and revisit your lessons?</h3><p className="mt-2 max-w-2xl leading-7 text-[#536152]">Creating an account is optional. Use it when you are ready to save your lesson sets for later.</p><Link href={`/signup?next=${encodeURIComponent("/flashcards")}`} className="btn btn-primary mt-5 px-6 py-3">Create your free account</Link></div></div></section>
      <section className="mx-auto max-w-4xl px-6 py-16"><p className="text-sm font-bold uppercase tracking-[0.19em] text-[#6f9560]">Questions</p><h2 className="mt-3 text-3xl font-semibold">Quick answers</h2><div className="mt-7 space-y-4">{[["Is the PDF free?", "Yes. Download it directly without an account or email sign-up."], ["Do I need a Classendo account?", "No. The complete printable lesson works independently."], ["What level is it for?", "It is designed for A0-A1 beginner learners, especially young learners."], ["Can I use it in class?", "Yes. It is designed for practical classroom teaching, pair work and speaking practice."]].map(([question, answer]) => <details key={question} className="rounded-2xl border border-[#e0e7dc] bg-white p-5"><summary className="cursor-pointer font-semibold">{question}</summary><p className="mt-3 leading-7 text-[#5c665c]">{answer}</p></details>)}</div><div className="mt-10 text-center"><a href="/free-resources/weather-vocabulary-beginner-esl.pdf" download className="btn btn-primary px-7 py-3"><Download size={19} />Download the free PDF</a></div></section>
    </main>
  );
}
