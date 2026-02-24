// components/PersistentToast.tsx
"use client";

import React from "react";

export default function PersistentToast({
  title,
  message,
  onClose,
}: {
  title?: string;
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed right-4 bottom-6 z-60 max-w-sm">
      <div className="bg-white border rounded-lg px-4 py-3 shadow-md">
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && <div className="text-sm font-semibold">{title}</div>}
            <div className="text-sm mt-1">{message}</div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={onClose} className="text-gray-400 ml-4">✕</button>
          </div>
        </div>
      </div>
    </div>
  );
}