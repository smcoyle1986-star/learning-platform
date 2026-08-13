"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import BrandButton from "@/components/BrandButton";

import { supabase } from "@/lib/supabase/client";
import HeaderAuth from "@/components/HeaderAuth";
import PersistentToast from "@/components/PersistentToast";
import LandingCarousel from "@/components/landing/LandingCarousel";
import { LANDING_HERO_DESCRIPTION, LANDING_HERO_TITLE, LANDING_SECTIONS } from "@/lib/landing/content";
import LandingHomepageSections from "@/components/landing/LandingHomepageSections";
import { useAuth } from "@/components/AuthProvider";

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  /* ---------------------------
     AUTH CHECK (single source)
     - Only getSession() here; do not use getUser()
  ---------------------------- */
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;

        if (data?.session) {
          setEmail(data.session.user.email ?? null);
        }

        setLoading(false);
      } catch (err) {
        console.error("Auth check failed:", err);
        setLoading(false);
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  /* ---------------------------
     TOAST HANDLING
  ---------------------------- */
  useEffect(() => {
    const signedIn = searchParams.get("signed_in");
    const signedUp = searchParams.get("signed_up");

    if (!signedIn && !signedUp) return;

    const run = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data?.session) {
        // no session: clean URL and return
        router.replace("/");
        return;
      }

      if (signedIn) {
        setToastMsg("You are now signed in.");
        setToastVisible(true);
      }

      if (signedUp) {
        setToastMsg("Signup successful — check your email if confirmation is required.");
        setToastVisible(true);
      }

      // clean URL
      router.replace("/");
    };

    const t = setTimeout(run, 200);
    return () => clearTimeout(t);
  }, [searchParams, router]);

  function closeToast() {
    setToastVisible(false);
    setToastMsg(null);
  }

  /* ---------------------------
     LOADING
  ---------------------------- */
  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f6f2] px-6 py-24 text-[#2f3a2f]">
        <section className="mx-auto max-w-7xl">
          <h1 className="max-w-3xl whitespace-pre-line text-4xl font-semibold leading-tight md:text-6xl">
            {LANDING_HERO_TITLE}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5c665c]">
            {LANDING_HERO_DESCRIPTION}
          </p>
        </section>
      </main>
    );
  }

  const isLoggedIn = Boolean(email);
  const displayName = profile?.username || profile?.display_name || email;

  /* ---------------------------------
     Shared helpers for header links
  ----------------------------------*/
  const getSectionHref = (section: (typeof LANDING_SECTIONS)[number]) =>
    isLoggedIn || section.slug === "flashcards" || section.slug === "printables" || section.slug === "lessons"
      ? section.href
      : `/preview/${section.slug}`;
  const goToSection = (section: (typeof LANDING_SECTIONS)[number]) => router.push(getSectionHref(section));
  const goToFlashcards = () => router.push("/flashcards");
  const heroButtonLabel = isLoggedIn ? "Start with Flashcards" : "Try Flashcards Free";

  /* =====================================================
     LOGGED-IN APP HOMEPAGE
     - Now matches the marketing layout but with authenticated routing
     - "Teacher Login" link removed; HeaderAuth still shown for user controls
  ====================================================== */
  if (isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#f7f6f2] text-[#2f3a2f]">
        {/* ---------------- Header ---------------- */}
        <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <BrandButton className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80" />

          <nav className="flex flex-wrap items-center justify-end gap-2 text-sm">
            {LANDING_SECTIONS.map((section) => (
              <button
                key={section.slug}
                onClick={() => goToSection(section)}
                className="btn btn-secondary"
              >
                {section.title}
              </button>
            ))}

            <div className="ml-2">
              <HeaderAuth />
            </div>
          </nav>
        </header>

        {/* ---------------- Hero (same marketing layout) ---------------- */}
        <main className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div>
            <h2 className="text-5xl font-semibold leading-tight mb-6 whitespace-pre-line">
              {LANDING_HERO_TITLE}
            </h2>

            <p className="text-lg text-[#5c665c] mb-8 max-w-xl">
              {LANDING_HERO_DESCRIPTION}
            </p>

            <div className="flex items-center gap-4">
              <button onClick={goToFlashcards} className="btn btn-primary px-8 py-4">
                {heroButtonLabel}
              </button>
              <span className="text-sm font-medium text-[var(--color-text-muted)]">
                Welcome{displayName ? `, ${displayName}` : ""}
              </span>
            </div>
          </div>

          <LandingCarousel />
        </main>

        <LandingHomepageSections
          isLoggedIn={true}
          primaryCtaHref="/flashcards"
          primaryCtaLabel="Start Free"
        />
      </div>
    );
  }

  /* =====================================================
     LOGGED-OUT MARKETING HOMEPAGE
     - Uses marketing header provided
     - Brand is large and blue
     - Nav has Lessons removed; Games replaced with Dashboard (links to login for logged-out)
     - All primary CTAs route to /login or /signup when logged out
     - Smart Cards restored in How it works
  ====================================================== */
  return (
    <div className="min-h-screen bg-[#f7f6f2] text-[#2f3a2f]">
      {/* ---------------- Header ---------------- */}
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <BrandButton className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80" />

        <nav className="flex flex-wrap items-center justify-end gap-2 text-sm">
          {LANDING_SECTIONS.map((section) => (
            <button
              key={section.slug}
              onClick={() => goToSection(section)}
              className="btn btn-secondary"
            >
              {section.title}
            </button>
          ))}

          <Link href="/free-resources" className="btn btn-secondary">
            Free Lesson Packs
          </Link>

          <a href="/login" className="btn btn-secondary ml-1">
            Teacher Login
          </a>
        </nav>
      </header>

        {/* ---------------- Hero ---------------- */}
      <section className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-12 items-center">
        {/* Text */}
        <div>
          <h2 className="text-5xl font-semibold leading-tight mb-6 whitespace-pre-line">
            {LANDING_HERO_TITLE}
          </h2>

          <p className="text-lg text-[#5c665c] mb-8 max-w-xl">
            {LANDING_HERO_DESCRIPTION}
          </p>

          <div className="flex items-center gap-4">
            <button onClick={goToFlashcards} className="btn btn-primary px-8 py-4">
              {heroButtonLabel}
            </button>

            <a
              onClick={() => router.push("/login")}
              className="text-sm font-medium underline underline-offset-4 cursor-pointer"
            >
              Sign in as a Teacher →
            </a>
          </div>
        </div>

        <LandingCarousel />
      </section>

      <LandingHomepageSections
        isLoggedIn={false}
        primaryCtaHref="/flashcards"
        primaryCtaLabel="Try Flashcards Free"
      />
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<p className="p-10">Loading...</p>}>
      <HomePageContent />
    </Suspense>
  );
}
