"use client";

import { Search } from "lucide-react";

import { WORKSHEET_TYPES, type WorksheetType } from "@/lib/worksheets/types";
import type { CommunityContentType } from "@/lib/community/types";

const CONTENT_FILTERS: Array<{ value: CommunityContentType | "all"; label: string }> = [
  { value: "all", label: "All content" },
  { value: "noun", label: "Nouns" },
  { value: "verb", label: "Verbs" },
  { value: "adjective", label: "Adjectives" },
  { value: "preposition", label: "Prepositions" },
  { value: "phonics", label: "Phonics" },
];

type Props = {
  query: string;
  sort: "popular" | "newest";
  totalCount: number | null;
  pageSize: number;
  worksheetType: WorksheetType | "all";
  contentType: CommunityContentType | "all";
  onQueryChange: (value: string) => void;
  onSortChange: (value: "popular" | "newest") => void;
  onPageSizeChange: (value: number) => void;
  onWorksheetTypeChange: (value: WorksheetType | "all") => void;
  onContentTypeChange: (value: CommunityContentType | "all") => void;
};

export default function CommunityWorksheetControls(props: Props) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="w-full space-y-2 md:w-2/3">
          <div>
            <h2 className="text-xl font-bold">Shared Worksheet Library</h2>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">Search public worksheets, preview the finished layout, then copy useful resources to your Dashboard.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input value={props.query} onChange={(event) => props.onQueryChange(event.target.value)} placeholder="Search worksheet titles" className="w-full rounded-xl border border-black/10 bg-white py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select value={props.sort} onChange={(event) => props.onSortChange(event.target.value as "popular" | "newest")} className="rounded-lg border bg-white px-3 py-2 text-sm">
            <option value="popular">Most popular</option>
            <option value="newest">Newest</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-muted)]">
            <span>Per page</span>
            <select value={props.pageSize} onChange={(event) => props.onPageSizeChange(Number(event.target.value))} className="rounded-lg border bg-white px-2 py-2 text-sm">
              <option value={12}>12</option><option value={24}>24</option><option value={36}>36</option>
            </select>
          </label>
        </div>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Filter worksheets by content">
        {CONTENT_FILTERS.map((item) => (
          <button key={item.value} type="button" aria-pressed={props.contentType === item.value} onClick={() => props.onContentTypeChange(item.value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${props.contentType === item.value ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-black/10 bg-white text-[var(--color-text-main)] hover:border-[var(--color-primary)]"}`}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Filter worksheets by type">
        {[{ id: "all" as const, label: "All" }, ...WORKSHEET_TYPES].map((item) => (
          <button key={item.id} type="button" aria-pressed={props.worksheetType === item.id} onClick={() => props.onWorksheetTypeChange(item.id)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${props.worksheetType === item.id ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-black/10 bg-white text-[var(--color-text-main)] hover:border-[var(--color-primary)]"}`}>
            {item.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4 text-sm text-[var(--color-text-muted)]">
        <span>{props.totalCount !== null ? `${props.totalCount} worksheets available` : ""}</span>
        <span>Preview first, then add the worksheet to your Dashboard.</span>
      </div>
    </div>
  );
}
