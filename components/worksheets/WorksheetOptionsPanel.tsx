"use client";

import { useEffect, useState } from "react";

import { WorksheetDraft, WorksheetTypeOption } from "@/lib/worksheets/types";

type WorksheetOptionsPanelProps = {
  worksheetType: WorksheetTypeOption;
  draft: WorksheetDraft;
  onUpdate: <K extends keyof WorksheetDraft>(key: K, value: WorksheetDraft[K]) => void;
};

export default function WorksheetOptionsPanel({
  worksheetType,
  draft,
  onUpdate,
}: WorksheetOptionsPanelProps) {
  const [showBullseyeHelp, setShowBullseyeHelp] = useState(false);
  const isCrossword = worksheetType.id === "crossword";
  const isBullseye = worksheetType.id === "bullseye";
  const shuffleLabel = isBullseye ? "Mix Up the Board" : "Mix Up the Crossword";

  useEffect(() => {
    if (isBullseye) setShowBullseyeHelp(true);
  }, [isBullseye]);

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
                className="h-9 w-9 rounded-full border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
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
              className="btn btn-secondary w-full px-4 py-3"
            >
              {shuffleLabel}
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
              className="btn btn-secondary w-full px-4 py-3"
            >
              Mix Up the Board
            </button>
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
