import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminGuests } from "@/lib/admin/guest-analytics";

const date = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default async function GuestsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  const { page: raw } = await searchParams;
  const page = Math.max(1, Number.parseInt(raw ?? "1", 10) || 1);
  const result = await getAdminGuests(page);
  return <section className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
    <Link href="/admin/analytics" className="text-sm font-semibold text-[#58754c] hover:underline">← Back to analytics</Link>
    <h1 className="mt-6 text-3xl font-semibold">Guest journeys</h1>
    <p className="mt-2 text-sm text-[#6e786d]">Consented browser identities. A returning guest is recognized only while their browser retains its anonymous ID. Converted guests remain here for review but count as accounts in the overview.</p>
    <div className="mt-6 overflow-x-auto rounded-2xl border border-[#dfe4dc] bg-white">
      <table className="w-full min-w-[55rem] text-left text-sm">
        <thead className="bg-[#f5f7f2] text-xs uppercase text-[#778075]"><tr><th className="px-4 py-3">Guest</th><th className="px-4 py-3">First seen</th><th className="px-4 py-3">Last seen</th><th className="px-4 py-3">Sessions</th><th className="px-4 py-3">Last observed country</th><th className="px-4 py-3">Meaningful use</th><th className="px-4 py-3">Converted</th></tr></thead>
        <tbody>{result.guests.map((guest) => <tr key={guest.anonymousId} className="border-t border-[#edf0ea]"><td className="px-4 py-3"><Link href={`/admin/analytics/guests/${guest.anonymousId}`} className="font-semibold text-[#58754c] hover:underline">Guest {guest.anonymousId.slice(0, 8)}</Link></td><td className="px-4 py-3">{date(guest.firstSeenAt)}</td><td className="px-4 py-3">{date(guest.lastSeenAt)}</td><td className="px-4 py-3">{guest.sessions}</td><td className="px-4 py-3">{guest.lastCountryObserved ?? "Unknown"}</td><td className="px-4 py-3">{guest.meaningful ? "Yes" : "No"}</td><td className="px-4 py-3">{guest.linkedUserId ? <Link href={`/admin/analytics/users/${guest.linkedUserId}`} className="text-[#58754c] hover:underline">{guest.linkedUsername ?? "Account"}</Link> : "No"}</td></tr>)}</tbody>
      </table>
      {!result.guests.length && <p className="p-8 text-sm text-[#778075]">No consented guest identities recorded yet.</p>}
    </div>
    <nav className="mt-5 flex items-center gap-5 text-sm" aria-label="Guest pages">
      {page > 1 && <Link href={`/admin/analytics/guests?page=${page - 1}`} className="text-[#58754c] hover:underline">Previous</Link>}
      <span>Page {page}</span>
      {page * 25 < result.total && <Link href={`/admin/analytics/guests?page=${page + 1}`} className="text-[#58754c] hover:underline">Next</Link>}
    </nav>
  </section>;
}
