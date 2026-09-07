"use client";

import ClassroomMode from "@/components/classroom/ClassroomMode";
import { ANIMALS_DEMO_CARDS } from "@/lib/demo/animals";
import { getOptimizedImageUrl } from "@/lib/images/storage";

export default function AnimalsDemoClassroomPage() {
  const firstImage = getOptimizedImageUrl(ANIMALS_DEMO_CARDS[0].image ?? "", 1440, 82);
  return <>
    {firstImage ? <link rel="preload" as="image" href={firstImage} fetchPriority="high" /> : null}
    <ClassroomMode demo />
  </>;
}
