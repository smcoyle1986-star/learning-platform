import { ClassroomModeSearchGuide } from "@/components/seo/PublicToolLanding";
import { createPublicMetadata } from "@/lib/seo/page-content";

export const metadata = createPublicMetadata("classroom");

export default function ClassroomLayout({ children }: { children: React.ReactNode }) {
  return <>{children}<ClassroomModeSearchGuide /></>;
}
