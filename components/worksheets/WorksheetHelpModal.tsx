"use client";

import { X } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import type { WorksheetTypeOption } from "@/lib/worksheets/types";

type HelpContent = {
  summary: string;
  steps: string[];
  bestFor: string;
};

const HELP: Record<WorksheetTypeOption["id"], HelpContent> = {
  crossword: {
    summary: "Students solve a word grid using the image, text, or combined clues at the bottom of the page.",
    steps: ["Choose a difficulty and clue style.", "Mix the crossword to try a new layout.", "Print a student copy or export a PDF."],
    bestFor: "vocabulary recall, spelling, and quiet individual practice.",
  },
  bullseye: {
    summary: "Students drop a small token onto the board, then say or use the vocabulary item where it lands.",
    steps: ["Choose Points or Around the World.", "Mix the board to rearrange the lesson words.", "Print for teams to play together."],
    bestFor: "quick speaking practice and team review.",
  },
  matching: {
    summary: "Students match each lesson picture with its word, making a simple visual vocabulary activity.",
    steps: ["Choose the picture and word style.", "Mix the worksheet to shuffle the matches.", "Print a fresh copy for pairs or individuals."],
    bestFor: "early vocabulary recognition and independent review.",
  },
  battleship: {
    summary: "Students call grid coordinates and identify the matching vocabulary as they play the classic guessing game.",
    steps: ["Choose a clear board or a board with ships.", "Set the image and word style.", "Print one copy for each player."],
    bestFor: "pair work, speaking practice, and coordinate language.",
  },
  questions: {
    summary: "Build your own image-supported questions directly on the worksheet preview.",
    steps: ["Type a question beside each image.", "Add or remove rows as needed.", "Print when the prompts are ready."],
    bestFor: "teacher-led discussion, speaking prompts, and assessments.",
  },
  reading: {
    summary: "Use the lesson cards as visual cues alongside short reading lines for students to read and respond to.",
    steps: ["Edit the reading line for each card.", "Use the images as comprehension support.", "Print for guided or independent reading."],
    bestFor: "supported reading and vocabulary in context.",
  },
  "sentence-scramble": {
    summary: "Students put mixed-up words back into the correct sentence order using the lesson images as cues.",
    steps: ["Write or edit a sentence for each image.", "Choose a scramble level and mix the sentences.", "Print for sentence-building practice."],
    bestFor: "word order, grammar, and writing practice.",
  },
  "tic-tac-toe": {
    summary: "Students choose a square, say or use its vocabulary item, and work to make three in a row.",
    steps: ["Choose picture, text, or both.", "Pick the number of boards per page.", "Print for pairs or small teams."],
    bestFor: "fast speaking review and low-prep pair games.",
  },
  wordsearch: {
    summary: "Students find the lesson words hidden in a letter grid, using the clue list at the bottom for support.",
    steps: ["Choose difficulty and clue-list style.", "Add random letters for a fuller puzzle if needed.", "Mix the wordsearch for a new grid."],
    bestFor: "word recognition, spelling, and calm independent practice.",
  },
  writing: {
    summary: "Students practise handwriting by writing or tracing lesson words beside their picture cues.",
    steps: ["Choose the cue style and tracing option.", "Set how many traceable repeats appear.", "Edit each writing line in the preview."],
    bestFor: "handwriting, spelling, and vocabulary consolidation.",
  },
};

export default function WorksheetHelpModal({ worksheetType, forceOpen = false }: { worksheetType: WorksheetTypeOption; forceOpen?: boolean }) {
  const { user } = useAuth();
  const titleId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const content = HELP[worksheetType.id];

  useEffect(() => {
    let active = true;

    function readPreference() {
      if (forceOpen) {
        if (active) {
          setIsOpen(true);
          setIsLoading(false);
        }
        return;
      }
      if (!user) {
        if (active) {
          setIsOpen(false);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      const dismissed = Array.isArray(user.user_metadata?.worksheet_help_dismissed)
        ? user.user_metadata.worksheet_help_dismissed
        : [];
      setIsOpen(!dismissed.includes(worksheetType.id));
      setIsLoading(false);
    }

    readPreference();
    return () => { active = false; };
  }, [forceOpen, user, worksheetType.id]);

  async function dismissPermanently() {
    if (!user) return;

    setIsOpen(false);
    const dismissed = Array.isArray(user.user_metadata?.worksheet_help_dismissed)
      ? user.user_metadata.worksheet_help_dismissed
      : [];
    if (dismissed.includes(worksheetType.id)) return;

    const { error: updateError } = await supabase
      .auth
      .updateUser({ data: { worksheet_help_dismissed: [...dismissed, worksheetType.id] } });
    if (updateError) console.warn("Failed to save worksheet help preference:", updateError);
  }

  if (isLoading || !isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]">
      <section role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-[min(88dvh,42rem)] w-full max-w-lg overflow-y-auto rounded-[28px] border border-white/20 bg-white p-6 shadow-[0_30px_100px_rgba(15,23,42,0.32)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{worksheetType.label}</div>
            <h2 id={titleId} className="mt-2 text-2xl font-extrabold text-slate-900">How {worksheetType.label} Works</h2>
          </div>
          <button type="button" onClick={() => setIsOpen(false)} className="h-9 w-9 shrink-0 rounded-full border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30" aria-label={`Close ${worksheetType.label} help`}>
            <X aria-hidden="true" className="mx-auto h-4 w-4" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-700">{content.summary}</p>
        <ol className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
          {content.steps.map((step, index) => <li key={step} className="flex gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">{index + 1}</span><span>{step}</span></li>)}
        </ol>
        <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"><span className="font-semibold text-slate-900">Best for:</span> {content.bestFor}</p>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          <button type="button" onClick={() => setIsOpen(false)} className="btn btn-secondary px-4 py-2 text-sm">Got it</button>
          <button type="button" onClick={() => void dismissPermanently()} className="btn btn-primary px-4 py-2 text-sm">Don&apos;t show again</button>
        </div>
      </section>
    </div>
  );
}
