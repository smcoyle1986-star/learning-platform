"use client";

import { usePathname } from "next/navigation";

import PremiumPreviewOverlay from "@/components/billing/PremiumPreviewOverlay";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { access, loading } = useBillingAccess();

  const isPremiumTeacherRoute =
    pathname === "/teacher/community" || pathname === "/teacher/editor";

  if (!isPremiumTeacherRoute) {
    return <>{children}</>;
  }

  if (loading || !access) {
    return <div className="min-h-[40vh] bg-[var(--color-bg-main)]" />;
  }

  if (!access.isPremium) {
    const title = pathname === "/teacher/community"
      ? "Community is locked on the Free plan"
      : "Editor is locked on the Free plan";

    const description = pathname === "/teacher/community"
      ? "You can preview Community here. Upgrade to Premium to browse, preview, and reuse community lesson sets."
      : "You can preview the editor here. Upgrade to Premium to edit and save teacher lesson sets in the Classendo editor.";

    return (
      <div className="relative">
        {children}
        <PremiumPreviewOverlay
          title={title}
          description={description}
          secondaryHref="/dashboard"
          secondaryLabel="Return to My Lessons"
        />
      </div>
    );
  }

  return <>{children}</>;
}
