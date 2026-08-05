import { createGameMetadata } from "@/lib/seo/game-content";

export const metadata = createGameMetadata("yes-or-no");

export default function GameLayout({ children }: { children: React.ReactNode }) { return children; }
