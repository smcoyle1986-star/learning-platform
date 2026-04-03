"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { supabase } from "@/lib/supabase/client";
import HeaderAuth from "@/components/HeaderAuth";
import PersistentToast from "@/components/PersistentToast";
import NavBar from "@/components/NavBar";
import AIToolsSection from "@/components/AIToolsSection";
import { useFadeInOnScroll } from "@/components/useFadeInOnScroll";

/* ---------------------------
   Feature card data (marketing)
   - Smart Cards restored to the original name/description
---------------------------- */
const FEATURE_CARDS = [
  {
    title: "Flashcards",
    desc: "Simple, focused vocabulary learning",
    href: "/flashcards",
  },
  {
    title: "Printables",
    desc: "Worksheets made from your content",
    href: "/printables",
  },
  {
    title: "Smart Cards (AI)",
    desc: "Generate and adapt learning content",
    href: "/ai-tools",
  },
  {
    title: "Community",
    desc: "Teacher-created sets, shared simply",
    href: "/teacher/community",
  },
];

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hero = useFadeInOnScroll();
  const features = useFadeInOnScroll();

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
    return <p className="p-10">Loading...</p>;
  }

  const isLoggedIn = Boolean(email);

  /* ---------------------------------
     Shared helpers for header links
  ----------------------------------*/
  const goToFlashcards = () => {
    if (isLoggedIn) router.push("/flashcards");
    else router.push("/login");
  };
  const goToDashboard = () => {
    if (isLoggedIn) router.push("/dashboard");
    else router.push("/login");
  };
  const goToSignup = () => router.push("/signup");

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
          <Link
            href="/"
            className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80"
          >
            Classendo
          </Link>

          <nav className="flex items-center gap-3 text-sm">
            {/* Lessons removed */}
            <button onClick={goToDashboard} className="btn btn-secondary">
              Dashboard
            </button>

            <button onClick={goToFlashcards} className="btn btn-secondary">
              Flashcards
            </button>

            {/* HeaderAuth replaces Teacher Login for logged-in users */}
            <div className="ml-4">
              <HeaderAuth />
            </div>
          </nav>
        </header>

        {/* ---------------- Hero (same marketing layout) ---------------- */}
        <main className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div>
            <h2 className="text-5xl font-semibold leading-tight mb-6">
              A calm space for
              <br />
              meaningful learning
            </h2>

            <p className="text-lg text-[#5c665c] mb-8 max-w-xl">
              Create, explore, and share classroom materials — designed for focus,
              curiosity, and growth.
            </p>

            <div className="flex items-center gap-4">
              <button onClick={goToFlashcards} className="btn btn-primary px-8 py-4">
                Start Free
              </button>

              <span className="text-sm font-medium text-[var(--color-text-muted)]">
                Welcome{email ? `, ${email}` : ""}
              </span>
            </div>
          </div>

          {/* Illustration placeholder */}
          <div className="h-[360px] rounded-3xl bg-[#e8eadf] flex items-center justify-center text-sm text-[#6b756b]">
           <img
    src="https://tsccyjrniiamnwgrtvpw.supabase.co/storage/v1/object/public/ClassBloom%20images/ChatGPT%20Image%20Mar%2028,%202026,%2006_15_38%20PM.png"
    alt="Classendo homepage illustration"
    className="w-full h-full object-contain"
  />
          </div>
        </main>

        {/* ---------------- Feature Cards ---------------- */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <h3 className="text-center text-3xl font-semibold mb-12">
            A learning platform built for real classrooms
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                title: "Flashcards",
                desc: "Simple, focused vocabulary learning",
                onClick: () => router.push("/flashcards"),
              },
              {
                title: "Dashboard",
                desc: "Manage lessons, students, and classes",
                onClick: () => router.push("/dashboard"),
              },
              {
                title: "Printables",
                desc: "Worksheets made from your content",
                onClick: () => router.push("/printables"),
              },
              {
                title: "Community",
                desc: "Teacher-created sets, shared simply",
                onClick: () => router.push("/teacher/community"),
              },
            ].map((item) => (
              <div
                key={item.title}
                onClick={item.onClick}
                className="rounded-2xl bg-white p-6 text-center shadow-sm border cursor-pointer"
              >
                <div className="h-12 mb-4 bg-[#eef0e7] rounded-xl" />
                <h4 className="font-semibold mb-2">{item.title}</h4>
                <p className="text-sm text-[#6b756b]">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------- How it works ---------------- */}
        <section className="max-w-6xl mx-auto px-6 py-20">
          <h3 className="text-center text-3xl font-semibold mb-12">How it works</h3>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                title: "Flashcards",
                desc: "Focused, distraction-free learning",
                onClick: () => router.push("/flashcards"),
              },
              {
                title: "Smart Cards (AI)",
                desc: "Generate and adapt learning content",
                onClick: () => router.push("/ai-tools"),
              },
              {
                title: "Games",
                desc: "Light, rewarding-style practice",
                onClick: () => router.push("/games"),
              },
              {
                title: "Community Cards",
                desc: "Teacher-made sets with shared images",
                onClick: () => router.push("/teacher/community"),
              },
            ].map((item) => (
              <div
                key={item.title}
                onClick={item.onClick}
                className="rounded-2xl bg-white p-6 flex items-center gap-4 border cursor-pointer"
              >
                <div className="h-10 w-10 rounded-xl bg-[#eef0e7]" />
                <div>
                  <h4 className="font-semibold">{item.title}</h4>
                  <p className="text-sm text-[#6b756b]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-[#6b756b] mt-10">
            All tools share the same calm design and structure.
          </p>
        </section>

        {/* ---------------- Calm Learning Section ---------------- */}
        <section className="max-w-6xl mx-auto px-6 py-24 text-center">
          <h3 className="text-3xl font-semibold mb-6">Designed for calm learning</h3>

          <ul className="text-[#5c665c] space-y-2 mb-10">
            <li>• No flashing distractions</li>
            <li>• No noisy animations</li>
            <li>• No unnecessary competition</li>
          </ul>

          <p className="max-w-xl mx-auto text-[#6b756b] mb-12">
            Classendo supports focus, independence, and confidence — for both teachers and students.
          </p>

          {/* Mascot placeholder */}
          <div className="h-32 bg-[#e8eadf] rounded-3xl flex items-center justify-center text-sm text-[#6b756b]">
            Mascot illustration here
          </div>
        </section>

        {/* ---------------- CTA ---------------- */}
        <section className="py-24 text-center">
          <h3 className="text-3xl font-semibold mb-6">Ready to grow your classroom materials?</h3>

          <button onClick={() => router.push("/dashboard")} className="btn btn-primary px-10 py-4">
            Go to Dashboard
          </button>

          <p className="text-sm text-[#6b756b] mt-4">No credit card. Teacher-friendly.</p>
        </section>

        <footer className="border-t border-black/10 py-10 text-center text-sm text-[#6b756b]">
          © {new Date().getFullYear()} Classendo. Built for teachers.
        </footer>
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
        <Link
          href="/"
          className="text-4xl md:text-5xl font-extrabold text-blue-700 hover:opacity-80"
        >
          Classendo
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          {/* Dashboard replaces Games in the nav but routes to login when logged out */}
          <button
            onClick={() => router.push("/login")}
            className="btn btn-secondary"
          >
            Dashboard
          </button>

          <button
            onClick={() => router.push("/login")}
            className="btn btn-secondary"
          >
            Flashcards
          </button>

          {/* Teacher Login (visible only when logged out) */}
          <a href="/login" className="btn btn-secondary ml-1">
            Teacher Login
          </a>
        </nav>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="max-w-7xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-12 items-center">
        {/* Text */}
        <div>
          <h2 className="text-5xl font-semibold leading-tight mb-6">
            A calm space for
            <br />
            meaningful learning
          </h2>

          <p className="text-lg text-[#5c665c] mb-8 max-w-xl">
            Create, explore, and share classroom materials — designed for focus,
            curiosity, and growth.
          </p>

          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/signup")} className="btn btn-primary px-8 py-4">
              Start Free
            </button>

            <a
              onClick={() => router.push("/login")}
              className="text-sm font-medium underline underline-offset-4 cursor-pointer"
            >
              Explore as a Teacher →
            </a>
          </div>
        </div>

        {/* Illustration placeholder */}
        <div className="h-[360px] rounded-3xl bg-[#e8eadf] flex items-center justify-center text-sm text-[#6b756b]">
          Illustration goes here
        </div>
      </section>

      {/* ---------------- Feature Cards ---------------- */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h3 className="text-center text-3xl font-semibold mb-12">
          A learning platform built for real classrooms
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              title: "Flashcards",
              desc: "Simple, focused vocabulary learning",
            },
            {
              title: "Dashboard",
              desc: "Manage lessons, students, and classes",
            },
            {
              title: "Printables",
              desc: "Worksheets made from your content",
            },
            {
              title: "Community",
              desc: "Teacher-created sets, shared simply",
            },
          ].map((item) => (
            <div
              key={item.title}
              onClick={() => router.push("/login")}
              className="rounded-2xl bg-white p-6 text-center shadow-sm border cursor-pointer"
            >
              <div className="h-12 mb-4 bg-[#eef0e7] rounded-xl" />
              <h4 className="font-semibold mb-2">{item.title}</h4>
              <p className="text-sm text-[#6b756b]">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h3 className="text-center text-3xl font-semibold mb-12">How it works</h3>

        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              title: "Flashcards",
              desc: "Focused, distraction-free learning",
            },
            {
              title: "Smart Cards (AI)",
              desc: "Generate and adapt learning content",
            },
            {
              title: "Games",
              desc: "Light, rewarding-style practice",
            },
            {
              title: "Community Cards",
              desc: "Teacher-made sets with shared images",
            },
          ].map((item) => (
            <div
              key={item.title}
              onClick={() => router.push("/login")}
              className="rounded-2xl bg-white p-6 flex items-center gap-4 border cursor-pointer"
            >
              <div className="h-10 w-10 rounded-xl bg-[#eef0e7]" />
              <div>
                <h4 className="font-semibold">{item.title}</h4>
                <p className="text-sm text-[#6b756b]">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-[#6b756b] mt-10">
          All tools share the same calm design and structure.
        </p>
      </section>

      {/* ---------------- Calm Learning Section ---------------- */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <h3 className="text-3xl font-semibold mb-6">Designed for calm learning</h3>

        <ul className="text-[#5c665c] space-y-2 mb-10">
          <li>• No flashing distractions</li>
          <li>• No noisy animations</li>
          <li>• No unnecessary competition</li>
        </ul>

        <p className="max-w-xl mx-auto text-[#6b756b] mb-12">
          Classendo supports focus, independence, and confidence — for both teachers and students.
        </p>

        {/* Mascot placeholder */}
        <div className="h-32 bg-[#e8eadf] rounded-3xl flex items-center justify-center text-sm text-[#6b756b]">
          Mascot illustration here
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="py-24 text-center">
        <h3 className="text-3xl font-semibold mb-6">Ready to grow your classroom materials?</h3>

        <button onClick={() => router.push("/signup")} className="btn btn-primary px-10 py-4">
          Create your free account
        </button>

        <p className="text-sm text-[#6b756b] mt-4">No credit card. Teacher-friendly.</p>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="border-t border-black/10 py-10 text-center text-sm text-[#6b756b]">
        © {new Date().getFullYear()} Classendo. Built for teachers.
      </footer>
    </div>
  );
}
