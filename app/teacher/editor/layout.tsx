import { createPrivateMetadata, PAGE_CONTENT } from "@/lib/seo/page-content";

export const metadata = createPrivateMetadata(PAGE_CONTENT.editor.title, PAGE_CONTENT.editor.description);

export default function EditorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
