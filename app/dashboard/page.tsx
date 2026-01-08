"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.push("/login");
      } else {
        setEmail(data.user.email ?? null);
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  if (loading) {
    return <p className="p-10">Loading...</p>;
  }

  return (
  <main className="min-h-screen bg-gray-50">
    {/* Header */}
    <header className="bg-white border-b px-8 py-4 flex justify-between items-center">
      <h1 className="text-xl font-bold">ClassBloom</h1>

      <button
        onClick={async () => {
          await supabase.auth.signOut();
          router.push("/login");
        }}
        className="text-sm text-gray-600 hover:text-black"
      >
        Log out
      </button>
    </header>

    {/* Content */}
    <section className="px-8 py-10">
      <h2 className="text-2xl font-semibold mb-2">
        Welcome{email ? `, ${email}` : ""}
      </h2>
      <p className="text-gray-600 mb-8">
        What would you like to create today?
      </p>

      {/* Tools */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition">
          <h3 className="text-lg font-semibold mb-2">📄 Worksheet Generator</h3>
          <p className="text-sm text-gray-600 mb-4">
            Create printable worksheets in minutes.
          </p>
          <button className="text-blue-600 font-medium">
            Coming soon →
          </button>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition">
          <h3 className="text-lg font-semibold mb-2">🃏 Flashcards</h3>
          <p className="text-sm text-gray-600 mb-4">
            Generate flashcards for vocabulary practice.
          </p>
          <button
            onClick={() => router.push("/flashcards")}
            className="text-blue-600 font-medium"
          >
            Open →
          </button>
        </div>
      </div>
    </section>
  </main>
);
}