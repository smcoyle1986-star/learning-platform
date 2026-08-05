import { createPublicMetadata } from "@/lib/seo/page-content";

export const metadata = createPublicMetadata("printables");

export default function PrintablesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
