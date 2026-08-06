"use client";

import WorksheetPreview from "@/components/worksheets/WorksheetPreview";
import type { SavedWorksheetRecord } from "@/lib/worksheets/types";

type Props = {
  worksheet: SavedWorksheetRecord | null;
  onClose: () => void;
  onOpen: (worksheet: SavedWorksheetRecord) => void;
};

export default function DashboardWorksheetPreviewModal({ worksheet, onClose, onOpen }: Props) {
  if (!worksheet) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-6">
      <section role="dialog" aria-modal="true" aria-labelledby="dashboard-worksheet-preview-title" className="flex max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="dashboard-worksheet-preview-title" className="text-xl font-semibold">{worksheet.name}</h2>
            <p className="mt-1 text-sm capitalize text-[var(--color-text-muted)]">{worksheet.worksheetType.replaceAll("-", " ")} · {worksheet.cards.length} cards</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => onOpen(worksheet)} className="btn btn-primary px-4 py-2">Open Worksheet</button>
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
