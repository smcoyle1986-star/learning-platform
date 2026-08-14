"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Home, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { FREE_LESSON_PACKS, type FreeLessonPack } from "@/lib/free-resources/catalog";

type TypeFilter = "all" | FreeLessonPack["type"];

const filters: { value: TypeFilter; label: string }[] = [
  { value: "all", label: "All packs" },
  { value: "noun", label: "Nouns" },
  { value: "verb", label: "Verbs" },
  { value: "adjective", label: "Adjectives" },
  { value: "preposition", label: "Prepositions" },
];

const colours = {
  noun: "border-sky-200 bg-sky-50 text-sky-800",
  verb: "border-emerald-200 bg-emerald-50 text-emerald-800",
  adjective: "border-violet-200 bg-violet-50 text-violet-800",
  preposition: "border-amber-200 bg-amber-50 text-amber-800",
};

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "").trim();
}

function fuzzyMatch(term: string, target: string) {
  if (target.includes(term)) return true;

  let cursor = 0;
  for (const char of target) if (char === term[cursor]) cursor += 1;
  return cursor === term.length;
}

export default function FreeLessonPackDirectory() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [perPage, setPerPage] = useState(9);
  const [page, setPage] = useState(1);

  const results = useMemo(() => {
    const terms = query.split(/\s+/).map(normalise).filter(Boolean);

    return FREE_LESSON_PACKS.filter((pack) => {
      if (filter !== "all" && pack.type !== filter) return false;
      const searchText = normalise(`${pack.title} ${pack.topic} ${pack.type} ${pack.worksheet} ${pack.slug}`);
      return terms.every((term) => fuzzyMatch(term, searchText));
    });
  }, [query, filter]);

  const totalPages = Math.max(1, Math.ceil(results.length / perPage));
  const currentPage = Math.min(page, totalPages);
  const shown = results.slice((currentPage - 1) * perPage, currentPage * perPage);
  const setFilterAndReset = (value: TypeFilter) => {
    setFilter(value);
    setPage(1);
  };
  const setSizeAndReset = (value: number) => {
    setPerPage(value);
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#2f3a2f]">
      <section className="border-b border-violet-200 bg-[#f5efff]">
        <div className="mx-auto max-w-7xl px-6 py-10 md:py-14">
          <div className="flex items-start justify-between gap-5">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-sm font-semibold text-violet-800">
                <BookOpen size={16} /> Free printable resources
              </div>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight md:text-6xl">Free Lesson Packs</h1>
              <p className="mt-5 text-lg leading-8 text-[#5c665c]">
                Browse ready-to-teach beginner ESL packs with six visual cards, a worksheet, movement activity, lesson plan and printable PDF.
              </p>
            </div>
            <Link href="/" className="btn btn-secondary shrink-0 px-4 py-2.5 text-sm">
              <Home size={17} /> Return home
            </Link>
          </div>

          <label className="mt-9 flex max-w-3xl items-center gap-3 rounded-2xl border border-[#d8e6ce] bg-white px-4 py-3 shadow-sm">
            <Search className="text-[#6f9560]" size={21} />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Search packs, topics or vocabulary…"
              className="w-full bg-transparent text-base outline-none placeholder:text-[#879083]"
              aria-label="Search free lesson packs"
            />
          </label>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setFilterAndReset(item.value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${filter === item.value ? "border-[#7fa36a] bg-[#7fa36a] text-white hover:bg-[#6f955b]" : "border-[#d8e6ce] bg-[#fcfcf8] text-[#596456] hover:border-[#9fbc91] hover:bg-white"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-[#596456]">
            Show
            <select
              value={perPage}
              onChange={(event) => setSizeAndReset(Number(event.target.value))}
              className="rounded-full border border-[#d8e6ce] bg-[#fcfcf8] px-3 py-2 text-[#2f3a2f] outline-none"
            >
              <option value={6}>6 packs</option>
              <option value={9}>9 packs</option>
              <option value={12}>12 packs</option>
            </select>
          </label>
        </div>

        <p className="mt-7 text-sm font-medium text-[#6b756b]">
          {results.length} lesson pack{results.length === 1 ? "" : "s"} found
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((pack) => (
            <Link
              key={pack.slug}
              href={`/free-resources/${pack.slug}`}
              className="group rounded-3xl border border-[#d8e6ce] bg-[#fcfcf8] p-6 shadow-[0_10px_30px_rgba(54,64,46,.08)] transition hover:-translate-y-1 hover:border-[#9fbc91] hover:bg-white hover:shadow-[0_16px_34px_rgba(54,64,46,.14)]"
            >
              <div className="flex items-start justify-between gap-4">
                <span className={`rounded-full border px-3 py-1 text-xs font-bold capitalize ${colours[pack.type]}`}>{pack.type}</span>
                <ArrowRight className="text-[#6f9560] transition group-hover:translate-x-1" size={19} />
              </div>
              <h2 className="mt-6 text-xl font-semibold leading-7">{pack.title}</h2>
              <p className="mt-2 text-sm text-[#6b756b]">{pack.topic} · {pack.worksheet}</p>
              <p className="mt-6 text-sm font-semibold text-[#5d854d]">View free pack</p>
            </Link>
          ))}
        </div>

        {shown.length === 0 && (
          <div className="mt-5 rounded-3xl border border-dashed border-[#b8c9af] bg-[#fcfcf8] p-12 text-center text-[#6b756b]">
            <p className="text-lg font-semibold text-[#2f3a2f]">No packs found yet</p>
            <p className="mt-2">Try a broader term, such as “food”, “routine” or “movement”.</p>
          </div>
        )}

        {totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Free lesson pack pages">
            <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="btn btn-secondary disabled:pointer-events-none disabled:opacity-40">
              Previous
            </button>
            <span className="text-sm font-semibold text-[#596456]">Page {currentPage} of {totalPages}</span>
            <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="btn btn-secondary disabled:pointer-events-none disabled:opacity-40">
              Next
            </button>
          </nav>
        )}

        <nav className="sr-only" aria-label="All free lesson packs">
          {FREE_LESSON_PACKS.map((pack) => <Link key={pack.slug} href={`/free-resources/${pack.slug}`}>{pack.title}</Link>)}
        </nav>
      </section>
    </main>
  );
}
