import { createPrivateMetadata } from "@/lib/seo/page-content";

export const metadata = createPrivateMetadata("Noun Inventory Test", "Internal Classendo vocabulary testing page.");

export default function TestNounsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
