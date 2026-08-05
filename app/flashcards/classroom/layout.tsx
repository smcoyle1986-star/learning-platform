import { createPrivateMetadata } from "@/lib/seo/page-content";

export const metadata = createPrivateMetadata(
  "Classroom Flashcards",
  "Present the cards in your lesson tray as large classroom flashcards."
);

export default function ClassroomLayout({ children }: { children: React.ReactNode }) {
  return children;
}
