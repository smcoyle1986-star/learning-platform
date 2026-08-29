"use client";

import { usePathname } from "next/navigation";

import SignedInFeatureGate from "@/components/auth/SignedInFeatureGate";
import TimedGamePreviewGate from "@/components/billing/TimedGamePreviewGate";
import { PREMIUM_GAME_IDS } from "@/lib/billing/constants";
import { useBillingAccess } from "@/lib/billing/useBillingAccess";
import { PAGE_CONTENT } from "@/lib/seo/page-content";

export default function GamesAccessLayout({ children, publicFallback }: { children: React.ReactNode; publicFallback?: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SignedInFeatureGate featureName="Games" nextPath="/games" description={PAGE_CONTENT.games.description} publicFallback={pathname === "/games" ? publicFallback : undefined}>
      <SignedInGamesLayout>{children}</SignedInGamesLayout>
    </SignedInFeatureGate>
  );
}

function SignedInGamesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { access, canAccessGame } = useBillingAccess();

  if (pathname === "/games") {
    return <>{children}</>;
  }

  const gameId = pathname.split("/")[2] ?? "";
  const isKnownPremiumGame = PREMIUM_GAME_IDS.includes(gameId as (typeof PREMIUM_GAME_IDS)[number]);

  if (!isKnownPremiumGame) {
    return <>{children}</>;
  }

  // `useBillingAccess` refreshes after Supabase auth events such as a token
  // renewal. Keep an already-authorized game mounted during that background
  // request; unmounting it would discard the in-memory board and scores.
  // We still block the initial visit until an access snapshot exists.
  if (!access) {
    return <div className="min-h-[40vh] bg-[var(--color-bg-main)]" />;
  }

  if (!canAccessGame(gameId)) {
    return (
      <TimedGamePreviewGate
        key={gameId}
        gameId={gameId}
        userId={access.userId}
        featuredGameId={access.featuredGameId}
      >
        {children}
      </TimedGamePreviewGate>
    );
  }

  return <>{children}</>;
}
