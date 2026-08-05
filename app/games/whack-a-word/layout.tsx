import { createGameMetadata } from "@/lib/seo/game-content";

export const metadata = createGameMetadata("whack-a-word");

export default function GameLayout({ children }: { children: React.ReactNode }) { return children; }
