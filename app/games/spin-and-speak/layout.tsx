import { createGameMetadata } from "@/lib/seo/game-content";

export const metadata = createGameMetadata("spin-and-speak");

export default function GameLayout({ children }: { children: React.ReactNode }) { return children; }
