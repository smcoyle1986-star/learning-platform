import { createPrivateMetadata, PAGE_CONTENT } from "@/lib/seo/page-content";

export const metadata = createPrivateMetadata(PAGE_CONTENT.feedback.title, PAGE_CONTENT.feedback.description);

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
