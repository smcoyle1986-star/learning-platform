import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { BrandMenuProvider } from "@/components/BrandMenuContext";
import BrandMenuDrawer from "@/components/BrandMenuDrawer";
import HeaderAuth from "@/components/HeaderAuth";
import BrandButton from "@/components/BrandButton";
import SiteNavigation from "@/components/SiteNavigation";
import MobileSiteHeader from "@/components/MobileSiteHeader";
import BrandPageTheme from "@/components/BrandPageTheme";
import { FeedbackLauncher } from "@/components/feedback/FeedbackLauncher";
import { AnalyticsEventTracker } from "@/components/analytics/AnalyticsEventTracker";
import PremiumTrialExperience from "@/components/billing/PremiumTrialExperience";
import { PAGE_CONTENT } from "@/lib/seo/page-content";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieConsentBanner } from "@/components/privacy/CookieConsentBanner";

export const metadata: Metadata = {
  metadataBase: new URL("https://classendo.com"),
  title: {
    default: PAGE_CONTENT.home.title,
    template: "%s | Classendo",
  },
  description: PAGE_CONTENT.home.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: PAGE_CONTENT.home.title,
    description: PAGE_CONTENT.home.description,
    type: "website",
    url: "/",
    siteName: "Classendo",
  },
  verification: {
    other: {
      "p:domain_verify": "f0f195a8d8bcb75cf8530e02d35062c6",
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AnalyticsEventTracker />
          <PremiumTrialExperience />
          <BrandMenuProvider>
            <BrandMenuDrawer />
            <BrandPageTheme />
            <div className="relative z-10">
              <div data-site-chrome>
                <MobileSiteHeader />
              </div>
              <header data-site-chrome className="relative z-[110] hidden border-b border-black/5 bg-[var(--color-bg-main)]/90 px-6 py-3 backdrop-blur-md lg:block">
                <div className="mx-auto flex max-w-7xl items-center gap-6">
                  <BrandButton className="shrink-0 text-3xl font-extrabold tracking-tight text-blue-700 transition hover:opacity-80" />
                  <SiteNavigation />
                  <div className="ml-auto"><HeaderAuth /></div>
                </div>
              </header>

              {children}
              <SiteFooter />
              <FeedbackLauncher />
              <CookieConsentBanner />
            </div>
          </BrandMenuProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
