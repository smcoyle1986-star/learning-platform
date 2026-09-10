import type { Metadata } from "next";
import GamesAccessLayout from "@/components/games/GamesAccessLayout";
import { createPublicMetadata } from "@/lib/seo/page-content";
export const metadata: Metadata = createPublicMetadata("games");
export default function GamesLayout({ children }: { children: React.ReactNode }) {
  return <GamesAccessLayout>{children}</GamesAccessLayout>;
}
