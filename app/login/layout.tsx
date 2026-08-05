import { createPrivateMetadata } from "@/lib/seo/page-content";

export const metadata = createPrivateMetadata("Teacher Login", "Sign in to your Classendo teaching account.");

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
