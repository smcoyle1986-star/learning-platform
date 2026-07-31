import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AdminUnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center bg-[#f7f6f2] px-6 text-[#2f3a2f]">
      <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-[#e3ddd3] bg-white p-8 shadow-[0_18px_40px_rgba(54,64,46,0.08)]">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a16c52]">
          Restricted area
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Administrator access required
        </h1>
        <p className="mt-4 leading-7 text-[#5c665c]">
          You are signed in, but this account does not have a Classendo
          administrator membership.
        </p>
        <Link href="/" className="btn btn-primary mt-7 inline-flex px-5 py-3">
          Return to Classendo
        </Link>
      </section>
    </main>
  );
}
