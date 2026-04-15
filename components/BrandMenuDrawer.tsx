"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useBrandMenu } from "@/components/BrandMenuContext";
import { supabase } from "@/lib/supabase/client";

const LINKS = [
  { label: "Landing", href: "/" },
  { label: "Flashcards", href: "/flashcards" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Community", href: "/teacher/community" },
  { label: "Games", href: "/games" },
  { label: "Printables", href: "/printables" },
  { label: "Worksheets", href: "/worksheets" },
  { label: "Lesson Plans", href: "/lessons" },
  { label: "Editor", href: "/teacher/editor" },
];

export default function BrandMenuDrawer() {
  const { isOpen, close } = useBrandMenu();
  const { user, loading } = useAuth();

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    "Guest";

  const signOut = async () => {
    await supabase.auth.signOut();
    close();
    window.location.replace("/");
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[80] bg-black/40 transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={close}
      />
      <aside
        className={`fixed left-0 top-0 z-[90] h-full w-[min(40vw,480px)] bg-white shadow-2xl border-r transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b">
          <div className="text-2xl font-extrabold text-blue-700">Classendo</div>
          <button
            type="button"
            onClick={close}
            className="rounded-full border p-2 hover:bg-gray-50"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 max-w-4xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-11 w-11 rounded-full bg-gray-100 border" />
            <div>
              <div className="text-xs text-gray-500">Signed in as</div>
              <div className="text-sm font-semibold text-gray-800">
                {loading ? "Loading..." : displayName}
              </div>
            </div>
          </div>

          <nav className="flex flex-col gap-3">
            {LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 hover:bg-gray-50 transition"
              >
                <div className="h-9 w-9 rounded-lg bg-gray-100 border flex-shrink-0" />
                <span className="text-sm font-medium text-gray-800">{item.label}</span>
              </Link>
            ))}

            {user ? (
              <button
                type="button"
                onClick={signOut}
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 hover:bg-gray-50 transition text-left"
              >
                <div className="h-9 w-9 rounded-lg bg-gray-100 border flex-shrink-0" />
                <span className="text-sm font-medium text-gray-800">Log out</span>
              </button>
            ) : (
              <Link
                href="/login"
                onClick={close}
                className="flex items-center gap-3 rounded-xl border border-gray-200 px-3 py-2.5 hover:bg-gray-50 transition"
              >
                <div className="h-9 w-9 rounded-lg bg-gray-100 border flex-shrink-0" />
                <span className="text-sm font-medium text-gray-800">Log in</span>
              </Link>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}
