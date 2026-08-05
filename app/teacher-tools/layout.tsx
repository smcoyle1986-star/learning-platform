import { createPrivateMetadata, PAGE_CONTENT } from "@/lib/seo/page-content";

export const metadata = createPrivateMetadata(PAGE_CONTENT.teacherTools.title, PAGE_CONTENT.teacherTools.description);

export default function TeacherToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
