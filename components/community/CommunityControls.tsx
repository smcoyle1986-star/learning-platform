"use client";

import { Search } from "lucide-react";
import type { CommunityContentType } from "@/lib/community/types";

const CONTENT_FILTERS: Array<{ value: CommunityContentType | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "noun", label: "Nouns" },
  { value: "verb", label: "Verbs" },
  { value: "adjective", label: "Adjectives" },
  { value: "preposition", label: "Prepositions" },
  { value: "phonics", label: "Phonics" },
];

type CommunityControlsProps = {
  query: string;
  sort: "popular" | "newest";
  totalCount: number | null;
  pageSize: number;
  contentType: CommunityContentType | "all";
  onQueryChange: (value: string) => void;
  onSortChange: (value: "popular" | "newest") => void;
  onPageSizeChange: (value: number) => void;
  onContentTypeChange: (value: CommunityContentType | "all") => void;
};

export default function CommunityControls({
  query,
  sort,
  totalCount,
  pageSize,
  contentType,
  onQueryChange,
  onSortChange,
  onPageSizeChange,
  onContentTypeChange,
}: CommunityControlsProps) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="w-full md:w-2/3 space-y-2">
          <div>
            <h2 className="text-xl font-bold">Shared Lesson Library</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Search public lessons, preview them, then copy the ones you want into your own dashboard.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search lesson titles"
              className="w-full rounded-xl border border-black/10 bg-white py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as "popular" | "newest")}
            className="px-3 py-2 rounded-lg border bg-white text-sm"
          >
            <option value="popular">Most popular</option>
            <option value="newest">Newest</option>
          </select>

          <div className="flex items-center gap-2">
            <label className="text-sm text-[var(--color-text-muted)]">Per page</label>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="px-2 py-2 rounded-lg border bg-white text-sm"
            >
              <option value={12}>12</option>
              <option value={24}>24</option>
              <option value={36}>36</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Filter lessons by content type">
        {CONTENT_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={contentType === filter.value}
            onClick={() => onContentTypeChange(filter.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              contentType === filter.value
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                : "border-black/10 bg-white text-[var(--color-text-main)] hover:border-[var(--color-primary)]"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 text-sm text-[var(--color-text-muted)]">
        <div>{totalCount !== null ? `${totalCount} lessons available` : ""}</div>
        <div>Preview first, then add to your dashboard when it fits your class.</div>
      </div>
    </div>
  );
}
