import AIToolsSection from "@/components/AIToolsSection";
import { useFadeInOnScroll } from "@/components/useFadeInOnScroll";

export default function HomePage() {
    const hero = useFadeInOnScroll();
  const features = useFadeInOnScroll();

  return (
    <div className="min-h-screen bg-[var(--color-bg-main)] text-[var(--color-text-main)]">
      {/* Header */}
      <header className="flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-blue-700">
          ClassBloom
        </h1>

        <div className="flex items-center gap-4">
          <button className="text-sm hover:underline">
            Log in
          </button>
          <button className="px-5 py-2 rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90 transition">
            Start Now
          </button>
        </div>
      </header>

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
          <button className="px-8 py-4 rounded-xl bg-[var(--color-primary)] text-white text-lg hover:opacity-90 transition">
            Start Now
          </button>
          <button className="px-8 py-4 rounded-xl bg-[var(--color-bg-soft)] border border-black/10 text-lg hover:bg-white transition">
            View Features
          </button>
        </div>

        {/* Feature Cards */}
        <section
  ref={features.ref}
  className={`mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left
  ${features.visible ? "animate-fade-up" : "opacity-0"}`}
>

          {[
            {
              title: "Interactive Flashcards",
              desc: "Clean, fast flashcards with shuffle, full-screen, and levels."
            },
            {
              title: "Classroom Mode",
              desc: "Teacher-controlled screens for group learning and games."
            },
            {
              title: "Printable Resources",
              desc: "Create flashcards and worksheets instantly."
            },
            {
              title: "Games & Quizzes",
              desc: "Fun activities that make vocabulary stick."
            },
            {
              title: "Teacher Tools",
              desc: "Manage word lists and lessons faster."
            },
            {
              title: "Built for ESL",
              desc: "Designed specifically for ESL classrooms."
            }
          ].map((item, i) => (
            <div
  key={item.title}
  className="rounded-2xl bg-[var(--color-bg-card)] p-6 shadow-sm
  hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
>

              <h3 className="text-xl font-semibold mb-3">
                {item.title}
              </h3>
              <p className="text-[var(--color-text-muted)] leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </section>

        {/* AI Tools Section */}
        <AIToolsSection />

        {/* CTA */}
        <section className="mt-40 mb-32 rounded-3xl bg-[var(--color-primary-soft)] px-10 py-20 text-center animate-fade-up">
          <h3 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to build better lessons?
          </h3>
          <p className="text-[var(--color-text-muted)] mb-10 max-w-xl mx-auto">
            Start using ClassBloom today — no clutter, no setup.
          </p>
          <button className="px-5 py-2 rounded-xl bg-[var(--color-primary)] text-white 
transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0">
  Start Now
</button>
        </section>
      </main>
    </div>
  );
}
