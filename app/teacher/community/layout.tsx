import type { Metadata } from "next";

import SignedInFeatureGate from "@/components/auth/SignedInFeatureGate";
import { createPublicMetadata, PAGE_CONTENT } from "@/lib/seo/page-content";

export const metadata: Metadata = createPublicMetadata("community");

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <SignedInFeatureGate featureName="Community" nextPath="/teacher/community" description={PAGE_CONTENT.community.description}>
      {children}
    </SignedInFeatureGate>
  );
}
