"use client";

type SaveLessonDialogsProps = {
  showSaveModal: boolean;
  lessonName: string;
  isPublic: boolean;
  onLessonNameChange: (value: string) => void;
  onTogglePublic: () => void;
  onCancelSave: () => void;
  onSaveLesson: () => void;
  showReplaceConfirm: boolean;
  onCancelReplace: () => void;
  onReplaceLesson: () => void;
};

export default function SaveLessonDialogs({
  showSaveModal,
  lessonName,
  isPublic,
  onLessonNameChange,
  onTogglePublic,
  onCancelSave,
  onSaveLesson,
  showReplaceConfirm,
  onCancelReplace,
  onReplaceLesson,
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
    </>
  );
}
