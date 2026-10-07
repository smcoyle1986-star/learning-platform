import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getGuestJourney } from "@/lib/admin/guest-analytics";

const date = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export default async function GuestJourneyPage({ params }: { params: Promise<{ anonymousId: string }> }) {
  await requireAdmin();
  const { anonymousId } = await params;
  const guest = await getGuestJourney(anonymousId);
  if (!guest) notFound();
  return <section className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
    <Link href="/admin/analytics/guests" className="text-sm font-semibold text-[#58754c] hover:underline">← Guest journeys</Link>
    <h1 className="mt-6 text-3xl font-semibold">Guest {guest.anonymousId.slice(0, 8)}</h1>
    <p className="mt-2 text-sm text-[#6e786d]">First seen {date(guest.firstSeenAt)} · last seen {date(guest.lastSeenAt)} · {guest.sessions} sessions</p>
    <dl className="mt-5 grid gap-3 sm:grid-cols-3">{[
      ["First observed country", guest.firstCountryObserved],
      ["Last observed country", guest.lastCountryObserved],
      ["Account conversion", guest.linkedUserId ? "Linked" : "Not linked"],
    ].map(([label, value]) => <div key={label} className="rounded-xl border border-[#dfe4dc] bg-white p-4"><dt className="text-xs uppercase text-[#778075]">{label}</dt><dd className="mt-2 font-semibold">{value ?? "Unknown"}</dd></div>)}</dl>
    <p className="mt-3 text-xs text-[#778075]">Observed country is an approximate location from the deployment proxy and may reflect a VPN or proxy.</p>
    {guest.linkedUserId && <p className="mt-5 rounded-xl border border-[#cbdcc0] bg-[#edf4e9] p-4 text-sm">Guest → signup/sign-in → <Link href={`/admin/analytics/users/${guest.linkedUserId}`} className="font-semibold text-[#58754c] underline">authenticated account</Link>{guest.linkedAt ? ` · ${date(guest.linkedAt)}` : ""}</p>}
    <article className="mt-7 rounded-2xl border border-[#dfe4dc] bg-white p-5"><h2 className="font-semibold">Activity journey</h2><ol className="mt-3 divide-y divide-[#edf0ea]">{guest.events.map((event) => <li key={event.id} className="grid gap-2 py-3 sm:grid-cols-[10rem_1fr]"><time dateTime={event.createdAt} className="text-xs text-[#778075]">{date(event.createdAt)}</time><div><p className="font-medium capitalize">{event.title}</p>{event.detail && <p className="text-xs text-[#778075]">{event.detail}</p>}{event.countryObserved && <p className="text-xs text-[#778075]">Observed country: {event.countryObserved}</p>}</div></li>)}</ol>{!guest.events.length && <p className="mt-4 text-sm text-[#778075]">No tracked actions for this guest.</p>}</article>
  </section>;
}
