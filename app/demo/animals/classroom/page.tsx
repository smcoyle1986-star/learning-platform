"use client";

import ClassroomMode from "@/components/classroom/ClassroomMode";
import { ANIMALS_DEMO_CARDS } from "@/lib/demo/animals";
import { getResponsiveImageUrl } from "@/lib/images/storage";

export default function AnimalsDemoClassroomPage() {
  const firstImage = getResponsiveImageUrl(ANIMALS_DEMO_CARDS[0].image ?? "", 1024, 82);
  return <>
    {firstImage ? <link rel="preload" as="image" href={firstImage} fetchPriority="high" /> : null}
    <ClassroomMode demo />
  </>;
}
