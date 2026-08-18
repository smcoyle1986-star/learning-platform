"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { LayoutDashboard, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { AdministratorBadge } from "@/components/admin/AdministratorBadge";
import { useBrandMenu } from "@/components/BrandMenuContext";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";
import { supabase } from "@/lib/supabase/client";
import { getProfileDisplayName } from "@/lib/auth/profile";
import { resolveBrandTheme } from "@/lib/brand/theme";

const LINKS = [
  { label: "Home", href: "/" },
  { label: "Flashcards", href: "/flashcards" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Community", href: "/teacher/community" },
  { label: "Free Lesson Packs", href: "/free-resources" },
  { label: "ESL Topics", href: "/topics" },
  { label: "Creator", href: "/creator" },
  { label: "Games", href: "/games" },
  { label: "Printables", href: "/printables" },
  { label: "Worksheets", href: "/worksheets" },
  { label: "Lesson Plans", href: "/lessons" },
  { label: "Editor", href: "/teacher/editor" },
];

function FaceBadge({ mood }: { mood: "happy" | "sad" }) {
  const isHappy = mood === "happy";

  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="h-8 w-8"
      fill="none"
    >
      <circle cx="24" cy="24" r="20" fill="rgba(255,255,255,0.34)" />
      <circle cx="24" cy="24" r="18.5" stroke="rgba(255,255,255,0.62)" strokeWidth="2" />
      <circle cx="17" cy="19" r="2.25" fill="currentColor" />
      <circle cx="31" cy="19" r="2.25" fill="currentColor" />
      {isHappy ? (
        <path
          d="M15.5 28.5c2.7 4.8 14.3 4.8 17 0"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M15.5 31.5c2.7-4.8 14.3-4.8 17 0"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export default function BrandMenuDrawer() {
  const { isOpen, close } = useBrandMenu();
  const { user, profile, loading } = useAuth();
  const { access } = useBillingAccess();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const displayName = getProfileDisplayName(profile, user?.email);
  const navigationLinks = LINKS;

  const signOut = async () => {
    await supabase.auth.signOut();
    close();
    window.location.replace("/");
  };

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [close, isOpen]);

  const trapFocus = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])'
    );
    if (!focusable?.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
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
        ref={panelRef}
        id="brand-menu-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Classendo navigation"
        inert={!isOpen}
        onKeyDown={trapFocus}
        className={`fixed left-0 top-0 z-[90] h-dvh w-[min(88vw,400px)] overflow-y-auto bg-white shadow-2xl border-r transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!isOpen}
      >
        <div className="flex items-center justify-between border-b px-5 py-3">
          <div className="text-xl font-extrabold text-blue-700">Classendo</div>
          <button
            type="button"
            onClick={close}
            ref={closeButtonRef}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border hover:bg-gray-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#7fa36a]/25"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-w-4xl px-5 py-3">
          {user ? (
            <div className="mb-3 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d7ddd1] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(127,163,106,0.16))] text-[#6b756b] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <FaceBadge mood="happy" />
              </div>
              <div>
                <div className="text-xs text-gray-500">Signed in as</div>
                <div className="text-sm font-semibold text-gray-800">
                  {loading ? "Loading..." : displayName}
                </div>
                {access?.administratorRole ? (
                  <div className="mt-1">
                    <AdministratorBadge role={access.administratorRole} compact />
                  </div>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mb-3 flex items-center justify-start">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d7ddd1] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(203,213,225,0.22))] text-[#8b95a3] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                <FaceBadge mood="sad" />
              </div>
            </div>
          )}

          <nav className="flex flex-col gap-2">
            {navigationLinks.map((item) => (
              (() => {
                const theme = resolveBrandTheme(item.href);
                return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 transition hover:bg-gray-50"
              >
                <div
                  className="h-6 w-6 flex-shrink-0 rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
                  style={{
                    background: `linear-gradient(180deg, rgba(255,255,255,0.9), ${theme.circle})`,
                    borderColor: theme.circleBorder,
                  }}
                />
                <span className="text-sm font-medium text-gray-800">{item.label}</span>
              </Link>
                );
              })()
            ))}

            {access?.isAdministrator ? (
              <Link
                href="/admin"
                onClick={close}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-[#b8c9af] bg-[#f1f7ed] px-3 py-2.5 text-[#426038] transition hover:bg-[#e7f0e1]"
              >
                <div className="grid h-6 w-6 flex-shrink-0 place-items-center rounded-full border border-[#a7ba9d] bg-white">
                  <LayoutDashboard aria-hidden="true" className="h-3.5 w-3.5" />
                </div>
                <span className="text-sm font-semibold">Administrator Dashboard</span>
              </Link>
            ) : null}

            {user ? (
              <>
                <Link
                  href="/profile"
                  onClick={close}
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 transition hover:bg-gray-50"
                >
                  <div className="h-6 w-6 flex-shrink-0 rounded-full border border-[#cfd5cc] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(203,213,225,0.25))]" />
                  <span className="text-sm font-medium text-gray-800">Account</span>
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-left transition hover:bg-gray-50"
                >
                  <div className="h-6 w-6 flex-shrink-0 rounded-full border border-[#cfd5cc] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(203,213,225,0.25))]" />
                  <span className="text-sm font-medium text-gray-800">Log out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={close}
                  className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 transition hover:bg-gray-50"
                >
                  <div className="h-6 w-6 flex-shrink-0 rounded-full border border-[#cfd5cc] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(203,213,225,0.25))]" />
                  <span className="text-sm font-medium text-gray-800">Log in</span>
                </Link>
                <Link
                  href="/signup"
                  onClick={close}
                  className="flex min-h-11 items-center justify-center rounded-xl bg-[#7fa36a] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6f955b]"
                >
                  Create a free account
                </Link>
              </>
            )}
          </nav>
        </div>
      </aside>
    </>
  );
}
