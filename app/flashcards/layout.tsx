import { createPublicMetadata } from "@/lib/seo/page-content";
import { FlashcardsSearchGuide } from "@/components/seo/PublicToolLanding";

export const metadata = createPublicMetadata("flashcards");

export default function FlashcardsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<FlashcardsSearchGuide /></>;
}
