"use client";

import { PrintableContentOption } from "@/lib/printables/types";

type PrintablesOptionsPanelProps = {
  selectedCardsPerPage: number | null;
  contentOption: PrintableContentOption;
  inkSaving: boolean;
  printing: boolean;
  exporting: boolean;
  onToggleCardsPerPage: (value: number) => void;
  onSetContentOption: (value: PrintableContentOption) => void;
  onSetInkSaving: (value: boolean) => void;
  onPrintNow: () => void;
  onExportPdf: () => void;
};

function CardsPerPageOption({
  n,
  active,
  onClick,
}: {
  n: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`btn rounded-lg px-3 py-2 text-sm font-semibold w-full text-left border transition-shadow ${
        active
          ? "bg-[var(--color-accent)] text-white border-transparent shadow-md"
          : "btn-secondary text-[var(--color-text-main)] hover:shadow-lg"
      }`}
      aria-pressed={active}
    >
      {n} card{n > 1 ? "s" : ""}
    </button>
  );
}

export default function PrintablesOptionsPanel({
  selectedCardsPerPage,
  contentOption,
  inkSaving,
  printing,
  exporting,
  onToggleCardsPerPage,
  onSetContentOption,
  onSetInkSaving,
  onPrintNow,
  onExportPdf,
}: PrintablesOptionsPanelProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border">
      <h3 className="font-semibold mb-3">Cards per page</h3>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[1, 2, 4, 8].map((n) => (
          <CardsPerPageOption
            key={n}
            n={n}
            active={selectedCardsPerPage === n}
            onClick={() => onToggleCardsPerPage(n)}
          />
        ))}
      </div>

      <h3 className="font-semibold mb-3">Content</h3>
      <div className="flex flex-col gap-2 mb-4">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="content"
            checked={contentOption === "picture+word"}
            onChange={() => onSetContentOption("picture+word")}
          />
          <span className="text-sm">Picture + word</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="content"
            checked={contentOption === "picture-only"}
            onChange={() => onSetContentOption("picture-only")}
          />
          <span className="text-sm">Picture only</span>
        </label>
      </div>

      <h3 className="font-semibold mb-3">Ink-saving</h3>
      <label className="flex items-center gap-3 mb-4">
        <input
          type="checkbox"
          checked={inkSaving}
          onChange={(event) => onSetInkSaving(event.target.checked)}
        />
        <span className="text-sm">Grayscale / low-ink mode</span>
      </label>

      <div className="mt-4 flex flex-col gap-3">
        <button
          onClick={onPrintNow}
          disabled={printing}
          className={`btn btn-primary w-full py-3 ${printing ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {printing ? "Printing…" : "Print Now"}
        </button>

        <button
          onClick={onExportPdf}
          disabled={exporting}
          className={`btn btn-primary w-full py-3 ${exporting ? "opacity-60 cursor-not-allowed" : ""}`}
        >
          {exporting ? "Generating PDF…" : "Export PDF"}
        </button>
      </div>
    </div>
  );
}
