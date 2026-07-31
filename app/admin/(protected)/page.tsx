import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";

export default async function AdminAccessPage() {
  const admin = await requireAdmin();

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="max-w-3xl rounded-[2rem] border border-[#dde3d6] bg-white p-8 shadow-[0_18px_40px_rgba(54,64,46,0.08)]">
        <div className="inline-flex rounded-full bg-[#edf4e8] px-3 py-1 text-sm font-semibold text-[#58704d]">
          Phase 2 authorization active
        </div>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight">
          Administrator access is ready
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-[#5c665c]">
          Your verified account has the <strong>{admin.role}</strong> role.
          The operational dashboard, moderation queues, user tools, and
          reusable community lesson-set workflow will be added in the next
          phases.
        </p>

        {admin.role === "owner" && (
          <Link
            href="/admin/security"
            className="btn btn-primary mt-7 inline-flex px-5 py-3"
          >
            Configure owner security
          </Link>
        )}
      </div>
    </section>
  );
}
