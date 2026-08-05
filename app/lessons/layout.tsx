import { createPublicMetadata } from "@/lib/seo/page-content";

export const metadata = createPublicMetadata("lessons");

export default function LessonsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
