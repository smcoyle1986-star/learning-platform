"use client";

import { useEffect, useState } from "react";

import { LessonCard } from "@/lib/lessons/types";
import { buildWorksheetPreviewHtml } from "@/lib/worksheets/export";
import { WorksheetDraft } from "@/lib/worksheets/types";

type WorksheetPreviewProps = {
  cards: LessonCard[];
  draft: WorksheetDraft;
  className?: string;
};

export default function WorksheetPreview({
  cards,
  draft,
  className = "",
}: WorksheetPreviewProps) {
  const [previewHtml, setPreviewHtml] = useState("<!doctype html><html><body></body></html>");

  useEffect(() => {
    let mounted = true;
    buildWorksheetPreviewHtml(cards, draft, {
      includeTeacherCopy: false,
      previewMode: true,
    }).then((html) => {
      if (mounted) setPreviewHtml(html);
    });

    return () => {
      mounted = false;
    };
  }, [cards, draft]);

  return (
    <div className={`bg-white rounded-[30px] border border-slate-200 shadow-[0_24px_80px_rgba(15,23,42,0.08)] p-4 md:p-6 min-h-0 h-full flex flex-col ${className}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Print Preview</div>
          <div className="text-sm text-slate-600 mt-1">
            This preview matches the printable worksheet layout.
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 overflow-hidden bg-[#eef2f7] flex-1 min-h-0">
        <iframe
          title="Worksheet preview"
          srcDoc={previewHtml}
          className="w-full h-full min-h-0 bg-[#eef2f7]"
        />
      </div>
    </div>
  );
}
