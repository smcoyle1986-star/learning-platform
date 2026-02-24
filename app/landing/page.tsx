"use client";

import HeaderAuth from "@/components/HeaderAuth";
import PersistentToast from "@/components/PersistentToast";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";


export default function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  /**
   * AUTH CHECK (single source of truth)
   */
 
  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!data.session) {
        router.push("/login");
        return;
      }

      setEmail(data.session.user.email ?? null);
      setLoading(false);
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  /**
   * TOAST HANDLING (?signed_in=1 / ?signed_up=1)
   */
  useEffect(() => {
    const signedIn = searchParams.get("signed_in");
    const signedUp = searchParams.get("signed_up");

    if (!signedIn && !signedUp) return;

    const run = async () => {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
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

    // small delay so HeaderAuth initializes first
    const t = setTimeout(run, 200);
    return () => clearTimeout(t);
  }, [searchParams, router]);

  function closeToast() {
    setToastVisible(false);
    setToastMsg(null);
  }

  if (loading) {
    return <p className="p-10">Loading...</p>;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-blue-700">ClassBloom</h1>

        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/flashcards")} className="btn btn-secondary">
            Flashcards
          </button>

          <button onClick={() => router.push("/dashboard")} className="btn btn-secondary">
            Dashboard
          </button>

          <HeaderAuth />
        </div>
      </header>

      {/* Content */}
      <section className="px-8 py-10">
        <h2 className="text-2xl font-semibold mb-2">
          Welcome{email ? `, ${email}` : ""}
        </h2>
        <p className="text-gray-600 mb-8">
          What would you like to create today?
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition">
            <h3 className="text-lg font-semibold mb-2">📄 Worksheet Generator</h3>
            <p className="text-sm text-gray-600 mb-4">
              Create printable worksheets in minutes.
            </p>
            <button className="btn btn-primary">Coming soon →</button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition">
            <h3 className="text-lg font-semibold mb-2">🃏 Flashcards</h3>
            <p className="text-sm text-gray-600 mb-4">
              Generate flashcards for vocabulary practice.
            </p>
            <button onClick={() => router.push("/flashcards")} className="btn btn-primary">
              Open →
            </button>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition">
            <h3 className="text-lg font-semibold mb-2">🧭 Community</h3>
            <p className="text-sm text-gray-600 mb-4">
              Browse and copy teacher-created lesson sets.
            </p>
            <button onClick={() => router.push("/teacher/community")} className="btn btn-primary">
              Open →
            </button>
          </div>
        </div>
      </section>

      {toastVisible && toastMsg && (
        <PersistentToast
          title="Success"
          message={toastMsg}
          onClose={closeToast}
        />
      )}
    </main>
  );
}
