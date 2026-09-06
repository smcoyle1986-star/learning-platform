"use client";

import { Suspense } from "react";
import { WorksheetsPageContent } from "@/app/worksheets/page";

export default function AnimalsDemoBullseyeCompletePage() {
  return (
    <Suspense fallback={<p className="p-10">Loading worksheet preview…</p>}>
      <WorksheetsPageContent forceDemo showDemoCompletion={false} />
    </Suspense>
  );
}
