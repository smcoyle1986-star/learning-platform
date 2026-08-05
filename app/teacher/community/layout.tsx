import SignedInFeatureGate from "@/components/auth/SignedInFeatureGate";

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return (
    <SignedInFeatureGate featureName="Community" nextPath="/teacher/community">
      {children}
    </SignedInFeatureGate>
  );
}
