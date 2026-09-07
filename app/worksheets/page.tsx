import { Suspense } from "react";
import WorksheetsPageContent from "@/components/worksheets/WorksheetsPageContent";

export default function WorksheetsPage() {
  return (
    <Suspense fallback={<p className="p-10">Loading...</p>}>
      <WorksheetsPageContent />
    </Suspense>
  );
}
