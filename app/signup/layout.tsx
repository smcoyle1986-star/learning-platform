import { createPrivateMetadata } from "@/lib/seo/page-content";

export const metadata = createPrivateMetadata("Create an Account", "Create a Classendo account for your teaching resources.");

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
