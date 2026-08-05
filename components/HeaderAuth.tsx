"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LayoutDashboard, Sparkles } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { AdministratorBadge } from "@/components/admin/AdministratorBadge";
import { supabase } from "@/lib/supabase/client";
import { getProfileDisplayName } from "@/lib/auth/profile";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";

type DebugWindow = Window & {
  __SUPABASE_CLIENT_ID__?: string;
  __SUPABASE_CLIENT__?: unknown;
};

export default function HeaderAuth() {
  const { user, profile, loading } = useAuth();
  const { access } = useBillingAccess();

  useEffect(() => {
    const debugWindow = window as DebugWindow;
    console.log(
      "HeaderAuth: window.__SUPABASE_CLIENT_ID__",
      debugWindow.__SUPABASE_CLIENT_ID__
    );
    console.log(
      "HeaderAuth: supabase === window.__SUPABASE_CLIENT__?",
      supabase === debugWindow.__SUPABASE_CLIENT__
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
        {access && !access.isPremium ? (
          <Link
            href="/upgrade"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-[#efc88d] bg-[linear-gradient(135deg,#fff8df,#ffe8b5)] px-4 py-1.5 text-sm font-semibold text-[#8b5a17] shadow-[0_10px_24px_rgba(191,132,44,0.16)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(191,132,44,0.22)]"
          >
            <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.8),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.45),transparent_38%)] opacity-90" />
            <span className="relative inline-flex items-center gap-2">
              <Sparkles size={14} className="text-[#b7791f] transition group-hover:rotate-12 group-hover:scale-110" />
              Go Premium
            </span>
          </Link>
        ) : null}
        {access?.isAdministrator ? (
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#abc09f] bg-[#f2f7ef] px-3 py-1.5 text-xs font-semibold text-[#48643d] transition hover:bg-[#e7f0e1]"
          >
            <LayoutDashboard aria-hidden="true" className="h-3.5 w-3.5" />
            Admin Dashboard
          </Link>
        ) : null}
        <Link href="/profile" className="inline-flex items-center gap-2 text-sm hover:underline">
          <span>{getProfileDisplayName(profile, user.email)}</span>
          {access?.administratorRole ? (
            <AdministratorBadge role={access.administratorRole} compact />
          ) : access?.isPremium ? (
            <span className="inline-flex items-center rounded-full border border-[#d9c78a] bg-[linear-gradient(135deg,#fff6cf,#f3d97c)] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#7b5b13] no-underline shadow-[0_6px_16px_rgba(217,199,138,0.28)]">
              Premium
            </span>
          ) : null}
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
