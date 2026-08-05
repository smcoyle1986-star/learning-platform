import type { Metadata } from "next";

import { PAGE_CONTENT } from "@/lib/seo/page-content";

export const metadata: Metadata = {
  title: "Welcome Back",
  description: PAGE_CONTENT.home.description,
  alternates: { canonical: "/" },
  robots: { index: false, follow: false },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
