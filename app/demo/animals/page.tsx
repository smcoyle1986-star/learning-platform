import Link from "next/link";
import { ArrowRight, Presentation, Trophy, Target } from "lucide-react";
import { ANIMALS_DEMO_CARDS } from "@/lib/demo/animals";

export default function AnimalsDemoPage() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] px-4 py-10 text-[#2f3a2f] sm:px-6 sm:py-16">
      <section className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-[#d8e5d1] bg-white shadow-[0_28px_90px_rgba(55,80,47,0.13)]">
        <div className="grid gap-10 p-7 sm:p-10 lg:grid-cols-[1.05fr_.95fr] lg:p-14">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-[#6c9260]">No account needed</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Teach an Animals lesson in four quick steps.</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#5d695b]">See how one set of classroom cards becomes a full-screen lesson, a game, and a printable activity. This is a separate demo, so your own lesson tray stays untouched.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/demo/animals/classroom" className="btn btn-primary px-6 py-3.5 text-base"><Presentation size={19} /> Start the Animals Demo <ArrowRight size={18} /></Link>
              <Link href="/" className="btn btn-secondary bg-white px-6 py-3.5 text-base">Back to home</Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#dbe8d5] bg-[#eff6eb] p-5 sm:p-7">
            <p className="text-sm font-bold text-[#4d6744]">Your demo lesson</p>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {ANIMALS_DEMO_CARDS.map((card) => (
                <div key={card.id} className="overflow-hidden rounded-2xl border border-white bg-white p-2 text-center shadow-sm">
                  <img src={card.image ?? ""} alt="" className="h-16 w-full object-contain sm:h-20" />
                  <p className="mt-1 truncate text-xs font-bold capitalize">{card.word}</p>
                </div>
              ))}
            </div>
            <ol className="mt-7 space-y-3 text-sm font-semibold text-[#40503d]">
              <li className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[#6a915a] shadow-sm">1</span>Present the animal cards in Classroom Mode</li>
              <li className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[#6a915a] shadow-sm">2</span><Trophy size={17} /> Play Connect Four together</li>
              <li className="flex items-center gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-[#6a915a] shadow-sm">3</span><Target size={17} /> Preview an Animals Bullseye worksheet</li>
            </ol>
          </div>
        </div>
      </section>
    </main>
  );
}
