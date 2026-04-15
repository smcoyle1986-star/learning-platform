import { LessonRecord } from "@/lib/lessons/types";

type DashboardPreviewModalProps = {
  lesson: LessonRecord | null;
  onClose: () => void;
};

export default function DashboardPreviewModal({
  lesson,
  onClose,
}: DashboardPreviewModalProps) {
  if (!lesson) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{lesson.name}</h3>
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-black"
          >
            Close
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto grid grid-cols-2 gap-3">
          {lesson.cards.map((card, index) => (
            <div
              key={`${card.id}-${index}`}
              className="border rounded-lg p-3 text-sm bg-[var(--color-bg-soft)]"
            >
              {card.image ? (
                <div className="mb-2 w-full h-24 rounded-md bg-white border border-black/5 overflow-hidden flex items-center justify-center">
                  <img
                    src={card.image}
                    alt={card.word || "Card image"}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : null}
              {card.word || "Card"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
