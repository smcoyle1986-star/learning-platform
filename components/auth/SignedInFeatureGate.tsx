"use client";

import Link from "next/link";

import { useAuth } from "@/components/AuthProvider";

export default function SignedInFeatureGate({
  children,
  publicFallback,
  featureName,
  nextPath,
  description,
}: {
  children: React.ReactNode;
  publicFallback?: React.ReactNode;
  featureName: string;
  nextPath: string;
  description?: string;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    if (publicFallback) return <>{publicFallback}</>;
    return (
      <main className="min-h-[55vh] bg-[var(--color-bg-main)] px-6 py-12 text-[#2f3a2f]">
        <section className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold">{featureName}</h1>
          {description ? <p className="mt-4 text-sm leading-7 text-[#5f695e] md:text-base">{description}</p> : null}
        </section>
      </main>
    );
  }

  if (user) return <>{children}</>;

  if (publicFallback) return <>{publicFallback}</>;

  const next = encodeURIComponent(nextPath);

  return (
    <main className="fixed inset-0 z-[200] flex min-h-screen items-center justify-center overflow-y-auto bg-[var(--color-bg-main)] px-4 py-16">
      <section className="w-full max-w-lg rounded-[2rem] border border-[#d9e2d0] bg-white p-7 text-center shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:p-10">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#6f895f]">Free account required</p>
        <h1 className="mt-3 text-3xl font-semibold text-[#2f3a2f]">Sign in to use {featureName}</h1>
        {description ? (
          <p className="mt-4 text-sm leading-7 text-[#5f695e]">{description}</p>
        ) : null}
        <p className="mt-4 text-sm leading-7 text-[#5f695e]">
          Without signing up, guests can build a temporary six-card lesson using free Image 1 flashcards and use it in Classroom Mode, Printables, and Lesson Plans. Create a free account to unlock this area.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <Link href={`/signup?next=${next}`} className="btn btn-primary px-4 py-3 text-sm">Create free account</Link>
          <Link href={`/login?next=${next}`} className="btn btn-secondary px-4 py-3 text-sm">Log in</Link>
        </div>
        <Link href="/flashcards" className="mt-5 inline-block text-sm font-semibold text-[#617857] hover:text-[#40523b]">
          Continue as a guest with flashcards
        </Link>
      </section>
    </main>
  );
}
