"use client";

import { type KeyboardEvent, useEffect, useMemo, useRef } from "react";

import { LessonCard } from "@/lib/lessons/types";
import { resolveLessonImageUrl } from "@/lib/lessons/image";
import { formatWorksheetWord } from "@/lib/worksheets/types";

const QUESTIONS_PER_PAGE = 8;
const WRITING_ROWS_PER_PAGE = 6;
const PAGE_HEIGHT = 1218;
const ARROW_SCROLL_STEP = 120;
const PAGE_SCROLL_STEP = 420;

function normalizePrompts(prompts: string[] | undefined, minimum: number) {
  const next = Array.isArray(prompts) ? prompts.map((item) => String(item ?? "")) : [];
  while (next.length < minimum) {
    next.push("");
  }
  return next;
}

function chunkPrompts(prompts: string[], perPage: number) {
  const chunks: string[][] = [];
  for (let index = 0; index < prompts.length; index += perPage) {
    chunks.push(prompts.slice(index, index + perPage));
  }
  return chunks.length > 0 ? chunks : [Array.from({ length: perPage }, () => "")];
}

function pickFallbackCard(cards: LessonCard[], rowIndex: number, seed: number) {
  if (cards.length === 0) return null;
  const fallbackIndex = Math.abs((seed + rowIndex * 13) % cards.length);
  return cards[fallbackIndex] ?? null;
}

type QuestionBuilderPreviewProps = {
  mode: "questions" | "reading" | "writing";
  title: string;
  instructions: string;
  lines: string[];
  cards: LessonCard[];
  seed: number;
  onLinesChange: (nextLines: string[]) => void;
  writingImageMode?: "image" | "text" | "both";
  writingTraceable?: boolean;
  writingTraceRepeats?: 1 | 2 | 3;
};

export default function QuestionBuilderPreview({
  mode,
  title,
  instructions,
  lines,
  cards,
  seed,
  onLinesChange,
  writingImageMode = "both",
  writingTraceable = false,
  writingTraceRepeats = 1,
}: QuestionBuilderPreviewProps) {
  const isReading = mode === "reading";
  const isWriting = mode === "writing";
  const resolvedWritingImageMode = writingImageMode === "image" ? "image" : "both";
  const rowsPerPage = isWriting ? WRITING_ROWS_PER_PAGE : QUESTIONS_PER_PAGE;
  const minimumRows = Math.max(rowsPerPage, cards.length, lines.length);
  const normalizedLines = useMemo(() => normalizePrompts(lines, minimumRows), [lines, minimumRows]);
  const pages = useMemo(() => chunkPrompts(normalizedLines, rowsPerPage), [normalizedLines, rowsPerPage]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const previousLineLengthRef = useRef(normalizedLines.length);

  useEffect(() => {
    if (normalizedLines.length > previousLineLengthRef.current) {
      const scroller = scrollRef.current;
      if (scroller) {
        requestAnimationFrame(() => {
          scroller.scrollTo({
            top: scroller.scrollHeight,
            behavior: "smooth",
          });
        });
      }
    }
    previousLineLengthRef.current = normalizedLines.length;
  }, [normalizedLines.length]);

  function updatePrompt(absoluteIndex: number, value: string) {
    const next = [...normalizedLines];
    next[absoluteIndex] = value;
    onLinesChange(next);
  }

  function getTraceText(value: string) {
    const text = String(value ?? "").trim();
    if (!text) return "";
    const count = Math.max(1, Math.min(3, writingTraceRepeats));
    return Array.from({ length: count }, () => text).join("   ");
  }

  function getTraceSegments(value: string) {
    const text = String(value ?? "").trim();
    if (!text) return [];
    const count = Math.max(1, Math.min(3, writingTraceRepeats));
    return Array.from({ length: count }, () => text);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const scroller = scrollRef.current;
    if (!scroller) return;

    if (event.key === "ArrowDown" || event.key === "PageDown") {
      event.preventDefault();
      scroller.scrollBy({
        top: event.key === "ArrowDown" ? ARROW_SCROLL_STEP : PAGE_SCROLL_STEP,
        behavior: "smooth",
      });
    } else if (event.key === "ArrowUp" || event.key === "PageUp") {
      event.preventDefault();
      scroller.scrollBy({
        top: event.key === "ArrowUp" ? -ARROW_SCROLL_STEP : -PAGE_SCROLL_STEP,
        behavior: "smooth",
      });
    } else if (event.key === "Home") {
      event.preventDefault();
      scroller.scrollTo({ top: 0, behavior: "smooth" });
    } else if (event.key === "End") {
      event.preventDefault();
      scroller.scrollTo({ top: scroller.scrollHeight, behavior: "smooth" });
    }
  }

  return (
    <div
      ref={scrollRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative h-full w-full overflow-y-auto overflow-x-hidden rounded-[30px] border border-slate-200 bg-[#eef2f7] p-4 shadow-[0_24px_80px_rgba(15,23,42,0.08)] outline-none"
    >
      <div className="mb-4 rounded-full border border-white/70 bg-white/85 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 shadow-[0_10px_30px_rgba(15,23,42,0.08)] backdrop-blur w-fit">
        Print Preview
      </div>

      <div className="flex flex-col gap-6 pb-6">
        {pages.map((pagePrompts, pageIndex) => (
          <section
            key={`question-page-${pageIndex}`}
            className="mx-auto flex h-[1218px] w-[860px] flex-col overflow-hidden rounded-[30px] border border-slate-200 bg-white px-4 pb-3 pt-3 shadow-[0_20px_70px_rgba(15,23,42,0.08)]"
          >
            <div className="flex min-h-[48px] flex-col items-center">
              <div className="flex w-full items-start justify-between gap-4">
                <div className="mb-1 text-[9px] uppercase tracking-[0.18em] text-slate-500">Classendo Worksheet</div>
                <div className="text-[10px] whitespace-nowrap text-slate-600">
                  Name: <span className="ml-1 inline-block w-[92px] translate-y-[-2px] border-b border-slate-400" />
                </div>
              </div>
              <h1 className="m-0 w-full text-center text-[28px] font-bold leading-tight text-blue-700">
                {title || (isReading ? "Reading Worksheet" : "Question Builder")}
              </h1>
              <p className="m-0 w-full text-center text-[11px] leading-[1.25] text-slate-600">
                {instructions || (isReading
                  ? "Read each sentence and copy it for handwriting practice."
                  : "Type your own questions directly into the worksheet.")}
              </p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-1 pt-6">
              <div className="grid flex-1 grid-cols-1 gap-3">
                {pagePrompts.map((prompt, index) => {
                  const rowNumber = pageIndex * rowsPerPage + index + 1;
                  const absoluteIndex = pageIndex * rowsPerPage + index;
                  const card = cards[absoluteIndex] ?? pickFallbackCard(cards, absoluteIndex, seed);
                  const label = card ? formatWorksheetWord(card.word) : "";
                  const hasWritingLine = !isWriting || resolvedWritingImageMode === "both";
                  const displayValue = isWriting
                    ? hasWritingLine
                      ? prompt || label
                      : ""
                    : prompt;
                  const placeholder = isWriting
                    ? hasWritingLine
                      ? "Trace the word here"
                      : ""
                    : isReading
                      ? "Copy the sentence here"
                      : "Type your question here";
                  const showImage = !isWriting || resolvedWritingImageMode === "image" || resolvedWritingImageMode === "both";
                  const showTextCue = isWriting && resolvedWritingImageMode === "both";
                  const traceText = isWriting && writingTraceable && hasWritingLine ? getTraceText(displayValue) : "";
                  const traceSegments = isWriting && writingTraceable && hasWritingLine ? getTraceSegments(displayValue || label) : [];
                  return (
                    <div
                      key={`${rowNumber}-${pageIndex}`}
                      className={`grid items-start gap-4 ${isWriting ? "min-h-[132px] grid-cols-[20px_132px_minmax(0,1fr)]" : "min-h-[96px] grid-cols-[20px_76px_minmax(0,1fr)]"}`}
                    >
                      <div className="mt-[3px] flex h-[20px] w-[20px] items-center justify-center rounded-full bg-blue-700 text-[9px] font-extrabold text-white">
                        {rowNumber}
                      </div>
                      <div className={`mt-[2px] flex items-center justify-center overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_1px_0_rgba(255,255,255,0.8)] ${isWriting ? "h-[128px] w-[132px] px-2 py-2" : "h-[76px] w-[76px]"}`}>
                        {showImage && card?.image ? (
                          <img
                            src={resolveLessonImageUrl(card.image)}
                            alt={card.word}
                            className="h-full w-full object-contain"
                          />
                        ) : showTextCue ? (
                          <div className={`text-center font-semibold leading-tight text-slate-400 ${isWriting ? "text-[14px]" : "text-[10px]"}`}>
                            {card?.word || `${isReading ? "Reading" : isWriting ? "Writing" : "Question"} ${rowNumber}`}
                          </div>
                        ) : (
                          <div className={`text-center font-semibold leading-tight text-slate-400 ${isWriting ? "text-[14px]" : "text-[10px]"}`}>
                            {card?.word || `${isReading ? "Reading" : isWriting ? "Writing" : "Question"} ${rowNumber}`}
                          </div>
                        )}
                      </div>
                      {isWriting ? (
                        <div className="relative min-h-[132px] pb-[4px]">
                          <div className="absolute left-0 right-0 top-[50px] h-[2px] rounded-full bg-slate-900/90" />
                          <div
                            className="absolute left-0 right-0 top-[66px] h-px rounded-full"
                            style={{
                              background:
                                "repeating-linear-gradient(to right, rgba(148, 163, 184, 0.44) 0 2px, transparent 2px 6px)",
                            }}
                          />
                          <div className="absolute left-0 right-0 top-[82px] h-[2px] rounded-full bg-slate-900/90" />
                          {hasWritingLine ? (
                            <>
                              {writingTraceable ? (
                                <div className="pointer-events-none absolute left-0 right-0 top-[70px] -translate-y-1/2 flex max-w-[84%] items-center justify-start gap-7 px-1 pr-0 text-[32px] font-normal tracking-[0] text-slate-300/80" style={{ fontFamily: '"Comic Sans MS", "Comic Sans", sans-serif' }}>
                                  {(traceSegments.length ? traceSegments : [traceText || placeholder]).map((segment, segmentIndex) => (
                                    <span key={`${segmentIndex}-${segment}`} className="whitespace-nowrap leading-none" style={{ fontStyle: "normal", fontWeight: 400 }}>
                                      {segment}
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                              <textarea
                                value={displayValue}
                                onChange={(event) => updatePrompt(absoluteIndex, event.target.value)}
                                placeholder={placeholder}
                                className="relative z-10 min-h-[132px] w-full resize-none border-0 bg-transparent p-0 pt-[10px] text-[20px] font-black leading-[1.1] tracking-[-0.015em] text-slate-800 outline-none placeholder:text-slate-400"
                              />
                            </>
                          ) : (
                            <div className="h-[132px]" />
                          )}
                        </div>
                      ) : (
                        <div className="min-h-[96px] border-b border-slate-200 pb-[12px]">
                          <textarea
                            value={displayValue}
                            onChange={(event) => updatePrompt(absoluteIndex, event.target.value)}
                            placeholder={placeholder}
                            className="min-h-[60px] w-full resize-none border-0 bg-transparent p-0 pt-[2px] text-[20px] font-bold leading-[1.35] tracking-[-0.02em] text-slate-800 outline-none placeholder:text-slate-400"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                  Use the scroll wheel or arrow keys to move through pages
                </div>
                {pages.length > 1 ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => scrollRef.current?.scrollBy({ top: -PAGE_HEIGHT * 0.82, behavior: "smooth" })}
                      className="h-10 w-10 rounded-full border border-slate-200 bg-white text-2xl leading-none text-slate-700 shadow-sm"
                      aria-label="Previous page"
                    >
                      ‹
                    </button>
                    <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      Page {pageIndex + 1} of {pages.length}
                    </div>
                    <button
                      type="button"
                      onClick={() => scrollRef.current?.scrollBy({ top: PAGE_HEIGHT * 0.82, behavior: "smooth" })}
                      className="h-10 w-10 rounded-full border border-slate-200 bg-white text-2xl leading-none text-slate-700 shadow-sm"
                      aria-label="Next page"
                    >
                      ›
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">classendo.com</div>
                )}
              </div>

              {pages.length > 1 ? <div className="mt-1 text-center text-[9px] uppercase tracking-[0.16em] text-slate-500">classendo.com</div> : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
