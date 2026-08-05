import { createGameMetadata } from "@/lib/seo/game-content";

export const metadata = createGameMetadata("four-corners");

export default function GameLayout({ children }: { children: React.ReactNode }) { return children; }
