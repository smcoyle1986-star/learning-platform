"use client";

import { useEffect, useState } from "react";

import { WorksheetDraft, WorksheetTypeOption } from "@/lib/worksheets/types";

type WorksheetOptionsPanelProps = {
  worksheetType: WorksheetTypeOption;
  draft: WorksheetDraft;
  onUpdate: <K extends keyof WorksheetDraft>(key: K, value: WorksheetDraft[K]) => void;
  onQuestionPromptsAdd?: () => void;
  onQuestionPromptsRemove?: () => void;
  onSentenceScramble?: () => void;
  questionBuilderCanRemove?: boolean;
  questionBuilderRemoveReason?: string;
  crosswordFitSummary?: {
    placed: number;
    total: number;
    missing: number;
  } | null;
  wordsearchFitSummary?: {
    placed: number;
    total: number;
    missing: number;
  } | null;
};

export default function WorksheetOptionsPanel({
  worksheetType,
  draft,
  onUpdate,
  onQuestionPromptsAdd,
  onQuestionPromptsRemove,
  onSentenceScramble,
  questionBuilderCanRemove = false,
  questionBuilderRemoveReason = "",
  crosswordFitSummary,
  wordsearchFitSummary,
}: WorksheetOptionsPanelProps) {
  const [showBullseyeHelp, setShowBullseyeHelp] = useState(false);
  const [showSentenceScrambleHelp, setShowSentenceScrambleHelp] = useState(false);
  const [showTicTacToeHelp, setShowTicTacToeHelp] = useState(false);
  const [showBattleshipHelp, setShowBattleshipHelp] = useState(false);
  const [showWordsearchHelp, setShowWordsearchHelp] = useState(false);
  const [showWritingHelp, setShowWritingHelp] = useState(false);
  const isCrossword = worksheetType.id === "crossword";
  const isBullseye = worksheetType.id === "bullseye";
  const isMatching = worksheetType.id === "matching";
  const isQuestionBuilder = worksheetType.id === "questions";
  const isReading = worksheetType.id === "reading";
  const isWriting = worksheetType.id === "writing";
  const isSentenceScramble = worksheetType.id === "sentence-scramble";
  const isTicTacToe = worksheetType.id === "tic-tac-toe";
  const isBattleship = worksheetType.id === "battleship";
  const isWordsearch = worksheetType.id === "wordsearch";
  const actionButtonClass =
    "btn btn-secondary w-full px-4 py-3 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30";
  const chipButtonClass =
    "rounded-full px-3 py-1 text-xs font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30";
  const modalCloseClass =
    "h-9 w-9 rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-sm active:translate-y-0 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30";
  const shuffleLabel = isBullseye
    ? "Mix Up the Board"
    : isMatching
      ? "Mix Up the Worksheet"
      : isWordsearch
        ? "Mix Up the Wordsearch"
        : "Mix Up the Crossword";

  useEffect(() => {
    if (isBullseye) setShowBullseyeHelp(true);
  }, [isBullseye]);

  useEffect(() => {
    if (isSentenceScramble) setShowSentenceScrambleHelp(true);
  }, [isSentenceScramble]);

  useEffect(() => {
    if (isTicTacToe) setShowTicTacToeHelp(true);
  }, [isTicTacToe]);

  useEffect(() => {
    if (isBattleship) setShowBattleshipHelp(true);
  }, [isBattleship]);

  useEffect(() => {
    if (isWordsearch) setShowWordsearchHelp(true);
  }, [isWordsearch]);

  useEffect(() => {
    if (isWriting) setShowWritingHelp(true);
  }, [isWriting]);

  return (
    <div className="space-y-4">
      {showBullseyeHelp && isBullseye ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/20 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Bullseye</div>
                <h3 className="mt-2 text-2xl font-extrabold text-slate-900">How Bullseye Works</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBullseyeHelp(false)}
                className={modalCloseClass}
                aria-label="Close Bullseye help"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-700 leading-6">
              <p>
                Bullseye is a classroom game built from your lesson cards. Students drop an eraser or small token to land on the board.
              </p>

              <div>
                <div className="font-semibold text-slate-900">Points Version</div>
                <p className="mt-1">
                  Teams score points by landing on wedges. The bullseye is worth 8 points. Highest score wins.
                </p>
              </div>

              <div>
                <div className="font-semibold text-slate-900">Around the World</div>
                <p className="mt-1">
                  Teams race to complete every wedge and finish on the bullseye. No points in this version.
                </p>
              </div>

              <div>
                <div className="font-semibold text-slate-900">Best for</div>
                <ul className="mt-1 list-disc pl-5">
                  <li>speaking practice</li>
                  <li>vocabulary review</li>
                  <li>quick team competitions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showSentenceScrambleHelp && isSentenceScramble ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/20 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Sentence Scramble</div>
                <h3 className="mt-2 text-2xl font-extrabold text-slate-900">How Sentence Scramble Works</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSentenceScrambleHelp(false)}
                className={modalCloseClass}
                aria-label="Close Sentence Scramble help"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-700 leading-6">
              <p>
                Write each sentence next to the image, then use the scramble controls on the preview to mix up the words.
              </p>

              <div>
                <div className="font-semibold text-slate-900">Difficulty</div>
                <p className="mt-1">
                  Easy keeps small word groups together, medium mixes the words nearby, and hard scrambles the full sentence.
                </p>
              </div>

              <div>
                <div className="font-semibold text-slate-900">How it works</div>
                <p className="mt-1">
                  Each sentence only scrambles inside its own row, and the spelling of the words does not change.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showTicTacToeHelp && isTicTacToe ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/20 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Tic-Tac-Toe</div>
                <h3 className="mt-2 text-2xl font-extrabold text-slate-900">How Tic-Tac-Toe Works</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTicTacToeHelp(false)}
                className={modalCloseClass}
                aria-label="Close Tic-Tac-Toe help"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-700 leading-6">
              <p>
                Tic-Tac-Toe is a classroom game built from your lesson cards. Students use the board to practise the lesson words or pictures.
              </p>

              <div>
                <div className="font-semibold text-slate-900">How to Play</div>
                <p className="mt-1">
                  Choose image only, text only, or image + text. Pick how many boards you want on one page. Students take turns selecting a square and saying or writing the word. The first team to get three in a row wins.
                </p>
              </div>

              <div>
                <div className="font-semibold text-slate-900">Best for</div>
                <ul className="mt-1 list-disc pl-5">
                  <li>speaking practice</li>
                  <li>vocabulary review</li>
                  <li>quick team competitions</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showBattleshipHelp && isBattleship ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/20 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Battleship</div>
                <h3 className="mt-2 text-2xl font-extrabold text-slate-900">How Battleship Works</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBattleshipHelp(false)}
                className={modalCloseClass}
                aria-label="Close Battleship help"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-700 leading-6">
              <p>
                Battleship is a classroom game based on the classic board game. Students use the x and y axis to pick a square, then say the word or identify the image to check for a hit or miss.
              </p>

              <div>
                <div className="font-semibold text-slate-900">Clear Board</div>
                <p className="mt-1">
                  Students draw their own ships on a hidden copy of the board. Keep the board hidden from the other player, just like the classic game.
                </p>
              </div>

              <div>
                <div className="font-semibold text-slate-900">With Ships</div>
                <p className="mt-1">
                  Use the worksheet with the ships already placed on the board. Teachers can print multiple versions and use the preview to scroll through each one.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showWordsearchHelp && isWordsearch ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/20 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Wordsearch</div>
                <h3 className="mt-2 text-2xl font-extrabold text-slate-900">How Wordsearch Works</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWordsearchHelp(false)}
                className={modalCloseClass}
                aria-label="Close Wordsearch help"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-700 leading-6">
              <p>
                Find the hidden lesson words in the grid below. The word list stays at the bottom so students can scan it as they search.
              </p>

              <div>
                <div className="font-semibold text-slate-900">Difficulty</div>
                <p className="mt-1">
                  Easy uses fewer directions, medium adds more directions, and hard adds backwards words for a tighter puzzle.
                </p>
              </div>

              <div>
                <div className="font-semibold text-slate-900">Word List Style</div>
                <p className="mt-1">
                  Choose image only, text only, or image + text for the word list at the bottom.
                </p>
              </div>

              <div>
                <div className="font-semibold text-slate-900">Random Letters</div>
                <p className="mt-1">
                  Use Add Random Letters if you want a more traditional filled wordsearch grid. Leave it off to keep the board cleaner for younger learners.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showWritingHelp && isWriting ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4">
          <div className="w-full max-w-md rounded-[28px] border border-white/20 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Writing</div>
                <h3 className="mt-2 text-2xl font-extrabold text-slate-900">How Writing Works</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowWritingHelp(false)}
                className={modalCloseClass}
                aria-label="Close Writing help"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm text-slate-700 leading-6">
              <p>
                Writing is a handwriting practice worksheet built from your lesson cards. Students trace the words next to each image.
              </p>

              <div>
                <div className="font-semibold text-slate-900">Word Style</div>
                <p className="mt-1">
                  Choose image only or image + text for the cue beside each writing line.
                </p>
              </div>

              <div>
                <div className="font-semibold text-slate-900">Traceable</div>
                <p className="mt-1">
                  Turn Traceable on to show light tracing text on the writing line. Choose how many times the word appears so students can trace it 1, 2, or 3 times.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div>
        <h2 className="text-xl font-semibold">{worksheetType.label}</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {worksheetType.description}
        </p>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-4">
        {isCrossword ? (
          <>
            <div>
              <label className="block text-sm font-semibold mb-2">Difficulty</label>
              <select
                value={draft.difficulty}
                onChange={(event) => onUpdate("difficulty", event.target.value as WorksheetDraft["difficulty"])}
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm bg-[var(--color-bg-main)]"
              >
                <option value="easy">Easy · some letters revealed</option>
                <option value="medium">Medium · no letters revealed</option>
                <option value="hard">Hard · tighter crossword intersections</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Clues at the Bottom</label>
              <select
                value={draft.clueMode}
                onChange={(event) => onUpdate("clueMode", event.target.value as WorksheetDraft["clueMode"])}
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm bg-[var(--color-bg-main)]"
              >
                <option value="image">Image only</option>
                <option value="text">Text only</option>
                <option value="both">Image + text</option>
              </select>
            </div>

            <button
              onClick={() => onUpdate("shuffleSeed", Date.now())}
              className={actionButtonClass}
            >
              {shuffleLabel}
            </button>

            {crosswordFitSummary ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                <div className="font-semibold text-amber-950">Card fit note</div>
                <p className="mt-1">
                  This crossword currently fits {crosswordFitSummary.placed} of {crosswordFitSummary.total} cards.{" "}
                  {crosswordFitSummary.missing === 1
                    ? "1 card"
                    : `${crosswordFitSummary.missing} cards`}{" "}
                  didn&apos;t fit this time. Mix Up the Crossword to try new combinations.
                </p>
              </div>
            ) : null}
          </>
        ) : isMatching ? (
          <>
            <button
              onClick={() => onUpdate("shuffleSeed", Date.now())}
              className={actionButtonClass}
            >
              {shuffleLabel}
            </button>
          </>
      ) : isBattleship ? (
          <>
            <div>
              <label className="block text-sm font-semibold mb-2">Image Style</label>
              <select
                value={draft.battleshipImageMode}
                onChange={(event) => onUpdate("battleshipImageMode", event.target.value as WorksheetDraft["battleshipImageMode"])}
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm bg-[var(--color-bg-main)]"
              >
                <option value="image">Image only</option>
                <option value="text">Text only</option>
                <option value="both">Image + text</option>
              </select>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-[var(--color-bg-main)] px-4 py-3">
              <div>
                <div className="text-sm font-semibold">Board Type</div>
                <div className="text-xs text-[var(--color-text-muted)]">
                  Choose an empty board or show the ships on the worksheet.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (draft.battleshipBoardMode === "empty") {
                    onUpdate("battleshipBoardMode", "ships");
                    return;
                  }
                  onUpdate("battleshipBoardMode", "empty");
                  onUpdate("battleshipWorksheetCount", 1);
                }}
                className={`${chipButtonClass} ${
                  draft.battleshipBoardMode === "ships"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-700 border border-slate-200"
                }`}
                >
                {draft.battleshipBoardMode === "ships" ? "With ships" : "Clear board"}
              </button>
            </label>

            {draft.battleshipBoardMode === "ships" ? (
              <div>
                <label className="block text-sm font-semibold mb-2">Worksheets</label>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={draft.battleshipWorksheetCount}
                  onChange={(event) =>
                    onUpdate(
                      "battleshipWorksheetCount",
                      Math.max(1, Math.floor(Number(event.target.value) || 1)) as WorksheetDraft["battleshipWorksheetCount"]
                    )
                  }
                  className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm bg-[var(--color-bg-main)]"
                />
              </div>
            ) : null}

            <button
              onClick={() => onUpdate("shuffleSeed", Date.now())}
              className={actionButtonClass}
            >
              Randomize Worksheet
            </button>
          </>
        ) : isBullseye ? (
          <>
            <div>
              <label className="block text-sm font-semibold mb-2">Game Version</label>
              <select
                value={draft.bullseyeVersion}
                onChange={(event) => onUpdate("bullseyeVersion", event.target.value as WorksheetDraft["bullseyeVersion"])}
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm bg-[var(--color-bg-main)]"
              >
                <option value="points">Version 1 · Points Game</option>
                <option value="around-the-world">Version 2 · Around the World</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Image Style</label>
              <select
                value={draft.bullseyeImageMode}
                onChange={(event) => onUpdate("bullseyeImageMode", event.target.value as WorksheetDraft["bullseyeImageMode"])}
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm bg-[var(--color-bg-main)]"
              >
                <option value="image">Image only</option>
                <option value="text">Text only</option>
                <option value="both">Image + text</option>
              </select>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-2xl border border-black/10 bg-[var(--color-bg-main)] px-4 py-3">
              <div>
                <div className="text-sm font-semibold">Ink Saver</div>
                <div className="text-xs text-[var(--color-text-muted)]">Use lighter fills and simpler output for printing.</div>
              </div>
              <input
                type="checkbox"
                checked={draft.bullseyeInkSaver}
                onChange={() => onUpdate("bullseyeInkSaver", !draft.bullseyeInkSaver)}
                className="h-4 w-4"
              />
            </label>

            <button
              onClick={() => onUpdate("shuffleSeed", Date.now())}
              className={actionButtonClass}
            >
              Mix Up the Board
            </button>
          </>
        ) : isQuestionBuilder ? (
          <div className="rounded-2xl border border-dashed bg-[var(--color-bg-main)] px-4 py-5 text-sm text-[var(--color-text-muted)] leading-6 space-y-3">
            <p>Type your own questions directly into the preview.</p>
            <p>
              Click <span className="font-semibold text-[var(--color-text-main)]">Add Question</span> to add a blank row at the end of the worksheet. If you already have 8 questions, the new row creates a second page in the preview and PDF.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onQuestionPromptsAdd}
                className={actionButtonClass}
              >
                Add Question
              </button>
              <span
                title={questionBuilderRemoveReason}
                className="group block w-full"
              >
                <button
                  type="button"
                  onClick={questionBuilderCanRemove ? onQuestionPromptsRemove : undefined}
                  disabled={!questionBuilderCanRemove}
                  className={`${actionButtonClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  Remove Question
                </button>
              </span>
            </div>
            <p className="text-xs leading-5 text-[var(--color-text-muted)]">
              The preview starts by showing every image in the lesson tray. If you add more question rows than tray images, extra rows reuse tray images at random.
            </p>
          </div>
        ) : isReading ? (
          <div className="rounded-2xl border border-dashed bg-[var(--color-bg-main)] px-4 py-5 text-sm text-[var(--color-text-muted)] leading-6 space-y-3">
            <p>Reading starts each row with the lesson word next to the image.</p>
            <p>
              Teachers can edit the text on each line to build handwriting practice sentences while keeping the same preview and print layout.
            </p>
            <p className="text-xs leading-5 text-[var(--color-text-muted)]">
              Every lesson image appears in the preview from the start, and the rows scroll just like Question Builder.
            </p>
          </div>
        ) : isWriting ? (
          <>
            <div>
              <label className="block text-sm font-semibold mb-2">Word Style</label>
              <select
                value={draft.writingImageMode === "image" ? "image" : "both"}
                onChange={(event) =>
                  onUpdate("writingImageMode", event.target.value === "image" ? "image" : "both")
                }
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm bg-[var(--color-bg-main)]"
              >
                <option value="image">Image only</option>
                <option value="both">Image + text</option>
              </select>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-black/10 bg-[var(--color-bg-main)] px-4 py-3">
              <input
                type="checkbox"
                checked={draft.writingTraceable}
                onChange={() => onUpdate("writingTraceable", !draft.writingTraceable)}
                className="h-4 w-4"
              />
              <div>
                <div className="text-sm font-semibold">Traceable</div>
                <div className="text-xs text-[var(--color-text-muted)]">Show faint tracing text on the writing line.</div>
              </div>
            </label>

            {draft.writingTraceable ? (
              <div>
                <label className="block text-sm font-semibold mb-2">Trace Count</label>
                <select
                  value={draft.writingTraceRepeats}
                  onChange={(event) => onUpdate("writingTraceRepeats", Number(event.target.value) as WorksheetDraft["writingTraceRepeats"])}
                  className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm bg-[var(--color-bg-main)]"
                >
                  <option value={1}>1 trace</option>
                  <option value={2}>2 traces</option>
                  <option value={3}>3 traces</option>
                </select>
              </div>
            ) : null}
          </>
        ) : isSentenceScramble ? (
          <>
            <div>
              <label className="block text-sm font-semibold mb-2">Difficulty</label>
              <select
                value={draft.sentenceScrambleLevel}
                onChange={(event) => {
                  const nextLevel = event.target.value as WorksheetDraft["sentenceScrambleLevel"];
                  onUpdate("sentenceScrambleLevel", nextLevel);
                }}
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm bg-[var(--color-bg-main)]"
              >
                <option value="easy">Easy · keeps small word groups together</option>
                <option value="medium">Middle · mixes words nearby</option>
                <option value="hard">Hard · fully scrambles the sentence</option>
              </select>
            </div>

            <button
              onClick={onSentenceScramble}
              className={actionButtonClass}
            >
              Scramble
            </button>
          </>
        ) : isTicTacToe ? (
          <>
            <div>
              <label className="block text-sm font-semibold mb-2">Image Style</label>
              <select
                value={draft.ticTacToeImageMode}
                onChange={(event) => onUpdate("ticTacToeImageMode", event.target.value as WorksheetDraft["ticTacToeImageMode"])}
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm bg-[var(--color-bg-main)]"
              >
                <option value="image">Image only</option>
                <option value="text">Text only</option>
                <option value="both">Image + text</option>
              </select>
            </div>

            <button
              onClick={() => onUpdate("shuffleSeed", Date.now())}
              className={actionButtonClass}
            >
              Randomize Worksheet
            </button>

            <div>
              <label className="block text-sm font-semibold mb-2">Boards Per Page</label>
              <select
                value={draft.ticTacToeBoardCount}
                onChange={(event) =>
                  onUpdate("ticTacToeBoardCount", Number(event.target.value) as WorksheetDraft["ticTacToeBoardCount"])
                }
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm bg-[var(--color-bg-main)]"
              >
                <option value={1}>1 board · large</option>
                <option value={2}>2 boards · medium</option>
                <option value={4}>4 boards · small</option>
                <option value={8}>8 boards · tiny</option>
              </select>
            </div>
          </>
        ) : isWordsearch ? (
          <>
            <div>
              <label className="block text-sm font-semibold mb-2">Difficulty</label>
              <select
                value={draft.difficulty}
                onChange={(event) => onUpdate("difficulty", event.target.value as WorksheetDraft["difficulty"])}
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm bg-[var(--color-bg-main)]"
              >
                <option value="easy">Easy · fewer directions</option>
                <option value="medium">Medium · more directions</option>
                <option value="hard">Hard · backwards words too</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Word List Style</label>
              <select
                value={draft.wordsearchListMode}
                onChange={(event) => onUpdate("wordsearchListMode", event.target.value as WorksheetDraft["wordsearchListMode"])}
                className="w-full rounded-xl border border-black/10 px-4 py-3 text-sm bg-[var(--color-bg-main)]"
              >
                <option value="image">Image only</option>
                <option value="text">Text only</option>
                <option value="both">Image + text</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => onUpdate("wordsearchAddRandomLetters", !draft.wordsearchAddRandomLetters)}
              className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30 ${
                draft.wordsearchAddRandomLetters
                  ? "border border-blue-200 bg-blue-50 text-blue-900"
                  : "border border-black/10 bg-[var(--color-bg-main)] text-[var(--color-text-primary)]"
              }`}
            >
              {draft.wordsearchAddRandomLetters ? "Remove Random Letters" : "Add Random Letters"}
            </button>

            <button
              onClick={() => onUpdate("shuffleSeed", Date.now())}
              className={actionButtonClass}
            >
              {shuffleLabel}
            </button>

            {wordsearchFitSummary ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
                <div className="font-semibold text-amber-950">Word fit note</div>
                <p className="mt-1">
                  This wordsearch currently fits {wordsearchFitSummary.placed} of {wordsearchFitSummary.total} words.{" "}
                  {wordsearchFitSummary.missing === 1
                    ? "1 word"
                    : `${wordsearchFitSummary.missing} words`}{" "}
                  didn&apos;t fit this time. Mix Up the Wordsearch to try new combinations.
                </p>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-2xl border border-dashed bg-[var(--color-bg-main)] px-4 py-5 text-sm text-[var(--color-text-muted)]">
            This worksheet type is listed as a starter type, but its generator options will be added next.
          </div>
        )}
      </div>
    </div>
  );
}
