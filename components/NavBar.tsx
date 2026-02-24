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
        <nav className="flex items-center gap-3">
          <Link
            href="/flashcards"
            className="btn btn-secondary"
          >
            Flashcards
          </Link>

          <Link
            href="/printables"
            className="btn btn-secondary"
          >
            Printables
          </Link>

          <Link
            href="/login"
            className="btn btn-secondary"
          >
            Log in
          </Link>

          <Link
            href="/flashcards"
            className="btn btn-secondary"
          >
            Start Now
          </Link>
        </nav>
      </div>
    </header>
  );
}
