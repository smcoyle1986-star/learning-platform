"use client";

import {
  AlertTriangle,
  CheckCircle2,
  LayoutDashboard,
  Presentation,
  Save,
  X,
} from "lucide-react";
import type { ReactNode } from "react";

type SaveLessonDialogsProps = {
  showSaveModal: boolean;
  lessonName: string;
  lessonCardCount: number;
  isPublic: boolean;
  isSaving: boolean;
  nameError?: string;
  onLessonNameChange: (value: string) => void;
  onTogglePublic: () => void;
  onCancelSave: () => void;
  onSaveLesson: () => void;
  showReplaceConfirm: boolean;
  onCancelReplace: () => void;
  onReplaceLesson: () => void;
  showSaveLimitModal: boolean;
  onCloseSaveLimitModal: () => void;
  onGoDashboardToDelete: () => void;
  onUpgradeFromLimit: () => void;
  onReturnToFlashcards: () => void;
  showSaveSuccessModal: boolean;
  onCloseSaveSuccessModal: () => void;
  onGoDashboardAfterSave: () => void;
  onGoClassroomAfterSave: () => void;
  onReturnToFlashcardsAfterSave: () => void;
};

function ModalShell({
  children,
  onClose,
  labelledBy,
  layer = "z-50",
}: {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
  layer?: string;
}) {
  return (
    <div className={`fixed inset-0 ${layer} flex items-center justify-center bg-black/45 px-4 py-8`}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative w-full max-w-lg rounded-[2rem] border border-[#dfe5d9] bg-white p-6 shadow-[0_24px_70px_rgba(47,58,47,0.22)] sm:p-7"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>
        {children}
      </section>
    </div>
  );
}

function ModalHeading({ eyebrow, title, description, id }: {
  eyebrow: string;
  title: string;
  description: string;
  id: string;
}) {
  return (
    <div className="pr-10">
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#6f895f]">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-2xl font-semibold text-[#2f3a2f]">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-[#687268]">{description}</p>
    </div>
  );
}

export default function SaveLessonDialogs({
  showSaveModal,
  lessonName,
  lessonCardCount,
  isPublic,
  isSaving,
  nameError,
  onLessonNameChange,
  onTogglePublic,
  onCancelSave,
  onSaveLesson,
  showReplaceConfirm,
  onCancelReplace,
  onReplaceLesson,
  showSaveLimitModal,
  onCloseSaveLimitModal,
  onGoDashboardToDelete,
  onUpgradeFromLimit,
  onReturnToFlashcards,
  showSaveSuccessModal,
  onCloseSaveSuccessModal,
  onGoDashboardAfterSave,
  onGoClassroomAfterSave,
  onReturnToFlashcardsAfterSave,
}: SaveLessonDialogsProps) {
  return (
    <>
      {showSaveModal && !showReplaceConfirm ? (
        <ModalShell onClose={onCancelSave} labelledBy="save-lesson-title">
          <ModalHeading
            eyebrow="Save lesson set"
            title="Save to Dashboard"
            description={`Save this ${lessonCardCount}-card lesson so it is ready to reuse across Classendo.`}
            id="save-lesson-title"
          />

          <form
            className="mt-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (!isSaving) onSaveLesson();
            }}
          >
            <label htmlFor="lesson-save-name" className="text-sm font-semibold text-[#384638]">
              Lesson name
            </label>
            <input
              id="lesson-save-name"
              type="text"
              value={lessonName}
              onChange={(event) => onLessonNameChange(event.target.value)}
              placeholder="For example, Animals and Habitats"
              autoFocus
              disabled={isSaving}
              aria-invalid={Boolean(nameError)}
              aria-describedby={nameError ? "lesson-save-error" : undefined}
              className={`mt-2 w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition focus:ring-2 disabled:bg-slate-50 ${
                nameError
                  ? "border-red-300 focus:border-red-400 focus:ring-red-100"
                  : "border-[#d7ddd1] focus:border-[#86a96a] focus:ring-[#e5efdf]"
              }`}
            />

            {nameError ? (
              <p id="lesson-save-error" className="mt-2 text-sm text-red-600">{nameError}</p>
            ) : null}

            <div className="mt-5 rounded-2xl border border-[#dfe5d9] bg-[#f7faf5] p-4">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={onTogglePublic}
                  disabled={isSaving}
                  aria-label="Make lesson public"
                  className="mt-0.5 h-5 w-5 rounded border-[#b8c5b2] accent-[#6f895f]"
                />
                <span>
                  <span className="block text-sm font-semibold text-[#384638]">
                    {isPublic ? "Public" : "Private"}
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-[#687268]">
                    {isPublic
                      ? "Other teachers can discover and copy this set from Community."
                      : "Only you can access this set from your Dashboard."}
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={onCancelSave} disabled={isSaving} className="btn btn-secondary px-5 py-2.5 disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={isSaving || !lessonName.trim()} className="btn btn-primary px-5 py-2.5 disabled:cursor-not-allowed disabled:opacity-55">
                <Save size={16} />
                {isSaving ? "Saving…" : "Save to Dashboard"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {showReplaceConfirm ? (
        <ModalShell onClose={onCancelReplace} labelledBy="replace-lesson-title">
          <ModalHeading
            eyebrow="Duplicate name"
            title="A set with this name is already saved"
            description="Choose a different name, or replace the existing Dashboard set with the cards currently in your lesson tray."
            id="replace-lesson-title"
          />

          <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <AlertTriangle className="mt-0.5 shrink-0" size={18} />
            Replacing updates the existing set. This action cannot be undone automatically.
          </div>

          {nameError ? <p className="mt-3 text-sm text-red-600">{nameError}</p> : null}

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancelReplace} disabled={isSaving} className="btn btn-secondary px-5 py-2.5 disabled:opacity-50">
              Change name
            </button>
            <button type="button" onClick={onReplaceLesson} disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-55">
              {isSaving ? "Replacing…" : "Replace existing set"}
            </button>
          </div>
        </ModalShell>
      ) : null}

      {showSaveLimitModal ? (
        <ModalShell onClose={onCloseSaveLimitModal} labelledBy="save-limit-title" layer="z-[60]">
          <ModalHeading
            eyebrow="Dashboard storage"
            title="Dashboard save limit reached"
            description="Manage your saved sets to make space, or upgrade to Premium for additional Dashboard storage."
            id="save-limit-title"
          />

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <button type="button" onClick={onReturnToFlashcards} className="btn btn-secondary px-5 py-2.5">
              Keep building
            </button>
            <button type="button" onClick={onGoDashboardToDelete} className="btn btn-secondary px-5 py-2.5">
              <LayoutDashboard size={16} /> Manage saved sets
            </button>
            <button type="button" onClick={onUpgradeFromLimit} className="btn btn-primary px-5 py-2.5">
              Upgrade to Premium
            </button>
          </div>
        </ModalShell>
      ) : null}

      {showSaveSuccessModal ? (
        <ModalShell onClose={onCloseSaveSuccessModal} labelledBy="save-success-title" layer="z-[60]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f2e2] text-[#638054]">
            <CheckCircle2 size={26} />
          </div>
          <div className="mt-4">
            <ModalHeading
              eyebrow="Save complete"
              title="Saved to Dashboard"
              description={`Your ${lessonCardCount}-card lesson set is saved and ready to use again.`}
              id="save-success-title"
            />
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            <button type="button" onClick={onReturnToFlashcardsAfterSave} className="btn btn-secondary px-5 py-2.5">
              Keep building
            </button>
            <button type="button" onClick={onGoDashboardAfterSave} className="btn btn-secondary px-5 py-2.5">
              <LayoutDashboard size={16} /> Open Dashboard
            </button>
            <button type="button" onClick={onGoClassroomAfterSave} className="btn btn-primary px-5 py-2.5">
              <Presentation size={16} /> Go to Classroom
            </button>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
