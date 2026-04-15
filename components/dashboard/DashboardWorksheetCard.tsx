"use client";

import { FileSpreadsheet, Pencil, Trash2 } from "lucide-react";

import { SavedWorksheetRecord } from "@/lib/worksheets/types";

type DashboardWorksheetCardProps = {
  worksheet: SavedWorksheetRecord;
  onOpen: (worksheet: SavedWorksheetRecord) => void;
  onDelete: (worksheetId: string) => void;
};

export default function DashboardWorksheetCard({
  worksheet,
  onOpen,
  onDelete,
}: DashboardWorksheetCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border shadow-sm hover:shadow-md transition">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="font-semibold text-lg">{worksheet.name}</div>
          <div className="text-xs text-[var(--color-text-muted)] mt-1 capitalize">
            {worksheet.worksheetType.replaceAll("-", " ")} · {worksheet.cards.length} cards
          </div>
        </div>

        <div className="text-xs text-[var(--color-text-muted)]">
          {worksheet.isPublic ? "🌍 Public" : "🔒 Private"}
        </div>
      </div>

      <p className="text-sm text-[var(--color-text-muted)] mb-4 line-clamp-2">
        {worksheet.draft.instructions || "No worksheet instructions yet."}
      </p>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onOpen(worksheet)}
          className="btn btn-primary flex-1 px-3 py-2 text-sm flex items-center gap-2 justify-center"
        >
          <Pencil size={14} />
          Open
        </button>

        <button
          onClick={() => onDelete(worksheet.id)}
          className="btn btn-secondary px-3 py-2 text-sm text-red-700 border-red-200 bg-red-50 hover:bg-red-100"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
