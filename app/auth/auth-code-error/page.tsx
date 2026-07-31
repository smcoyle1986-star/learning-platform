import Link from "next/link";

export default function AuthCodeErrorPage() {
  return (
    <main className="min-h-screen bg-[#f7f6f2] px-6 py-16 text-[#2f3a2f]">
      <section className="mx-auto max-w-lg rounded-[2rem] border border-[#e2e6da] bg-white p-8 shadow-[0_18px_40px_rgba(54,64,46,0.10)]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a45d49]">
          Sign-in link expired
        </p>
        <h1 className="mt-3 text-3xl font-semibold">We could not confirm this sign-in.</h1>
        <p className="mt-4 leading-7 text-[#5c665c]">
          The link may have expired or already been used. Return to login and try again.
        </p>
        <Link
          href="/login"
          className="btn btn-primary mt-7 inline-flex px-6 py-3"
        >
          Return to login
        </Link>
      </section>
    </main>
  );
}
