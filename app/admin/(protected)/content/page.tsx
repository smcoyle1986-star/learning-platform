import {
  AudioLines,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  ImageOff,
  Images,
  Library,
  Search,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import {
  ADMIN_CONTENT_PAGE_SIZE,
  getAdminContentEntries,
  getAdminContentSummary,
  type AdminContentCategory,
  type AdminContentEntry,
} from "@/lib/admin/content";

const CATEGORY_LABELS: Record<AdminContentCategory, string> = {
  noun: "Nouns",
  verb: "Verbs",
  adjective: "Adjectives",
  preposition: "Prepositions",
  phonics: "Phonics",
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function positiveInteger(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function contentHref(params: {
  query?: string;
  category?: string;
  theme?: string;
  report?: string;
  page?: number;
}) {
  const search = new URLSearchParams();
  if (params.query) search.set("q", params.query);
  if (params.category && params.category !== "all") search.set("category", params.category);
  if (params.theme && params.theme !== "all") search.set("theme", params.theme);
  if (params.report && params.report !== "all") search.set("report", params.report);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const suffix = search.toString();
  return suffix ? `/admin/content?${suffix}` : "/admin/content";
}

function metadataSummary(entry: AdminContentEntry) {
  return Object.entries(entry.metadata)
    .filter(([, value]) => typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    .slice(0, 2)
    .map(([key, value]) => `${key.replaceAll("_", " ")}: ${String(value)}`)
    .join(" · ");
}

function Availability({ available, label }: { available: boolean; label: string }) {
  return available ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#557246]">
      <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
      {label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9a6255]">
      <ImageOff aria-hidden="true" className="h-4 w-4" />
      Missing
    </span>
  );
}

export default async function AdminContentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query = first(raw.q).trim();
  const category = first(raw.category) || "all";
  const theme = first(raw.theme) || "all";
  const report = first(raw.report) || "all";
  const requestedPage = positiveInteger(first(raw.page));
  await requireAdmin();
  const [summary, result] = await Promise.all([
    getAdminContentSummary(),
    getAdminContentEntries({ query, category, theme, report, page: requestedPage }),
  ]);
  const totalPages = Math.max(1, Math.ceil(result.total / ADMIN_CONTENT_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const reportCards = [
    {
      label: "Missing images",
      value: summary.missingImages,
      report: "missing_image",
      icon: Images,
      description: "Entries without a vocabulary image reference",
    },
    {
      label: "Missing audio",
      value: summary.missingAudio,
      report: "missing_audio",
      icon: AudioLines,
      description: "Entries awaiting future pronunciation audio",
    },
    {
      label: "Duplicate entries",
      value: summary.duplicateEntries,
      report: "duplicates",
      icon: Copy,
      description: `${summary.duplicateGroups} repeated lemma groups within a category`,
    },
  ];

  return (
    <section className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
      <div className="flex flex-col justify-between gap-5 border-b border-[#dfe4dc] pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#718d63]">
            Library health
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#2f3a2f] sm:text-4xl">
            Content management
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e786d]">
            Search the complete Classendo vocabulary library and identify image,
            audio, duplicate, or worksheet-readiness gaps using live data.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[#dfe4dc] bg-white px-4 py-3 text-sm text-[#697267]">
          <Library aria-hidden="true" className="h-4 w-4 text-[#68805d]" />
          <strong className="text-[#354035]">{summary.totalEntries.toLocaleString()}</strong>
          vocabulary entries
        </div>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {(Object.keys(CATEGORY_LABELS) as AdminContentCategory[]).map((name) => {
          const categorySummary = summary.categories[name];
          return (
            <article key={name} className="rounded-2xl border border-[#dfe4dc] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b8579]">
                {CATEGORY_LABELS[name]}
              </p>
              <p className="mt-2 text-2xl font-semibold text-[#344034]">
                {(categorySummary?.total ?? 0).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-[#818981]">
                {categorySummary?.missingImages ?? 0} missing images
              </p>
            </article>
          );
        })}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {reportCards.map(({ label, value, report: reportName, icon: Icon, description }) => (
          <Link
            key={reportName}
            href={contentHref({ report: reportName })}
            className={`rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md ${report === reportName ? "border-[#8fa883] ring-4 ring-[#edf3e9]" : "border-[#dfe4dc]"}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#3c483c]">{label}</p>
                <p className="mt-1 text-xs leading-5 text-[#798279]">{description}</p>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f0f3ed] text-[#64785b]">
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-4 text-2xl font-semibold text-[#344034]">{value.toLocaleString()}</p>
          </Link>
        ))}
      </div>

      <form
        action="/admin/content"
        className="mt-5 grid gap-3 rounded-2xl border border-[#dfe4dc] bg-white p-4 shadow-[0_10px_28px_rgba(52,65,48,0.04)] lg:grid-cols-[minmax(14rem,1fr)_11rem_13rem_13rem_auto]"
      >
        <label className="relative">
          <span className="sr-only">Search vocabulary</span>
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9288]" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Lemma or theme"
            className="w-full rounded-xl border border-[#d9dfd5] bg-[#fbfcfa] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#88a879] focus:ring-4 focus:ring-[#edf3e9]"
          />
        </label>
        <label>
          <span className="sr-only">Category</span>
          <select name="category" defaultValue={category} className="w-full rounded-xl border border-[#d9dfd5] bg-[#fbfcfa] px-3 py-2.5 text-sm">
            <option value="all">All categories</option>
            {(Object.keys(CATEGORY_LABELS) as AdminContentCategory[]).map((name) => (
              <option key={name} value={name}>{CATEGORY_LABELS[name]}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Theme</span>
          <select name="theme" defaultValue={theme} className="w-full rounded-xl border border-[#d9dfd5] bg-[#fbfcfa] px-3 py-2.5 text-sm">
            <option value="all">All themes</option>
            {summary.themes.map((themeName) => (
              <option key={themeName} value={themeName}>{themeName}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Content report</span>
          <select name="report" defaultValue={report} className="w-full rounded-xl border border-[#d9dfd5] bg-[#fbfcfa] px-3 py-2.5 text-sm">
            <option value="all">All entries</option>
            <option value="missing_image">Missing images</option>
            <option value="missing_audio">Missing audio</option>
            <option value="duplicates">Duplicate entries</option>
            <option value="worksheet_unsupported">Worksheet unsupported</option>
          </select>
        </label>
        <button type="submit" className="btn btn-primary px-5 py-2.5 text-sm">Apply</button>
      </form>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#dfe4dc] bg-white shadow-[0_10px_28px_rgba(52,65,48,0.04)]">
        <div className="flex items-center justify-between border-b border-[#e8ece5] px-5 py-3 text-xs text-[#778075]">
          <span>{result.total.toLocaleString()} matching entries</span>
          {report !== "all" && <Link href="/admin/content" className="font-semibold text-[#5d7752] hover:underline">Clear report</Link>}
        </div>
        {result.entries.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[72rem] border-collapse text-left">
              <thead className="bg-[#f5f7f2] text-xs font-bold uppercase tracking-[0.1em] text-[#778075]">
                <tr>
                  <th className="px-5 py-3.5">Entry</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Themes</th>
                  <th className="px-4 py-3.5">Image</th>
                  <th className="px-4 py-3.5">Audio</th>
                  <th className="px-4 py-3.5">Worksheet</th>
                  <th className="px-5 py-3.5">Duplicate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0ea]">
                {result.entries.map((entry) => (
                  <tr key={`${entry.category}-${entry.id}`} className="transition hover:bg-[#fbfcfa]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-[#eef1eb]">
                          {entry.imagePath ? (
                            <Image src={entry.imagePath} alt="" fill unoptimized className="object-contain" sizes="44px" />
                          ) : (
                            <ImageOff aria-hidden="true" className="absolute inset-0 m-auto h-5 w-5 text-[#9aa198]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-56 truncate text-sm font-semibold text-[#364136]">{entry.lemma}</p>
                          <p className="mt-0.5 max-w-72 truncate text-xs capitalize text-[#858d83]">{metadataSummary(entry) || "No extra metadata"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm capitalize text-[#5f695f]">{entry.category}</td>
                    <td className="px-4 py-4">
                      <div className="flex max-w-72 flex-wrap gap-1.5">
                        {entry.themes.slice(0, 3).map((themeName) => (
                          <span key={themeName} className="rounded-full bg-[#eef1ea] px-2 py-1 text-xs text-[#697269]">{themeName}</span>
                        ))}
                        {!entry.themes.length && <span className="text-xs text-[#929991]">No theme</span>}
                      </div>
                    </td>
                    <td className="px-4 py-4"><Availability available={Boolean(entry.imagePath)} label="Available" /></td>
                    <td className="px-4 py-4"><Availability available={Boolean(entry.audioPath)} label="Available" /></td>
                    <td className="px-4 py-4"><Availability available={entry.worksheetSupported} label="Supported" /></td>
                    <td className="px-5 py-4">
                      {entry.duplicateCount > 1 ? (
                        <span className="rounded-full bg-[#f7e9e4] px-2.5 py-1 text-xs font-semibold text-[#945c50]">{entry.duplicateCount} entries</span>
                      ) : (
                        <span className="text-xs text-[#909790]">Unique</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-64 place-items-center px-6 text-center">
            <div>
              <Search aria-hidden="true" className="mx-auto h-8 w-8 text-[#90998e]" />
              <h2 className="mt-3 font-semibold text-[#3d493d]">No vocabulary entries found</h2>
              <p className="mt-1 text-sm text-[#7a8379]">Try clearing one of the search or report filters.</p>
            </div>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <nav className="mt-5 flex items-center justify-between rounded-2xl border border-[#dfe4dc] bg-white px-4 py-3 text-sm" aria-label="Content result pages">
          <Link
            aria-disabled={page <= 1}
            href={contentHref({ query, category, theme, report, page: Math.max(1, page - 1) })}
            className={`inline-flex items-center gap-1 font-semibold ${page <= 1 ? "pointer-events-none opacity-35" : "text-[#58704e]"}`}
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />Previous
          </Link>
          <span className="text-[#747d73]">Page {page} of {totalPages}</span>
          <Link
            aria-disabled={page >= totalPages}
            href={contentHref({ query, category, theme, report, page: Math.min(totalPages, page + 1) })}
            className={`inline-flex items-center gap-1 font-semibold ${page >= totalPages ? "pointer-events-none opacity-35" : "text-[#58704e]"}`}
          >
            Next<ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </nav>
      )}

      <p className="mt-5 text-xs leading-5 text-[#858d83]">
        Audio availability is derived from audio metadata on each vocabulary record. No vocabulary table currently stores that metadata, so the missing-audio report is the baseline for a future audio pipeline.
      </p>
    </section>
  );
}
