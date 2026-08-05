import { createPrivateMetadata } from "@/lib/seo/page-content";

export const metadata = createPrivateMetadata("Account Confirmation", "Complete or troubleshoot your Classendo account sign-in.");

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
