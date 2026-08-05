"use client";

import Link from "next/link";
import { X } from "lucide-react";

export default function GuestFlashcardPrompt({
  open,
  onClose,
  title = "Your guest tray is full",
  description = "Guests can use up to 6 flashcards in a temporary lesson. Create a free account to build larger sets, save them, and use them again later.",
  nextPath = "/flashcards",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  nextPath?: string;
}) {
  if (!open) return null;
  const next = encodeURIComponent(nextPath);

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 px-4" role="dialog" aria-modal="true" aria-labelledby="guest-flashcard-title">
      <div className="relative w-full max-w-md rounded-[2rem] border border-[#d9e2d0] bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.22)]">
        <button type="button" onClick={onClose} className="absolute right-5 top-5 rounded-full border border-[#dfe5da] p-1.5 text-[#758071] hover:bg-[#f4f7f1]" aria-label="Close signup prompt">
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#6f895f]">Free guest lesson</p>
        <h2 id="guest-flashcard-title" className="mt-3 pr-8 text-2xl font-semibold text-[#2f3a2f]">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-[#5f695e]">{description}</p>
        <p className="mt-4 rounded-xl bg-[#f3f7f0] px-4 py-3 text-xs leading-5 text-[#657362]">
          Your current temporary cards will be brought into your account when you sign up or log in in this browser session.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <Link href={`/signup?next=${next}`} className="btn btn-primary px-4 py-3 text-center text-sm">Create free account</Link>
          <Link href={`/login?next=${next}`} className="btn btn-secondary px-4 py-3 text-center text-sm">Log in</Link>
        </div>
        <button type="button" onClick={onClose} className="mt-3 w-full px-4 py-2 text-sm font-semibold text-[#6d7869] hover:text-[#3f4c3d]">Continue with 6 cards</button>
      </div>
    </div>
  );
}
