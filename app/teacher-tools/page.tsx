import Link from "next/link";

import { PAGE_CONTENT } from "@/lib/seo/page-content";

export default function ComingSoonPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center
      bg-[var(--color-bg-main)] text-center px-6">

      <h1 className="text-4xl md:text-5xl font-bold mb-4">
        Coming Soon 🚀
      </h1>

      <p className="text-lg leading-8 text-[var(--color-text-muted)] max-w-2xl mb-8">
        {PAGE_CONTENT.teacherTools.description} This page is currently under development and will be available soon.
      </p>

      <Link
        href="/"
        className="px-6 py-3 rounded-xl bg-[var(--color-primary)]
        text-white transition hover:opacity-90"
      >
        Back to Home
      </Link>
    </div>
  );
}
