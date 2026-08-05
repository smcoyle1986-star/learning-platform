import { createPrivateMetadata } from "@/lib/seo/page-content";

export const metadata = createPrivateMetadata("Administration", "Private Classendo administration tools.");

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
