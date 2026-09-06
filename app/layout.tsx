import type { Metadata } from "next";
import { Comic_Neue, Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { BrandMenuProvider } from "@/components/BrandMenuContext";
import BrandMenuDrawer from "@/components/BrandMenuDrawer";
import HeaderAuth from "@/components/HeaderAuth";
import BrandButton from "@/components/BrandButton";
import SiteNavigation from "@/components/SiteNavigation";
import MobileSiteHeader from "@/components/MobileSiteHeader";
import SiteChrome from "@/components/SiteChrome";
import BrandPageTheme from "@/components/BrandPageTheme";
import { FeedbackLauncher } from "@/components/feedback/FeedbackLauncher";
import { AnalyticsEventTracker } from "@/components/analytics/AnalyticsEventTracker";
import PremiumTrialExperience from "@/components/billing/PremiumTrialExperience";
import { BillingAccessProvider } from "@/lib/billing/useBillingAccess";
import { PAGE_CONTENT } from "@/lib/seo/page-content";
import { SiteFooter } from "@/components/SiteFooter";
import { CookieConsentBanner } from "@/components/privacy/CookieConsentBanner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
const comicNeue = Comic_Neue({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
  variable: "--font-comic-neue",
});

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
    <html lang="en" className={`${inter.variable} ${comicNeue.variable}`}>
      <body>
        <AuthProvider>
          <BillingAccessProvider>
            <AnalyticsEventTracker />
            <PremiumTrialExperience />
            <BrandMenuProvider>
            <BrandMenuDrawer />
            <BrandPageTheme />
            <div className="relative z-10">
              <SiteChrome>
                <div data-site-chrome>
                  <MobileSiteHeader />
                </div>
                <header data-site-chrome className="relative z-[110] hidden border-b border-black/5 bg-[var(--color-bg-main)]/90 px-6 py-3 backdrop-blur-md lg:block">
                  <div className="mx-auto flex max-w-7xl items-center gap-6">
                    <BrandButton className="shrink-0 text-3xl font-extrabold tracking-tight text-blue-700 transition hover:opacity-80" />
                    <SiteNavigation />
                    <div className="ml-auto flex items-center gap-3"><HeaderAuth /></div>
                  </div>
                </header>
              </SiteChrome>

              {children}
              <SiteFooter />
              <FeedbackLauncher />
              <CookieConsentBanner />
            </div>
            </BrandMenuProvider>
          </BillingAccessProvider>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
