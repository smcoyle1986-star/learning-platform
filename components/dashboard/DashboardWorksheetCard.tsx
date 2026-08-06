"use client";

import { Eye, FileSpreadsheet, Folder, Pencil, Star, Trash2 } from "lucide-react";

import { SavedWorksheetRecord } from "@/lib/worksheets/types";

type DashboardWorksheetCardProps = {
  worksheet: SavedWorksheetRecord;
  onOpen: (worksheet: SavedWorksheetRecord) => void;
  onPreview: (worksheet: SavedWorksheetRecord) => void;
  onDelete: (worksheetId: string) => void;
  viewMode?: "grid" | "list";
  libraryStatePending?: boolean;
  onToggleFavorite: (worksheet: SavedWorksheetRecord) => void;
  onToggleArchived: (worksheet: SavedWorksheetRecord) => void;
};

export default function DashboardWorksheetCard({
  worksheet,
  onOpen,
  onPreview,
  onDelete,
  viewMode = "grid",
  libraryStatePending = false,
  onToggleFavorite,
  onToggleArchived,
}: DashboardWorksheetCardProps) {
  const archived = Boolean(worksheet.archivedAt);
  const typeLabel = worksheet.worksheetType.replaceAll("-", " ");
  const controls = (
    <div className="flex items-center gap-1" aria-label="Worksheet library controls">
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onToggleFavorite(worksheet); }}
        disabled={libraryStatePending}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 disabled:cursor-wait disabled:opacity-50 ${worksheet.isFavorite ? "scale-110 text-yellow-400 drop-shadow-[0_0_5px_rgba(250,204,21,0.65)]" : "text-slate-400 hover:scale-105 hover:bg-yellow-50 hover:text-yellow-500"}`}
        title={worksheet.isFavorite ? "Remove from favourites" : "Add to favourites"}
        aria-label={worksheet.isFavorite ? "Remove from favourites" : "Add to favourites"}
        aria-pressed={Boolean(worksheet.isFavorite)}
      >
        <Star size={18} fill={worksheet.isFavorite ? "currentColor" : "none"} />
      </button>
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onToggleArchived(worksheet); }}
        disabled={libraryStatePending}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 disabled:cursor-wait disabled:opacity-50 ${archived ? "scale-110 text-blue-900 drop-shadow-[0_0_4px_rgba(30,58,138,0.32)]" : "text-slate-400 hover:scale-105 hover:bg-blue-50 hover:text-blue-800"}`}
        title={archived ? "Unarchive worksheet" : "Archive worksheet"}
        aria-label={archived ? "Unarchive worksheet" : "Archive worksheet"}
        aria-pressed={archived}
      >
        <Folder size={18} fill={archived ? "currentColor" : "none"} />
      </button>
    </div>
  );

  if (viewMode === "list") {
    return (
      <article className="flex flex-col gap-3 rounded-2xl border bg-white px-4 py-3 shadow-sm transition hover:shadow-md md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {controls}
          <FileSpreadsheet className="shrink-0 text-emerald-700" size={20} />
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{worksheet.name}</h3>
            <p className="mt-1 text-xs capitalize text-[var(--color-text-muted)]">
              {typeLabel} · {worksheet.cards.length} cards · {worksheet.useCount ?? 0} uses · {worksheet.isPublic ? "Public" : "Private"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onPreview(worksheet)} className="btn btn-secondary px-2 py-1.5 text-xs" title="Preview worksheet"><Eye size={14} /></button>
          <button type="button" onClick={() => onOpen(worksheet)} className="btn btn-primary px-3 py-1.5 text-xs"><Pencil size={14} /> Open</button>
          <button type="button" onClick={() => onDelete(worksheet.id)} className="btn btn-secondary border-red-200 bg-red-50 px-2 py-1.5 text-red-700 hover:bg-red-100" title="Delete worksheet"><Trash2 size={14} /></button>
        </div>
      </article>
    );
  }

  return (
    <article className="relative flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="absolute right-3 top-3">{controls}</div>
      <div className="pr-20">
        <div className="mb-2 flex items-center gap-2">
          <FileSpreadsheet className="shrink-0 text-emerald-700" size={18} />
          <button type="button" onClick={() => onPreview(worksheet)} className="group min-w-0 truncate text-left text-lg font-semibold hover:text-blue-700" title={`Preview ${worksheet.name}`}>
            <span className="group-hover:underline">{worksheet.name}</span>
          </button>
        </div>
        <p className="text-xs capitalize text-[var(--color-text-muted)]">
          {typeLabel} · {worksheet.cards.length} cards · {worksheet.useCount ?? 0} uses
        </p>
      </div>

      <p className="mb-4 mt-4 line-clamp-2 text-sm text-[var(--color-text-muted)]">
        {worksheet.draft.instructions || "No worksheet instructions yet."}
      </p>
      <div className="mb-4 flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]">
        <span className={`rounded-full px-2.5 py-1 ${worksheet.isPublic ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
          {worksheet.isPublic ? "Public" : "Private"}
        </span>
        {archived ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-800">Archived</span> : null}
      </div>

      <div className="mt-auto flex items-center gap-2">
        <button type="button" onClick={() => onPreview(worksheet)} className="btn btn-secondary px-3 py-2 text-sm" title="Preview worksheet"><Eye size={14} /></button>
        <button type="button" onClick={() => onOpen(worksheet)} className="btn btn-primary flex-1 justify-center px-3 py-2 text-sm">
          <Pencil size={14} /> Open Worksheet
        </button>
        <button type="button" onClick={() => onDelete(worksheet.id)} className="btn btn-secondary border-red-200 bg-red-50 px-3 py-2 text-red-700 hover:bg-red-100" title="Delete worksheet">
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
}
