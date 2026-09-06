"use client";

import Link from "next/link";
import { X } from "lucide-react";

type DemoTutorialProps = {
  title: string;
  description: string;
  nextHref: string;
  nextLabel: string;
  onClose: () => void;
  onNext?: () => void;
  closeHref?: string;
  showClose?: boolean;
};

export function DemoTutorial({ title, description, nextHref, nextLabel, onClose, onNext, closeHref, showClose = true }: DemoTutorialProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 p-4" role="dialog" aria-modal="true" aria-labelledby="demo-tutorial-title">
      <div className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.3)] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div className="rounded-full bg-[#edf5e9] px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#587846]">Animals demo</div>
          {showClose ? <button type="button" onClick={onClose} className="-mr-2 -mt-2 rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800" aria-label="Close tutorial message">
              <X size={20} />
            </button> : null}
        </div>
        <h2 id="demo-tutorial-title" className="mt-5 text-2xl font-bold tracking-tight text-[#2f3a2f]">{title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#5d695b]">{description}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {showClose && closeHref ? (
            <Link href={closeHref} onClick={onClose} className="btn btn-secondary bg-white px-4 py-2.5 text-sm">Close</Link>
          ) : showClose ? (
            <button type="button" onClick={onClose} className="btn btn-secondary bg-white px-4 py-2.5 text-sm">Close</button>
          ) : null}
          <Link href={nextHref} onClick={onNext} className="btn btn-primary px-4 py-2.5 text-sm">{nextLabel}</Link>
        </div>
      </div>
    </div>
  );
}

export function DemoNextStep({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="fixed bottom-5 right-5 z-40 rounded-full border border-[#c8ddbb] bg-white/95 px-4 py-2.5 text-sm font-bold text-[#4e6d40] shadow-[0_14px_35px_rgba(55,80,47,0.16)] backdrop-blur transition hover:-translate-y-0.5 hover:bg-[#f4f9f1]">
      {children}
    </Link>
  );
}
