"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";

import { openBillingPortal, startPremiumCheckout } from "@/lib/billing/client";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";
import { useAuth } from "@/components/AuthProvider";
import { PAGE_CONTENT } from "@/lib/seo/page-content";

type PublicStripePrice = {
  id: string;
  currency: string;
  unitAmount: number | null;
  interval: string | null;
  intervalCount: number | null;
};

const DISPLAY_CURRENCY = "USD";

function UpgradePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { access, loading } = useBillingAccess();
  const [prices, setPrices] = useState<{ monthly: PublicStripePrice; yearly: PublicStripePrice } | null>(null);

  const checkoutStatus = searchParams?.get("checkout");

  useEffect(() => {
    let mounted = true;

    const loadPrices = async () => {
      try {
        const response = await fetch("/api/stripe/pricing", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload || !mounted) return;
        setPrices(payload);
      } catch {}
    };

    void loadPrices();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/signup?next=%2Fupgrade");
    }
  }, [authLoading, router, user]);

  const formatPrice = (price: PublicStripePrice | null) => {
    if (!price || price.unitAmount == null) return null;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: DISPLAY_CURRENCY,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price.unitAmount / 100);
  };

  const monthlyPrice = formatPrice(prices?.monthly ?? null);
  const yearlyPrice = formatPrice(prices?.yearly ?? null);

  const yearlySavings = useMemo(() => {
    if (!prices?.monthly?.unitAmount || !prices?.yearly?.unitAmount) return null;
    const monthlyAnnual = prices.monthly.unitAmount * 12;
    const savings = monthlyAnnual - prices.yearly.unitAmount;
    if (savings <= 0) return null;

    const percent = Math.round((savings / monthlyAnnual) * 100);
    const amount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: DISPLAY_CURRENCY,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(savings / 100);

    return { amount, percent };
  }, [prices]);

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#f7f6f2] px-6 py-10 text-[#2f3a2f]">
        <section className="mx-auto max-w-5xl rounded-[2rem] border border-[#e2e6da] bg-white p-6 md:p-8">
          <h1 className="text-4xl font-semibold tracking-tight">Classendo Premium</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5c665c]">{PAGE_CONTENT.upgrade.description}</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#f7f6f2] px-6 py-10 text-[#2f3a2f]">
        <section className="mx-auto max-w-5xl rounded-[2rem] border border-[#e2e6da] bg-white p-6 shadow-[0_18px_40px_rgba(54,64,46,0.10)] md:p-8">
          <div className="inline-flex items-center rounded-full border border-[#dbe3d1] bg-[#f7faf4] px-4 py-2 text-sm font-semibold text-[#6d8160] shadow-sm">
            Classendo Premium
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#2f3a2f]">
            Unlock every Classendo teaching tool
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5c665c]">
            {PAGE_CONTENT.upgrade.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className="btn btn-primary px-6 py-3">Create a free account</Link>
            <Link href="/login?next=/upgrade" className="btn btn-secondary px-6 py-3">Sign in</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] px-6 py-10 text-[#2f3a2f]">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-[#e2e6da] bg-white p-6 shadow-[0_18px_40px_rgba(54,64,46,0.10)] md:p-8">
        <div className="inline-flex items-center rounded-full border border-[#dbe3d1] bg-[#f7faf4] px-4 py-2 text-sm font-semibold text-[#6d8160] shadow-sm">
          Classendo Premium
        </div>

        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#2f3a2f]">
          Unlock every Classendo teaching tool
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-[#5c665c]">
          {PAGE_CONTENT.upgrade.description}
        </p>

        {checkoutStatus === "success" ? (
          <div className="mt-6 rounded-2xl border border-[#dbe3d1] bg-[#f7faf4] px-5 py-4 text-sm text-[#47613a]">
            Checkout completed. Your subscription is syncing now.
          </div>
        ) : null}

        {checkoutStatus === "cancelled" ? (
          <div className="mt-6 rounded-2xl border border-[#eadfc6] bg-[#fffaf1] px-5 py-4 text-sm text-[#7f6842]">
            Checkout was cancelled. Your free plan is still active.
          </div>
        ) : null}

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <article className="flex h-full flex-col rounded-[1.75rem] border border-[#dfe5d8] bg-[#fbfbf8] p-6 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#6d8160]">Monthly</div>
            <h2 className="mt-3 text-2xl font-bold">Premium Monthly</h2>
            <div className="mt-5 flex items-end gap-2">
              <div className="text-5xl font-black tracking-tight text-[#2f3a2f]">
                {monthlyPrice ?? "Monthly"}
              </div>
              <div className="pb-1 text-sm font-medium text-[#6b756b]">/ month</div>
            </div>
            <div className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#7a8578]">
              US dollars (USD)
            </div>
            <div className="mt-4 min-h-[58px]" />
            <p className="mb-5 text-sm leading-6 text-[#667066]">Renews monthly until cancelled. Applicable taxes, such as VAT, are added at Stripe Checkout where required.</p>
            <button
              type="button"
              onClick={() => void startPremiumCheckout("monthly")}
              className="btn btn-primary mt-auto w-full px-4 py-3"
            >
              Start Monthly Plan
            </button>
          </article>

          <article className="relative flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-[#efd8a7] bg-[linear-gradient(180deg,#fffaf0,white)] p-6 shadow-[0_18px_36px_rgba(191,132,44,0.12)]">
            <div className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full border border-[#efc88d] bg-[#fff0cf] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8b5a17]">
              <Sparkles size={12} />
              Best value
            </div>
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[#6d8160]">Yearly</div>
            <h2 className="mt-3 text-2xl font-bold">Premium Yearly</h2>
            <div className="mt-5 flex items-end gap-2">
              <div className="text-5xl font-black tracking-tight text-[#2f3a2f]">
                {yearlyPrice ?? "Yearly"}
              </div>
              <div className="pb-1 text-sm font-medium text-[#6b756b]">/ year</div>
            </div>
            <div className="mt-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#7a8578]">
              US dollars (USD)
            </div>
            {yearlySavings ? (
              <div className="mt-4 inline-flex items-center rounded-full border border-[#efc88d] bg-[#fff4de] px-4 py-2 text-sm font-semibold text-[#8b5a17]">
                Save {yearlySavings.amount} a year, about {yearlySavings.percent}% off
              </div>
            ) : null}
            <p className="mb-5 mt-4 text-sm leading-6 text-[#667066]">Renews yearly until cancelled. Applicable taxes, such as VAT, are added at Stripe Checkout where required.</p>
            <button
              type="button"
              onClick={() => void startPremiumCheckout("yearly")}
              className="btn btn-primary mt-auto w-full px-4 py-3"
            >
              Start Yearly Plan
            </button>
          </article>
        </div>

        <p className="mt-5 text-center text-sm leading-6 text-[#667066]">
          Prices are shown in US dollars. Stripe may display and charge the local equivalent at checkout. Applicable
          taxes, including VAT where required, are added at Stripe Checkout.
        </p>

        <div className="mt-8 rounded-2xl border border-[#dce4d5] bg-[#f3f7f0] p-5 text-sm leading-7 text-[#566056]">
          <p className="font-semibold text-[#334033]">Subscription terms</p>
          <p className="mt-2">
            By continuing to Stripe checkout, you authorise recurring charges at the displayed price and interval until
            you cancel. Cancel from Manage Billing before the next renewal. Eligible first-subscription refunds may be
            requested within 14 days. See our{" "}
            <Link href="/legal/terms" className="font-semibold underline underline-offset-4">Terms</Link>,{" "}
            <Link href="/legal/refunds" className="font-semibold underline underline-offset-4">Refund Policy</Link> and{" "}
            <Link href="/legal/privacy" className="font-semibold underline underline-offset-4">Privacy Notice</Link>.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/flashcards" className="btn btn-secondary px-6 py-3">
            Go back to free plan
          </Link>
          {!loading && access?.premiumAccessSource === "stripe" ? (
            <button
              type="button"
              onClick={() => void openBillingPortal()}
              className="btn btn-secondary px-6 py-3"
            >
              Manage Subscription
            </button>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<p className="p-10">Loading...</p>}>
      <UpgradePageContent />
    </Suspense>
  );
}
