import { createPrivateMetadata } from "@/lib/seo/page-content";

export const metadata = createPrivateMetadata("Classroom Game", "Internal Classendo game route.");

export default function LegacyGameLayout({ children }: { children: React.ReactNode }) { return children; }
