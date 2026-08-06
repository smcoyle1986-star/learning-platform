"use client";

import WorksheetPreview from "@/components/worksheets/WorksheetPreview";
import type { SavedWorksheetRecord } from "@/lib/worksheets/types";

type Props = {
  worksheet: SavedWorksheetRecord | null;
  authorName?: string;
  canAddToDashboard: boolean;
  isOwner: boolean;
  onClose: () => void;
  onOpenWorksheet: (worksheet: SavedWorksheetRecord) => void;
  onAddToDashboard: (worksheet: SavedWorksheetRecord) => void;
};

export default function CommunityWorksheetPreviewModal({ worksheet, authorName, canAddToDashboard, isOwner, onClose, onOpenWorksheet, onAddToDashboard }: Props) {
  if (!worksheet) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
      <section role="dialog" aria-modal="true" aria-labelledby="community-worksheet-preview-title" className="flex max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="community-worksheet-preview-title" className="text-xl font-semibold">{worksheet.name}</h2>
            <p className="mt-1 text-sm capitalize text-[var(--color-text-muted)]">{worksheet.worksheetType.replaceAll("-", " ")} · {authorName ? `By ${authorName}` : worksheet.userId}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => onOpenWorksheet(worksheet)} className="btn btn-secondary px-4 py-2">Open Worksheet</button>
            <button type="button" disabled={!canAddToDashboard} onClick={() => onAddToDashboard(worksheet)} className="btn btn-primary px-4 py-2 disabled:opacity-55">{canAddToDashboard ? (isOwner ? "Open in Dashboard" : "Add to Dashboard") : "Premium required"}</button>
            <button type="button" onClick={onClose} className="btn btn-secondary px-4 py-2">Close</button>
          </div>
        </div>
        <div className="h-[68vh] min-h-0 overflow-hidden rounded-2xl">
          <WorksheetPreview cards={worksheet.cards} draft={worksheet.draft} className="h-full" />
        </div>
      </section>
    </div>
  );
}
