"use client";

import { ZoomIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import WorksheetPreview from "@/components/worksheets/WorksheetPreview";
import type { LessonCard } from "@/lib/lessons/types";
import type { WorksheetDraft } from "@/lib/worksheets/types";

const PORTRAIT_SIZE = { width: 860, height: 1218 };
const LANDSCAPE_SIZE = { width: 1218, height: 860 };

type LockedWorksheetPreviewProps = {
  cards: LessonCard[];
  draft: WorksheetDraft;
};

function isLandscapeWorksheet(type: WorksheetDraft["type"]) {
  return type === "bullseye" || type === "tic-tac-toe" || type === "battleship";
}

function ScaledWorksheet({
  cards,
  draft,
  padding = 12,
  zoom = 1,
}: LockedWorksheetPreviewProps & { padding?: number; zoom?: number }) {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.1);
  const baseSize = isLandscapeWorksheet(draft.type) ? LANDSCAPE_SIZE : PORTRAIT_SIZE;

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      const bounds = frame.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const fittedScale = Math.min(
        (bounds.width - padding * 2) / baseSize.width,
        (bounds.height - padding * 2) / baseSize.height,
        1,
      );
      setScale(Math.max(fittedScale * zoom, 0.1));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [baseSize.height, baseSize.width, padding, zoom]);

  return (
    <div ref={frameRef} className="absolute inset-0 overflow-hidden">
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: `${baseSize.width}px`,
          height: `${baseSize.height}px`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <WorksheetPreview cards={cards} draft={draft} className="h-full" />
      </div>
    </div>
  );
}

export default function LockedWorksheetPreview({
  cards,
  draft,
}: LockedWorksheetPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const needsDetailZoom =
    draft.type === "crossword" ||
    draft.type === "wordsearch" ||
    draft.type === "matching";

  useEffect(() => {
    if (!expanded) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [expanded]);

  return (
    <>
      <div className="group relative h-full min-h-0 min-w-0 w-full overflow-hidden rounded-[30px] border border-slate-200 bg-[#e8edf3] shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
        <ScaledWorksheet
          cards={cards}
          draft={draft}
          zoom={needsDetailZoom ? 1.65 : 1}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/12 via-transparent to-transparent" />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="absolute inset-0 z-20 cursor-zoom-in"
          aria-label="Enlarge worksheet preview"
          title="Click to enlarge the worksheet preview"
        />
        <div className="pointer-events-none absolute right-5 top-5 z-30 flex h-14 w-14 items-center justify-center rounded-full border border-white/90 bg-white/92 text-[#52634a] shadow-[0_12px_32px_rgba(15,23,42,0.2)] transition-transform group-hover:scale-110">
          <ZoomIn size={29} strokeWidth={2.4} aria-hidden="true" />
        </div>
        <div className="pointer-events-none absolute bottom-5 left-1/2 z-30 -translate-x-1/2 rounded-full border border-white/90 bg-white/92 px-4 py-2 text-xs font-semibold text-[#52634a] shadow-sm">
          Click to enlarge
        </div>
      </div>

      {expanded ? (
        <div
          className="fixed inset-0 z-[180] bg-slate-950/72 p-4 backdrop-blur-sm"
          onClick={() => setExpanded(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Expanded worksheet preview"
        >
          <div className="relative h-full w-full">
            <ScaledWorksheet
              cards={cards}
              draft={draft}
              padding={24}
              zoom={needsDetailZoom ? 1.4 : 1}
            />
            <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-white/20 bg-slate-950/70 px-4 py-2 text-xs font-semibold text-white shadow-lg">
              Click anywhere to close
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="absolute inset-0 cursor-zoom-out"
              aria-label="Close expanded worksheet preview"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
