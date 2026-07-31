import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminNavigation } from "@/components/admin/AdminNavigation";
import {
  AdminAuthorizationError,
  requireAdmin,
} from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let admin;

  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      if (error.status === 401) {
        redirect("/login?next=/admin");
      }

      if (error.status === 403) {
        redirect("/admin/unauthorized");
      }
    }

    throw error;
  }

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#2f3a2f]">
      <header className="border-b border-[#dde3d6] bg-white">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-6 px-5 py-4 sm:px-7">
          <div>
            <Link href="/admin" className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#5f7d50] text-lg font-bold text-white shadow-sm">
                C
              </span>
              <span>
                <span className="block text-lg font-semibold tracking-tight">
                  Classendo
                </span>
                <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#7b8678]">
                  Administration
                </span>
              </span>
            </Link>
          </div>

          <div className="min-w-0 text-right">
            <p className="truncate text-sm font-semibold text-[#394539]">
              {admin.email ?? admin.userId}
            </p>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#7b8678]">
              {admin.role}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[90rem] lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="border-b border-[#dde3d6] bg-white px-5 py-4 sm:px-7 lg:min-h-[calc(100vh-73px)] lg:border-b-0 lg:border-r lg:px-5 lg:py-7">
          <AdminNavigation />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
