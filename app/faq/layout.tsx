import { createPublicMetadata } from "@/lib/seo/page-content";

export const metadata = createPublicMetadata("faq");

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
