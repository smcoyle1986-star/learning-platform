"use client";

import { LessonCard } from "@/lib/lessons/types";

type EditorCardRowProps = {
  card: LessonCard;
  index: number;
  imageUrl: string;
  onWordChange: (id: string, value: string) => void;
  onReset: (id: string) => void;
};

function formatWord(word?: string) {
  return (word ?? "").toString().replace(/_/g, " ");
}

export default function EditorCardRow({
  card,
  index,
  imageUrl,
  onWordChange,
  onReset,
}: EditorCardRowProps) {
  return (
    <div className="flex gap-4 p-4 border rounded bg-white">
      <div className="w-36 flex-shrink-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={formatWord(card.word)}
            className="w-36 h-24 border rounded object-contain bg-white"
          />
        ) : (
          <div className="w-36 h-24 border rounded flex items-center justify-center text-xs text-gray-300">
            No image
          </div>
        )}
      </div>

      <div className="flex-1">
        <label className="block text-xs font-semibold text-gray-600">Word / phrase</label>
        <input
          value={card.word ?? ""}
          onChange={(event) => onWordChange(card.id, event.target.value)}
          className="w-full p-2 border rounded mt-1"
          placeholder="Card text"
        />
      </div>

      <div className="w-32 flex flex-col items-end justify-between">
        <div className="text-xs text-gray-500">#{index + 1}</div>

        <button
          onClick={() => onReset(card.id)}
          className="btn btn-secondary px-3 py-1 text-sm"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
