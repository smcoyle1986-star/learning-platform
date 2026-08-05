import { createGameMetadata } from "@/lib/seo/game-content";

export const metadata = createGameMetadata("memory-flip");

export default function GameLayout({ children }: { children: React.ReactNode }) { return children; }
