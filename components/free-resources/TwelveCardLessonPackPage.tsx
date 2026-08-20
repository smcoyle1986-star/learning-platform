import Link from "next/link";
import { Check, Download, FileText, Home, MoveRight, Presentation, Printer, Sparkles } from "lucide-react";
import BrandButton from "@/components/BrandButton";
import type { TwelveCardLessonPack } from "@/lib/twelve-card-lesson-packs/catalog";

export default function TwelveCardLessonPackPage({ pack }: { pack: TwelveCardLessonPack }) {
  const included = ["Teacher lesson plan", "12 full-page image-only flashcards", "12 four-per-page image-and-word cards", "Two study worksheets", "Two play worksheets", "Movement and speaking game"];
  const previewImages = pack.previewImages ?? [];
  const seo = pack.seo;

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#2f3a2f]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <BrandButton className="text-3xl font-extrabold text-blue-700 hover:opacity-80 md:text-4xl" />
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-[#52684a] hover:underline"><Home size={16} />Classendo home</Link>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-16 pt-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:pt-16">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.19em] text-[#7a6298]">12 Card Lesson Pack · Free printable ESL resource</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">Free {pack.title} 12 Card Lesson Pack for Beginner ESL</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#596456]">{seo?.intro ?? `A complete, ready-to-teach ${pack.topic.toLowerCase()} lesson with 12 visual cards, four Classendo worksheets, teacher guidance and an active speaking game.`}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {pack.pdfPath && <a href={pack.pdfPath} download className="btn btn-primary px-6 py-3 text-base"><Download size={19} />Download the free PDF</a>}
            <a href="#preview" className="btn btn-secondary px-6 py-3 text-base">See what&apos;s inside</a>
          </div>
          <p className="mt-4 text-sm text-[#6c7669]">No email gate. No sign-up required. {pack.level} · {pack.duration}</p>
        </div>
        <div className="rounded-[2rem] border border-violet-200 bg-[#f2ebfb] p-4 shadow-[0_22px_55px_rgba(93,65,120,.14)]">
          {pack.coverImage ? <img src={pack.coverImage} alt={`Preview of ${pack.title} 12 card beginner ESL lesson pack`} className="mx-auto w-full max-w-[440px] rounded-[1.35rem] shadow-lg" /> : <div className="grid aspect-[2/3] place-items-center rounded-[1.35rem] bg-white p-8 text-center text-[#765d94]"><div><Presentation className="mx-auto" size={38} /><p className="mt-4 text-xl font-semibold">12 Card Lesson Pack</p><p className="mt-2 text-sm">Printable cover preview coming soon</p></div></div>}
        </div>
      </section>

      <section className="border-y border-violet-100 bg-white"><div className="mx-auto grid max-w-7xl gap-5 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">{["24-page printable PDF", pack.level, pack.duration, "12 visual vocabulary cards"].map((item) => <div key={item} className="flex items-center gap-3 text-sm font-semibold"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#f0e9f9] text-[#7a6298]"><Check size={16} /></span>{item}</div>)}</div></section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <p className="text-sm font-bold uppercase tracking-[.19em] text-[#7a6298]">What&apos;s inside</p>
        <h2 className="mt-3 text-3xl font-semibold">A complete beginner lesson, ready to print</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{included.map((item) => <div key={item} className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm"><Check className="text-[#7a6298]" size={20} /><p className="mt-3 font-semibold">{item}</p></div>)}</div>
      </section>

      <section id="preview" className="bg-[#f0eafa] py-16"><div className="mx-auto max-w-7xl px-6"><p className="text-sm font-bold uppercase tracking-[.19em] text-[#7a6298]">Pack preview</p><h2 className="mt-3 text-3xl font-semibold">Visual materials with clear teacher guidance</h2>{previewImages.length > 0 ? <div className="mt-8 grid gap-6 md:grid-cols-3">{previewImages.map((image, index) => <img key={image} src={image} alt={`${pack.title} printable preview ${index + 1}`} className="w-full rounded-3xl border border-violet-200 bg-white shadow-md" />)}</div> : <div className="mt-8 rounded-3xl border border-dashed border-violet-300 bg-white/70 p-8 text-[#655c70]">Preview pages will appear here when this pack&apos;s printable assets are complete.</div>}</div></section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[.82fr_1.18fr]">
        <div><p className="text-sm font-bold uppercase tracking-[.19em] text-[#7a6298]">Target language</p><h2 className="mt-3 text-3xl font-semibold">Twelve useful {pack.topic.toLowerCase()} words</h2><p className="mt-4 leading-7 text-[#5c665c]">{seo?.targetLanguage ? `Model and practise: “${seo.targetLanguage}”` : "Use the full-page cards for presentation and the smaller image-and-word cards for pair practice, games and review."}</p></div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{pack.words.map((word) => <div key={word} className="rounded-2xl border border-violet-100 bg-white p-4 text-center font-semibold shadow-sm">{word}</div>)}</div>
      </section>

      <section className="bg-white py-16"><div className="mx-auto max-w-7xl px-6"><p className="text-sm font-bold uppercase tracking-[.19em] text-[#7a6298]">Teach it step by step</p><h2 className="mt-3 text-3xl font-semibold">A flexible lesson flow for beginner learners</h2><ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">{pack.lessonSteps.map((step, index) => <li key={step} className="rounded-2xl border border-violet-100 bg-[#fcfbff] p-5"><span className="text-sm font-bold text-[#7a6298]">{index + 1}</span><p className="mt-3 text-sm leading-6 text-[#4f5750]">{step}</p></li>)}</ol></div></section>

      <section className="mx-auto max-w-7xl px-6 py-16"><div className="grid gap-6 lg:grid-cols-2"><WorksheetPanel title="Study worksheets" icon={FileText} worksheets={pack.studyWorksheets} /><WorksheetPanel title="Play worksheets" icon={Printer} worksheets={pack.playWorksheets} /></div><div className="mt-6 rounded-3xl border border-violet-200 bg-[#f2ebfb] p-7"><div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white text-[#7a6298]"><Sparkles size={22} /></span><div><p className="font-semibold">Movement game: {pack.movementGame.title}</p><p className="mt-2 max-w-3xl leading-7 text-[#5d5368]">{pack.movementGame.description}</p></div></div></div></section>

      <section className="bg-[#edf4e9] py-16"><div className="mx-auto max-w-5xl px-6 text-center"><p className="text-sm font-bold uppercase tracking-[.19em] text-[#6f9560]">More free resources at Classendo</p><h2 className="mt-3 text-3xl font-semibold">Keep building confident beginner English lessons</h2><p className="mx-auto mt-4 max-w-2xl leading-7 text-[#536152]">Find more free printable and interactive ESL resources at Classendo. This 12 Card Lesson Pack is designed to work as a complete printable lesson on its own.</p><Link href="/" className="btn btn-primary mt-7 px-7 py-3">Visit Classendo.com <MoveRight size={18} /></Link></div></section>

      {pack.pdfPath && <section className="mx-auto max-w-4xl px-6 py-16 text-center"><a href={pack.pdfPath} download className="btn btn-primary px-7 py-3"><Download size={19} />Download the free PDF</a></section>}
    </main>
  );
}

function WorksheetPanel({ title, icon: Icon, worksheets }: { title: string; icon: typeof FileText; worksheets: { title: string; description: string }[] }) {
  return <div className="rounded-3xl border border-violet-100 bg-white p-7 shadow-sm"><Icon className="text-[#7a6298]" size={24} /><h3 className="mt-4 text-2xl font-semibold">{title}</h3><div className="mt-5 space-y-4">{worksheets.map((worksheet) => <div key={worksheet.title} className="rounded-2xl bg-[#fcfbff] p-4"><p className="font-semibold">{worksheet.title}</p><p className="mt-1 text-sm leading-6 text-[#5c5962]">{worksheet.description}</p></div>)}</div></div>;
}
