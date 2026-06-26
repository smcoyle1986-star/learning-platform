"use client";

import { useEffect, useRef, useState } from "react";

import { LessonCard } from "@/lib/lessons/types";
import { buildWorksheetPreviewHtml } from "@/lib/worksheets/export";
import { WorksheetDraft } from "@/lib/worksheets/types";
import QuestionBuilderPreview from "@/components/worksheets/QuestionBuilderPreview";

const PORTRAIT_PREVIEW_BASE_SIZE = { width: 860, height: 1218 };
const LANDSCAPE_PREVIEW_BASE_SIZE = { width: 1218, height: 860 };

type WorksheetPreviewProps = {
  cards: LessonCard[];
  draft: WorksheetDraft;
  onQuestionPromptsChange?: (nextPrompts: string[]) => void;
  onReadingLinesChange?: (nextLines: string[]) => void;
  onWritingLinesChange?: (nextLines: string[]) => void;
  onSentenceScrambleLinesChange?: (nextLines: string[]) => void;
  className?: string;
};

export default function WorksheetPreview({
  cards,
  draft,
  onQuestionPromptsChange,
  onReadingLinesChange,
  onWritingLinesChange,
  onSentenceScrambleLinesChange,
  className = "",
}: WorksheetPreviewProps) {
  const [previewHtml, setPreviewHtml] = useState("<!doctype html><html><body></body></html>");
  const previewFrameRef = useRef<HTMLDivElement | null>(null);
  const [crosswordScale, setCrosswordScale] = useState(1);
  const isFitPreview =
    draft.type === "bullseye" ||
    draft.type === "crossword" ||
    draft.type === "matching" ||
    draft.type === "tic-tac-toe" ||
    draft.type === "battleship" ||
    draft.type === "wordsearch";

  useEffect(() => {
    let mounted = true;
    buildWorksheetPreviewHtml(cards, draft, {
      includeTeacherCopy: false,
      interactivePreview: true,
      previewMode: true,
    }).then((html) => {
      if (mounted) setPreviewHtml(html);
    });

    return () => {
      mounted = false;
    };
  }, [cards, draft]);

  useEffect(() => {
    if (!isFitPreview) {
      setCrosswordScale(1);
      return;
    }

    const element = previewFrameRef.current;
    if (!element) return;

    const measure = () => {
      const bounds = element.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;

      const baseSize =
        draft.type === "bullseye" || draft.type === "tic-tac-toe" || draft.type === "battleship"
          ? LANDSCAPE_PREVIEW_BASE_SIZE
          : PORTRAIT_PREVIEW_BASE_SIZE;
      const nextScale = Math.min((bounds.width - 8) / baseSize.width, (bounds.height - 8) / baseSize.height, 1);
      setCrosswordScale(Math.max(nextScale, 0.1));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isFitPreview]);

  return (
    <div className={`relative min-h-0 h-full flex flex-col ${className}`}>
      {draft.type !== "questions" ? (
        <div className="absolute left-5 top-5 z-20 pointer-events-none">
          <div className="rounded-full border border-white/70 bg-white/85 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur">
            Print Preview
          </div>
        </div>
      ) : null}
      <div
        ref={previewFrameRef}
        className="rounded-[30px] border border-slate-200 overflow-hidden bg-[#eef2f7] flex-1 min-h-0 relative shadow-[0_24px_80px_rgba(15,23,42,0.08)]"
      >
        {draft.type === "questions" ? (
          <div className="absolute inset-0 p-2">
            <QuestionBuilderPreview
              mode="questions"
              title={draft.title}
              instructions={draft.instructions}
              lines={draft.questionBuilderPrompts}
              cards={cards}
              seed={draft.shuffleSeed}
              onLinesChange={onQuestionPromptsChange ?? (() => undefined)}
            />
          </div>
        ) : draft.type === "reading" ? (
          <div className="absolute inset-0 p-2">
            <QuestionBuilderPreview
              mode="reading"
              title={draft.title}
              instructions={draft.instructions}
              lines={draft.readingLines}
              cards={cards}
              seed={draft.shuffleSeed}
              onLinesChange={onReadingLinesChange ?? (() => undefined)}
            />
          </div>
        ) : draft.type === "writing" ? (
          <div className="absolute inset-0 p-2">
            <QuestionBuilderPreview
              mode="writing"
              title={draft.title}
              instructions={draft.instructions}
              lines={draft.writingLines}
              cards={cards}
              seed={draft.shuffleSeed}
              onLinesChange={onWritingLinesChange ?? (() => undefined)}
              writingImageMode={draft.writingImageMode}
              writingTraceable={draft.writingTraceable}
              writingTraceRepeats={draft.writingTraceRepeats}
            />
          </div>
        ) : draft.type === "sentence-scramble" ? (
          <div className="absolute inset-0 p-2">
            <QuestionBuilderPreview
              mode="questions"
              title={draft.title}
              instructions={draft.instructions}
              lines={draft.sentenceScrambleLines}
              cards={cards}
              seed={draft.shuffleSeed}
              onLinesChange={onSentenceScrambleLinesChange ?? (() => undefined)}
            />
          </div>
        ) : draft.type === "bullseye" || draft.type === "tic-tac-toe" || draft.type === "battleship" ? (
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              width: `${LANDSCAPE_PREVIEW_BASE_SIZE.width}px`,
              height: `${LANDSCAPE_PREVIEW_BASE_SIZE.height}px`,
              transform: `translate(-50%, -50%) scale(${crosswordScale})`,
              transformOrigin: "center center",
            }}
          >
            <iframe
              title="Worksheet preview"
              srcDoc={previewHtml}
              className="w-full h-full min-h-0 bg-[#eef2f7] border-0"
            />
          </div>
        ) : isFitPreview ? (
          <div
            className="absolute left-1/2 top-1/2"
            style={{
              width: `${PORTRAIT_PREVIEW_BASE_SIZE.width}px`,
              height: `${PORTRAIT_PREVIEW_BASE_SIZE.height}px`,
              transform: `translate(-50%, -50%) scale(${crosswordScale})`,
              transformOrigin: "center center",
            }}
          >
            <iframe
              title="Worksheet preview"
              srcDoc={previewHtml}
              className="w-full h-full min-h-0 bg-[#eef2f7] border-0"
            />
          </div>
        ) : (
          <iframe
            title="Worksheet preview"
            srcDoc={previewHtml}
            className="w-full h-full min-h-0 bg-[#eef2f7] border-0"
          />
        )}
      </div>
    </div>
  );
}
