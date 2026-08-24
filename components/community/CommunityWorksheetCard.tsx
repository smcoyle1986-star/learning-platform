"use client";

import { FileSpreadsheet } from "lucide-react";

import type { SavedWorksheetRecord } from "@/lib/worksheets/types";

type Props = {
  worksheet: SavedWorksheetRecord;
  authorName?: string;
  isOwner: boolean;
  canAddToDashboard: boolean;
  onPreview: (worksheet: SavedWorksheetRecord) => void;
  onOpenWorksheet: (worksheet: SavedWorksheetRecord) => void;
  onAddToDashboard: (worksheet: SavedWorksheetRecord) => void;
};

export default function CommunityWorksheetCard({ worksheet, authorName, isOwner, canAddToDashboard, onPreview, onOpenWorksheet, onAddToDashboard }: Props) {
  const typeLabel = worksheet.worksheetType.replaceAll("-", " ");
  return (
    <article className="relative flex h-full flex-col rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md">
      <button type="button" onClick={() => onPreview(worksheet)} className="group relative mb-2 flex h-20 w-full items-center justify-center overflow-hidden rounded-lg border bg-gradient-to-br from-emerald-50 via-white to-blue-50" title={`Preview ${worksheet.name}`}>
        <FileSpreadsheet size={30} className="text-emerald-700 transition-transform group-hover:scale-110" />
        <span className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-800">{typeLabel}</span>
        <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-xs font-semibold text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">Click to preview</span>
      </button>
      <div className="mb-1 flex min-w-0 items-center gap-2">
        <h3 className="line-clamp-1 text-sm font-semibold leading-tight">{worksheet.name}</h3>
        {isOwner ? <span className="shrink-0 rounded-full border bg-[var(--color-bg-soft)] px-1.5 py-0.5 text-[9px]">Yours</span> : null}
      </div>
      <p className="truncate text-[10px] text-[var(--color-text-muted)]">{authorName ? `By ${authorName}` : `By ${worksheet.userId.slice(0, 8)}`}</p>
      <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-[var(--color-text-muted)]">{worksheet.draft.instructions || `${worksheet.cards.length}-card ${typeLabel} worksheet`}</p>
      <div className="mt-auto grid grid-cols-2 gap-2 pt-3">
        <button type="button" onClick={() => onOpenWorksheet(worksheet)} className="btn btn-secondary justify-center px-2 py-1 text-xs">
          Open Worksheet
        </button>
        <button type="button" disabled={!canAddToDashboard} onClick={() => onAddToDashboard(worksheet)} className="btn btn-primary flex-1 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-55" title={canAddToDashboard ? (isOwner ? "Open this worksheet in My Lessons" : "Add this worksheet to My Lessons") : "Upgrade to Premium to use Community worksheets"}>
          {canAddToDashboard ? (isOwner ? "Open in My Lessons" : "Add to My Lessons") : "Premium required"}
        </button>
        <span className="col-span-2 text-right text-[10px] text-[var(--color-text-muted)]">{worksheet.downloadCount ?? 0} copies</span>
      </div>
    </article>
  );
}
