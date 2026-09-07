"use client";

import { Suspense } from "react";
import WorksheetsPageContent from "@/components/worksheets/WorksheetsPageContent";

export default function AnimalsDemoBullseyePage() {
  return (
    <Suspense fallback={<p className="p-10">Loading worksheet preview…</p>}>
      <WorksheetsPageContent forceDemo />
    </Suspense>
  );
}
