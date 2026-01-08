"use client";

import Link from "next/link";

export default function NavBar() {
  return (
    <header className="sticky top-0 z-50 bg-[var(--color-bg-main)]/80 backdrop-blur-md border-b border-black/5">
      <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
        {/* Logo */}
        <Link
          href="/"
          className="text-4xl md:text-5xl font-extrabold tracking-tight text-blue-700"
        >
          ClassBloom
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-6">
          <Link
            href="/flashcards"
            className="text-sm hover:underline"
          >
            Flashcards
          </Link>

          <Link
            href="/classroom"
            className="text-sm hover:underline"
          >
            Classroom
          </Link>

          <Link
            href="/printables"
            className="text-sm hover:underline"
          >
            Printables
          </Link>

          <Link
            href="/login"
            className="text-sm hover:underline"
          >
            Log in
          </Link>

          <Link
            href="/flashcards"
            className="px-5 py-2 rounded-xl bg-[var(--color-primary)]
            text-white text-sm transition-all duration-200
            hover:-translate-y-0.5 hover:opacity-90"
          >
            Start Now
          </Link>
        </nav>
      </div>
    </header>
  );
}
