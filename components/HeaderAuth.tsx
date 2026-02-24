"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase/client";

export default function HeaderAuth() {
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log(
      "HeaderAuth: window.__SUPABASE_CLIENT_ID__",
      (window as any).__SUPABASE_CLIENT_ID__
    );
    console.log(
      "HeaderAuth: supabase === window.__SUPABASE_CLIENT__?",
      supabase === (window as any).__SUPABASE_CLIENT__
    );
    console.log("HeaderAuth: user", user);
  }, [user]);

  if (loading) return <div style={{ width: 140 }} />;

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.replace("/");
  };

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link href="/profile" className="text-sm hover:underline">
          {user.email}
        </Link>
        <button
          onClick={signOut}
          className="px-3 py-1 rounded border text-sm"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link href="/login">Login</Link>
      <Link href="/signup">Sign up</Link>
    </div>
  );
}
