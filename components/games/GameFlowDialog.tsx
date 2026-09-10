"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
export function GameFlowDialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} aria-label={title} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-3xl border border-[#dce5d8] bg-white p-0 text-[#2f3a2f] shadow-2xl backdrop:bg-black/45">
    <div className="p-5 sm:p-7"><div className="mb-5 flex items-center justify-between gap-4"><h2 className="text-2xl font-bold">{title}</h2>
      <button autoFocus onClick={onClose} className="btn btn-secondary p-2" aria-label="Close dialog"><X size={20} /></button></div>{children}</div>
  </dialog>;
}
