import type { Metadata } from "next";

import GamesAccessLayout from "@/components/games/GamesAccessLayout";
import { createPublicMetadata } from "@/lib/seo/page-content";
import { PublicToolLanding } from "@/components/seo/PublicToolLanding";

export const metadata: Metadata = createPublicMetadata("games");

export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return <GamesAccessLayout publicFallback={<PublicToolLanding tool="games" />}>{children}</GamesAccessLayout>;
}
