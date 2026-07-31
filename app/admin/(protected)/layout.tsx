import Link from "next/link";
import { redirect } from "next/navigation";

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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-5">
          <div>
            <Link href="/admin" className="text-xl font-semibold tracking-tight">
              Classendo administration
            </Link>
            <p className="mt-1 text-sm text-[#687268]">
              Signed in as {admin.email ?? admin.userId} · {admin.role}
            </p>
          </div>

          {admin.role === "owner" && (
            <Link
              href="/admin/security"
              className="rounded-xl border border-[#cad5c1] px-4 py-2 text-sm font-semibold text-[#58704d] transition hover:bg-[#f2f6ee]"
            >
              Security
            </Link>
          )}
        </div>
      </header>

      {children}
    </main>
  );
}
