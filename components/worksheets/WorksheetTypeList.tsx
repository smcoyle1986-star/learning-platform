"use client";

import { WorksheetType, WorksheetTypeOption } from "@/lib/worksheets/types";

type WorksheetTypeListProps = {
  items: WorksheetTypeOption[];
  onSelect: (type: WorksheetType) => void;
};

export default function WorksheetTypeList({
  items,
  onSelect,
}: WorksheetTypeListProps) {
  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold">Worksheet Types</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Choose the worksheet format first. The left panel will then switch to editing options for that format.
        </p>
      </div>

      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => item.available && onSelect(item.id)}
          disabled={!item.available}
          className={`w-full text-left rounded-2xl border bg-white p-4 shadow-sm transition ${
            item.available
              ? "hover:bg-[var(--color-bg-soft)]"
              : "opacity-70 cursor-not-allowed"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold">{item.label}</div>
            {!item.available && (
              <span className="text-[11px] px-2 py-1 rounded-full border bg-[var(--color-bg-soft)] text-[var(--color-text-muted)]">
                Coming next
              </span>
            )}
          </div>
          <div className="text-sm text-[var(--color-text-muted)] mt-1">
            {item.description}
          </div>
        </button>
      ))}
    </div>
  );
}
