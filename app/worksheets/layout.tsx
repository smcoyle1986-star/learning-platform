import SignedInFeatureGate from "@/components/auth/SignedInFeatureGate";

export default function WorksheetsLayout({ children }: { children: React.ReactNode }) {
  return (
    <SignedInFeatureGate featureName="Worksheets" nextPath="/worksheets">
      {children}
    </SignedInFeatureGate>
  );
}
