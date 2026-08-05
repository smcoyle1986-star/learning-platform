import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { BrandMenuProvider } from "@/components/BrandMenuContext";
import BrandMenuDrawer from "@/components/BrandMenuDrawer";
import HeaderAuth from "@/components/HeaderAuth";
import BrandPageTheme from "@/components/BrandPageTheme";
import { FeedbackLauncher } from "@/components/feedback/FeedbackLauncher";
import { AnalyticsEventTracker } from "@/components/analytics/AnalyticsEventTracker";
import PremiumTrialExperience from "@/components/billing/PremiumTrialExperience";
import { PAGE_CONTENT } from "@/lib/seo/page-content";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.classendo.com"),
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
              {/* GLOBAL HEADER — THIS WAS MISSING */}
              <header className="p-4 border-b flex justify-end">
                <HeaderAuth />
              </header>

              {children}
              <FeedbackLauncher />
            </div>
          </BrandMenuProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
