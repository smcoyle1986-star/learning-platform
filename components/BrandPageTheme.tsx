"use client";

import { usePathname } from "next/navigation";
import { resolveBrandTheme } from "@/lib/brand/theme";

export default function BrandPageTheme() {
  const pathname = usePathname();
  const theme = resolveBrandTheme(pathname);

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[5] h-[7.5rem]"
        style={{
          background: `linear-gradient(180deg, ${theme.fade} 0%, rgba(255,255,255,0) 100%)`,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-[5] h-[7.5rem]"
        style={{
          background:
            "radial-gradient(circle_at_12%_18%, rgba(255,255,255,0.72), transparent 22%), radial-gradient(circle_at_88%_20%, rgba(255,255,255,0.55), transparent 18%)",
        }}
      />
    </>
  );
}
