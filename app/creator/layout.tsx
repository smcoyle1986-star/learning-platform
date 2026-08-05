import { createPublicMetadata } from "@/lib/seo/page-content";

export const metadata = createPublicMetadata("creator");

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
