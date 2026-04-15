"use client";

import { LessonCard } from "@/lib/lessons/types";
import { WorksheetDraft } from "@/lib/worksheets/types";

const WORKSHEET_PRINT_JOB_KEY = "classendo-worksheet-print-job";

export type WorksheetPrintJob = {
  title: string;
  cards: LessonCard[];
  draft: WorksheetDraft;
};

export function writeWorksheetPrintJob(job: WorksheetPrintJob) {
  localStorage.setItem(WORKSHEET_PRINT_JOB_KEY, JSON.stringify(job));
}

export function readWorksheetPrintJob(): WorksheetPrintJob | null {
  try {
    const raw = localStorage.getItem(WORKSHEET_PRINT_JOB_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorksheetPrintJob;
  } catch {
    return null;
  }
}

export function clearWorksheetPrintJob() {
  localStorage.removeItem(WORKSHEET_PRINT_JOB_KEY);
}
