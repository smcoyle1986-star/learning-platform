import { createPublicMetadata } from "@/lib/seo/page-content";

export const metadata = createPublicMetadata("flashcards");

export default function FlashcardsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
