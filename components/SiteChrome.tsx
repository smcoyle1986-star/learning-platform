"use client";

import { usePathname } from "next/navigation";

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // A game owns its whole page, including the top control bar. Rendering the
  // regular site header here would place it above the game's fixed controls.
  if ((pathname.startsWith("/games/") && !["/games/topics", "/games/custom"].includes(pathname))) return null;

  return <>{children}</>;
}
