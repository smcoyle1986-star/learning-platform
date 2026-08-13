import type { Metadata } from "next";

import SignedInFeatureGate from "@/components/auth/SignedInFeatureGate";
import { createPublicMetadata, PAGE_CONTENT } from "@/lib/seo/page-content";
import { PublicToolLanding } from "@/components/seo/PublicToolLanding";

export const metadata: Metadata = createPublicMetadata("worksheets");

export default function WorksheetsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SignedInFeatureGate featureName="Worksheets" nextPath="/worksheets" description={PAGE_CONTENT.worksheets.description} publicFallback={<PublicToolLanding tool="worksheets" />}>
      {children}
    </SignedInFeatureGate>
  );
}
