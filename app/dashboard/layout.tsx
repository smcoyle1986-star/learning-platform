import { createPrivateMetadata, PAGE_CONTENT } from "@/lib/seo/page-content";

export const metadata = createPrivateMetadata(PAGE_CONTENT.dashboard.title, PAGE_CONTENT.dashboard.description);

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
