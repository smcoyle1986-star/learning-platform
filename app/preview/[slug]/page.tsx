import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import BrandButton from "@/components/BrandButton";
import { LANDING_SECTIONS } from "@/lib/landing/content";

type PreviewPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PreviewPage({ params }: PreviewPageProps) {
  const { slug } = await params;

  if (slug === "flashcards" || slug === "printables") {
    redirect(`/${slug}`);
  }

  const section = LANDING_SECTIONS.find((item) => item.slug === slug);

  if (!section) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#2f3a2f]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <BrandButton className="text-4xl font-extrabold text-blue-700 hover:opacity-80 md:text-5xl" />
        <Link href="/" className="btn btn-secondary">
          Back to home
        </Link>
      </header>

      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 py-16 text-center">
        <div className="mb-4 inline-flex rounded-full border border-[#dfe5d4] bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#6f7a6f] shadow-sm">
          Preview
        </div>

        <h1 className="text-4xl font-semibold leading-tight text-[#2f3a2f] md:text-5xl">
          {section.title}
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-[#5c665c]">
          {section.previewLead}
        </p>

        <p className="mt-3 max-w-3xl text-base leading-7 text-[#6b756b]">
          {section.description}
        </p>

        <div className="mt-12 w-full max-w-3xl rounded-[2rem] border border-[#e3e7db] bg-white p-8 shadow-[0_20px_40px_rgba(54,64,46,0.08)]">
          <div className="mx-auto flex max-w-xl flex-col items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-full bg-[#86a96a] px-8 py-5 text-lg font-semibold text-white shadow-[0_12px_30px_rgba(134,169,106,0.28)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#7a9b61] sm:w-auto sm:min-w-[240px]"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex w-full items-center justify-center rounded-full border border-[#d7ddd1] bg-white px-8 py-4 text-base font-semibold text-[#2f3a2f] shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#fbfbf8] sm:w-auto sm:min-w-[220px]"
            >
              Sign up
            </Link>
          </div>
        </div>

        <div className="mt-12 grid w-full gap-4 text-left md:grid-cols-3">
          {section.previewBullets.map((bullet) => (
            <div
              key={bullet}
              className="rounded-2xl border border-[#e6eadf] bg-white px-5 py-4 text-sm leading-6 text-[#5c665c] shadow-sm"
            >
              {bullet}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
