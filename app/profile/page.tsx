"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import {
  AdministratorBadge,
  administratorTitle,
} from "@/components/admin/AdministratorBadge";
import { supabase } from "@/lib/supabase/client";
import { openBillingPortal } from "@/lib/billing/client";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";

const LINK_REFUND_SUPPORT_URL = "https://support.link.com/questions/requesting-a-refund-for-a-sold-through-link-payment";

export default function ProfilePage() {
  const { user, profile, loading } = useAuth();
  const { access } = useBillingAccess();

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.replace("/");
  };

  const displayName = profile?.username || profile?.display_name || user?.email || "Guest";
  const administratorRole = access?.administratorRole ?? null;
  const accountTitle = administratorTitle(administratorRole);

  if (loading) {
    return <p className="p-10">Loading...</p>;
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] px-6 py-10 text-[#2f3a2f]">
      <section className="mx-auto max-w-4xl rounded-[2rem] border border-[#e2e6da] bg-white p-6 shadow-[0_18px_40px_rgba(54,64,46,0.10)] md:p-8">
        <div className="inline-flex items-center rounded-full border border-[#dbe3d1] bg-[#f7faf4] px-4 py-2 text-sm font-semibold text-[#6d8160] shadow-sm">
          Account profile
        </div>

        {administratorRole ? (
          <div className="mt-5">
            <AdministratorBadge role={administratorRole} />
          </div>
        ) : null}

        <h1 className={`${administratorRole ? "mt-3" : "mt-5"} text-4xl font-semibold tracking-tight text-[#2f3a2f]`}>
          {displayName}
        </h1>
        <p className="mt-3 text-base leading-7 text-[#5c665c]">
          {accountTitle
            ? access?.isPremium
              ? `${accountTitle} with full access to Classendo and the administrator workspace.`
              : `${accountTitle} account with access to the administrator workspace.`
            : "Your username is what other teachers see across Classendo."}
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-[#e5e8de] bg-[#fbfbf8] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6d8160]">Public display</p>
            <p className="mt-3 text-lg font-semibold text-[#2f3a2f]">{displayName}</p>
          </div>
          <div className="rounded-3xl border border-[#e5e8de] bg-[#fbfbf8] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6d8160]">Email</p>
            <p className="mt-3 text-lg font-semibold text-[#2f3a2f]">{user?.email ?? "Not set"}</p>
          </div>
          <div className="rounded-3xl border border-[#e5e8de] bg-[#fbfbf8] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6d8160]">Country / region</p>
            <p className="mt-3 text-lg font-semibold text-[#2f3a2f]">{profile?.country_region ?? "Not set"}</p>
          </div>
          <div className="rounded-3xl border border-[#e5e8de] bg-[#fbfbf8] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6d8160]">Avatar</p>
            <p className="mt-3 text-lg font-semibold text-[#2f3a2f]">{profile?.avatar_url ? "Uploaded" : "Not set"}</p>
          </div>
          <div className="rounded-3xl border border-[#e5e8de] bg-[#fbfbf8] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6d8160]">Plan</p>
            <p className="mt-3 text-lg font-semibold text-[#2f3a2f]">
              {administratorRole
                ? access?.isPremium
                  ? "Administrator · Full access"
                  : "Administrator"
                : access?.isPremium
                  ? access.premiumAccessSource === "welcome_trial"
                    ? `Premium welcome trial · ${access.welcomeTrial.daysRemaining} days left`
                    : "Premium"
                  : "Basic"}
            </p>
          </div>
          {accountTitle ? (
            <div className="rounded-3xl border border-[#cfdcc8] bg-[#f3f8f0] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#58744d]">Account title</p>
              <p className="mt-3 text-lg font-semibold text-[#31462d]">{accountTitle}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard" className="btn btn-primary px-6 py-3">
            Go to Dashboard
          </Link>
          <Link href="/flashcards" className="btn btn-secondary px-6 py-3">
            Open Flashcards
          </Link>
          {administratorRole ? (
            <>
              <Link href="/admin" className="btn btn-primary px-6 py-3">
                Open Administrator Dashboard
              </Link>
              <Link href="/admin/community?view=create" className="btn btn-secondary px-6 py-3">
                Create Community Set
              </Link>
            </>
          ) : null}
          {access?.premiumAccessSource === "stripe" ? (
            <>
              <button type="button" onClick={() => void openBillingPortal()} className="btn btn-secondary px-6 py-3">
                Manage Billing
              </button>
              <a
                href={LINK_REFUND_SUPPORT_URL}
                className="btn btn-secondary px-6 py-3"
                target="_blank"
                rel="noreferrer"
              >
                Request a refund through Link
              </a>
            </>
          ) : !access?.isPremium || access?.premiumAccessSource === "welcome_trial" ? (
            <Link href="/upgrade" className="btn btn-secondary px-6 py-3">
              {access?.premiumAccessSource === "welcome_trial" ? "Continue Premium after trial" : "Upgrade to Premium"}
            </Link>
          ) : null}
          <button type="button" onClick={signOut} className="btn btn-secondary px-6 py-3">
            Sign out
          </button>
        </div>
        {access?.premiumAccessSource === "stripe" ? (
          <p className="mt-5 text-sm leading-6 text-[#657065]">
            Manage Billing cancels future renewal. Request a refund through Link for payment support, or see our{" "}
            <Link href="/legal/refunds" className="font-semibold underline underline-offset-4">Cancellation and Refund Policy</Link>.
          </p>
        ) : null}
      </section>
    </main>
  );
}
