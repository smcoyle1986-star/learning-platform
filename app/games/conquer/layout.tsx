import { createGameMetadata } from "@/lib/seo/game-content";

export const metadata = createGameMetadata("conquer");

export default function GameLayout({ children }: { children: React.ReactNode }) { return children; }
