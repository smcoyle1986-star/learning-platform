"use client";

import { Search } from "lucide-react";

type CommunityControlsProps = {
  query: string;
  sort: "popular" | "newest";
  totalCount: number | null;
  pageSize: number;
  onQueryChange: (value: string) => void;
  onSortChange: (value: "popular" | "newest") => void;
  onPageSizeChange: (value: number) => void;
};

export default function CommunityControls({
  query,
  sort,
  totalCount,
  pageSize,
  onQueryChange,
  onSortChange,
  onPageSizeChange,
}: CommunityControlsProps) {
  return (
    <div className="mb-8 space-y-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="w-full md:w-2/3 space-y-2">
          <div>
            <h2 className="text-2xl font-bold">Shared Lesson Library</h2>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Search public lessons, preview them, then copy the ones you want into your own dashboard.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search lesson titles"
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-black/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] bg-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as "popular" | "newest")}
            className="px-3 py-2 rounded-lg border bg-white text-sm"
          >
            <option value="popular">Most copied</option>
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
              <option value={20}>20</option>
              <option value={30}>30</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 text-sm text-[var(--color-text-muted)]">
        <div>{totalCount !== null ? `${totalCount} lessons available` : ""}</div>
        <div>Preview first, then add to your dashboard when it fits your class.</div>
      </div>
    </div>
  );
}
