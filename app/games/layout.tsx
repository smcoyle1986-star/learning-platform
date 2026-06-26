"use client";

import { usePathname } from "next/navigation";

import PremiumPreviewOverlay from "@/components/billing/PremiumPreviewOverlay";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";
import { PREMIUM_GAME_IDS } from "@/lib/billing/constants";

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { access, loading, canAccessGame } = useBillingAccess();

  if (pathname === "/games") {
    return <>{children}</>;
  }

  const gameId = pathname.split("/")[2] ?? "";
  const isKnownPremiumGame = PREMIUM_GAME_IDS.includes(gameId as (typeof PREMIUM_GAME_IDS)[number]);

  if (!isKnownPremiumGame) {
    return <>{children}</>;
  }

  if (loading || !access) {
    return <div className="min-h-[40vh] bg-[var(--color-bg-main)]" />;
  }

  if (!canAccessGame(gameId)) {
    return (
      <div className="relative">
        {children}
        <PremiumPreviewOverlay
          title="This game is locked on the Free plan"
          description={`You can preview this game here. Free teachers can fully play ${access.featuredGameId.replaceAll("-", " ")} this week. Upgrade to Premium to unlock every classroom game anytime.`}
          secondaryHref="/games"
          secondaryLabel="Return to Games"
        />
      </div>
    );
  }

  return <>{children}</>;
}
