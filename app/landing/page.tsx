"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HeaderAuth from "@/components/HeaderAuth";
import LandingCarousel from "@/components/landing/LandingCarousel";
import PageHeader from "@/components/navigation/PageHeader";
import { LANDING_HERO_DESCRIPTION, LANDING_HERO_TITLE } from "@/lib/landing/content";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";

function QuickLinkCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[1.75rem] border border-[#e2e6da] bg-white p-5 shadow-[0_14px_30px_rgba(54,64,46,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_42px_rgba(54,64,46,0.12)]"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-[#2f3a2f]">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#5c665c]">{description}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#dbe3d1] bg-[#f7faf4] text-[#6d8160] transition group-hover:bg-white">
          →
        </div>
      </div>
    </Link>
  );
}

function LandingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();
  const { access } = useBillingAccess();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);
  const [premiumWelcomeDismissed, setPremiumWelcomeDismissed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (!mounted) return;

        if (!data.session) {
          router.push("/login");
          return;
        }

        setEmail(data.session.user.email ?? null);
        setLoading(false);
      } catch (error) {
        console.warn("LandingPage: authentication is unavailable:", error);
        if (!mounted) return;
        setLoading(false);
        router.push("/login");
      }
    };

    void checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  useEffect(() => {
    const signedIn = searchParams.get("signed_in");
    const signedUp = searchParams.get("signed_up");

    if (!signedIn && !signedUp) return;

    const run = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session) {
          router.replace("/");
          return;
        }
      } catch (error) {
        console.warn("LandingPage: authentication is unavailable:", error);
      }

      if (signedIn || signedUp) {
        router.replace("/");
      }
    };

    const timeout = setTimeout(run, 200);
    return () => clearTimeout(timeout);
  }, [searchParams, router]);

  const displayName = profile?.username || profile?.display_name || email;
  const showPremiumWelcome =
    searchParams.get("premium") === "welcome" &&
    Boolean(access?.isPremium) &&
    !premiumWelcomeDismissed;
  const quickLinks = useMemo(
    () => [
      {
        title: "Flashcards",
        description: "Build and save the lesson tray you want to teach.",
        href: "/flashcards",
      },
      {
        title: "Lesson Plans",
        description: "Plan a 50-minute classroom flow from the same cards.",
        href: "/lessons",
      },
      {
        title: "Games",
        description: "Turn your cards into big whole-class activities.",
        href: "/games",
      },
      {
        title: "Worksheets",
        description: "Make practice pages straight from your lesson tray.",
        href: "/worksheets",
      },
      {
        title: "Printables",
        description: "Export clean classroom sheets in a few clicks.",
        href: "/printables",
      },
      {
        title: "Community",
        description: "Browse and share teacher-made lesson sets.",
        href: "/teacher/community",
      },
    ],
    []
  );

  if (loading) {
    return <p className="p-10">Loading...</p>;
  }

  const closePremiumWelcome = () => {
    setPremiumWelcomeDismissed(true);
    router.replace("/landing");
  };

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#2f3a2f]">
      <PageHeader
        sticky={false}
        primaryItems={[
          { label: "Flashcards", href: "/flashcards" },
          { label: "Dashboard", href: "/dashboard" },
          { label: "Community", href: "/teacher/community" },
        ]}
        rightSlot={<HeaderAuth />}
        className="mx-auto max-w-7xl border-b-0 bg-transparent backdrop-blur-none"
      />

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:py-20 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="inline-flex items-center rounded-full border border-[#dbe3d1] bg-white px-4 py-2 text-sm font-semibold text-[#6d8160] shadow-sm">
            Welcome back
          </div>

          <h1 className="mt-6 whitespace-pre-line text-4xl font-semibold tracking-tight text-[#2f3a2f] md:text-6xl">
            {LANDING_HERO_TITLE}
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-8 text-[#5c665c]">
            {LANDING_HERO_DESCRIPTION}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/flashcards" className="btn btn-primary px-8 py-4">
              Start with Flashcards
            </Link>
            <span className="text-sm font-medium text-[var(--color-text-muted)]">
              Welcome{displayName ? `, ${displayName}` : ""}
            </span>
          </div>
        </div>

        <LandingCarousel />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8 md:py-12">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quickLinks.map((item) => (
            <QuickLinkCard key={item.title} {...item} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 md:py-20">
        <div className="rounded-[2rem] border border-[#e2e6da] bg-white p-6 shadow-[0_18px_40px_rgba(54,64,46,0.10)] md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#6d8160]">
            Ready to keep going?
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Link href="/dashboard" className="btn btn-primary px-6 py-3">
              Go to Dashboard
            </Link>
            <Link href="/faq" className="btn btn-secondary px-6 py-3">
              View FAQ
            </Link>
          </div>
          <p className="mt-4 text-sm text-[#6b756b]">
            Signed in as {displayName || "Guest"}.
          </p>
        </div>
      </section>

      {showPremiumWelcome ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-2xl rounded-[2rem] border border-[#dbe3d1] bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.24)] md:p-8">
            <div className="inline-flex items-center rounded-full border border-[#dbe3d1] bg-[#f7faf4] px-4 py-2 text-sm font-semibold text-[#6d8160] shadow-sm">
              Welcome to Classendo Premium
            </div>

            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-[#2f3a2f] md:text-4xl">
              Your Premium features are now unlocked
            </h2>
            <p className="mt-4 text-base leading-8 text-[#5c665c]">
              You now have access to the full Classendo teaching toolkit across games, worksheets, saving, sharing, and image options.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {[
                "All classroom games",
                "All worksheet types",
                "Community access",
                "Teacher editor access",
                "Unlimited dashboard saves",
                "Premium image variations",
                "Advanced printables options",
                "Featured tools unlocked year-round",
              ].map((feature) => (
                <div
                  key={feature}
                  className="rounded-2xl border border-[#e5e8de] bg-[#fbfbf8] px-4 py-3 text-sm font-medium text-[#425042]"
                >
                  {feature}
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" onClick={closePremiumWelcome} className="btn btn-primary px-6 py-3">
                Start Exploring
              </button>
              <button type="button" onClick={closePremiumWelcome} className="btn btn-secondary px-6 py-3">
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

export default function LandingPage() {
  return (
    <Suspense fallback={<p className="p-10">Loading...</p>}>
      <LandingPageContent />
    </Suspense>
  );
}
