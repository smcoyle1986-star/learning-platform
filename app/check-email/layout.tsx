import { createPrivateMetadata } from "@/lib/seo/page-content";

export const metadata = createPrivateMetadata(
  "Confirm Your Email",
  "Confirm your email address to finish creating your Classendo account.",
);

export default function CheckEmailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
