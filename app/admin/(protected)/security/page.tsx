import { AdminMfaSetup } from "@/components/admin/AdminMfaSetup";
import { requireOwner } from "@/lib/admin/auth";

export default async function AdminSecurityPage() {
  const owner = await requireOwner();

  return (
    <section className="mx-auto max-w-6xl px-6 py-12">
      <div className="max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6c8f58]">
          Owner security
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          Multi-factor authentication
        </h1>
        <p className="mt-4 leading-7 text-[#5c665c]">
          Sensitive owner actions will require an authenticator code in
          addition to your password.
        </p>

        <AdminMfaSetup initialAssuranceLevel={owner.assuranceLevel} />
      </div>
    </section>
  );
}
