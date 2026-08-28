import { createGameMetadata } from "@/lib/seo/game-content";

export const metadata = createGameMetadata("choose-your-side");

export default function ChooseYourSideLayout({ children }: { children: React.ReactNode }) {
  return children;
}
