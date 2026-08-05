import type { Metadata } from "next";

import SignedInFeatureGate from "@/components/auth/SignedInFeatureGate";
import { createPublicMetadata, PAGE_CONTENT } from "@/lib/seo/page-content";

export const metadata: Metadata = createPublicMetadata("worksheets");

export default function WorksheetsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SignedInFeatureGate featureName="Worksheets" nextPath="/worksheets" description={PAGE_CONTENT.worksheets.description}>
      {children}
    </SignedInFeatureGate>
  );
}
