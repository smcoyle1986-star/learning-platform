"use client";

type SaveLessonDialogsProps = {
  showSaveModal: boolean;
  lessonName: string;
  isPublic: boolean;
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
  onReturnToFlashcards: () => void;
  showSaveSuccessModal: boolean;
  onCloseSaveSuccessModal: () => void;
  onGoDashboardAfterSave: () => void;
  onReturnToFlashcardsAfterSave: () => void;
};

export default function SaveLessonDialogs({
  showSaveModal,
  lessonName,
  isPublic,
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
  onReturnToFlashcards,
  showSaveSuccessModal,
  onCloseSaveSuccessModal,
  onGoDashboardAfterSave,
  onReturnToFlashcardsAfterSave,
}: SaveLessonDialogsProps) {
  return (
    <>
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-[90%] max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Save To Dashboard</h2>

            <input
              type="text"
              value={lessonName}
              onChange={(event) => onLessonNameChange(event.target.value)}
              placeholder="Enter lesson name"
              className="w-full mb-3 px-3 py-2 rounded-lg border border-black/10 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />

            {nameError ? (
              <p className="mb-3 text-sm text-red-600">{nameError}</p>
            ) : null}

            <div className="flex items-center justify-between mb-5">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={onTogglePublic}
                  aria-label="Make lesson public"
                  className="w-4 h-4"
                />
                <span className="select-none">
                  {isPublic ? "Public — visible in Community" : "Private — only visible to you"}
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={onCancelSave}
                className="px-4 py-2 rounded-lg border border-black/10 bg-[var(--color-bg-soft)] text-sm hover:bg-white transition"
              >
                Cancel
              </button>

              <button
                onClick={onSaveLesson}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 transition"
              >
                Save Lesson
              </button>
            </div>
          </div>
        </div>
      )}

      {showReplaceConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Lesson already exists</h3>

            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              A lesson with this name is already saved. Do you want to replace it or change the
              name?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={onCancelReplace}
                className="px-4 py-2 rounded-lg border border-black/10 bg-[var(--color-bg-soft)] text-sm hover:bg-white transition"
              >
                Change name
              </button>

              <button
                onClick={onReplaceLesson}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 transition"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}

      {showSaveLimitModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Maximum saves reached</h3>

            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              This account has reached the maximum number of dashboard saves. Delete a saved set in
              Dashboard to make space, or return to Flashcards.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={onReturnToFlashcards}
                className="px-4 py-2 rounded-lg border border-black/10 bg-[var(--color-bg-soft)] text-sm hover:bg-white transition"
              >
                Back to Flashcards
              </button>

              <button
                onClick={onGoDashboardToDelete}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 transition"
              >
                Go to Dashboard
              </button>
            </div>

            <button
              onClick={onCloseSaveLimitModal}
              className="mt-4 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showSaveSuccessModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold mb-2">Saved to Dashboard</h3>

            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              Your lesson set was saved successfully. You can go to Dashboard now or stay in
              Flashcards and keep building.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={onReturnToFlashcardsAfterSave}
                className="px-4 py-2 rounded-lg border border-black/10 bg-[var(--color-bg-soft)] text-sm hover:bg-white transition"
              >
                Back to Flashcards
              </button>

              <button
                onClick={onGoDashboardAfterSave}
                className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm hover:opacity-90 transition"
              >
                Go to Dashboard
              </button>
            </div>

            <button
              onClick={onCloseSaveSuccessModal}
              className="mt-4 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
