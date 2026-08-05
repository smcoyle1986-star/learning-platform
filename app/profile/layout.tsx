import { createPrivateMetadata } from "@/lib/seo/page-content";

export const metadata = createPrivateMetadata("Profile", "Manage your Classendo account and teaching profile.");

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
