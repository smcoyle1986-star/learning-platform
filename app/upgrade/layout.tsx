import { createPublicMetadata } from "@/lib/seo/page-content";

export const metadata = createPublicMetadata("upgrade");

export default function UpgradeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
