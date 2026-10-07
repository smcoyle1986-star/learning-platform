import { ArrowLeft, CalendarDays, Clock3, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdmin } from "@/lib/admin/auth";
import { getAuthenticatedAnalyticsTimeline } from "@/lib/admin/authenticated-analytics";

function date(value: string | null) {
  if (!value) return "Not available";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Unknown" : new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function sourceLabel(source: string) {
  if (source === "guest") return "Before account creation";
  if (source === "lifecycle" || source === "account") return "Account lifecycle";
  if (source === "free_games") return "Free Games";
  if (source === "resource") return "Saved resource";
  return "Classendo";
}

export default async function AuthenticatedUserTimelinePage({ params }: { params: Promise<{ userId: string }> }) {
  await requireAdmin();
  const { userId } = await params;
  const timeline = await getAuthenticatedAnalyticsTimeline(userId);
  if (!timeline) notFound();
  return <section className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
    <Link href="/admin/analytics/users" className="inline-flex items-center gap-2 text-sm font-semibold text-[#62745b] hover:text-[#42543d]"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Authenticated Users</Link>
    <div className="mt-6 border-b border-[#dfe4dc] pb-7"><p className="text-xs font-bold uppercase tracking-[0.22em] text-[#718d63]">Private account journey</p><h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold tracking-tight text-[#2f3a2f] sm:text-4xl"><UserRound aria-hidden="true" className="h-8 w-8 text-[#6f8b61]" />{timeline.user.label}</h1><p className="mt-3 text-sm text-[#727b71]">{timeline.user.email ?? "No email"} · {timeline.sessions} linked {timeline.sessions === 1 ? "session" : "sessions"} · account created {date(timeline.user.createdAt)}</p></div>
    <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]"><div className="space-y-5"><article className="rounded-2xl border border-[#dfe4dc] bg-white p-5"><h2 className="font-semibold text-[#394439]">Activity timeline</h2><p className="mt-1 text-xs text-[#7a8379]">Guest activity appears only when a consented identity was linked to this account.</p><ol className="mt-5 divide-y divide-[#edf0ea]">{timeline.events.map((event) => <li key={event.id} className="grid gap-2 py-4 sm:grid-cols-[9rem_minmax(0,1fr)]"><time dateTime={event.createdAt} className="flex items-center gap-1.5 text-xs text-[#7e887d]"><Clock3 className="h-3.5 w-3.5" />{date(event.createdAt)}</time><div><span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${event.source === "guest" ? "bg-[#f6efe0] text-[#8a7043]" : "bg-[#edf3e8] text-[#617e51]"}`}>{sourceLabel(event.source)}</span><p className="mt-2 text-sm font-semibold text-[#3d493c]">{event.title}</p>{event.detail && <p className="mt-1 text-xs text-[#778175]">{event.detail}</p>}</div></li>)}</ol>{!timeline.events.length && <p className="py-10 text-center text-sm text-[#7b8579]">No activity is available for this account yet.</p>}</article></div><aside className="space-y-5"><article className="rounded-2xl border border-[#dfe4dc] bg-white p-5"><h2 className="font-semibold text-[#394439]">Account</h2><dl className="mt-4 space-y-3 text-sm">{[["User type", timeline.user.userType ?? "Not set"], ["Created", date(timeline.user.createdAt)], ["Email verified", timeline.emailVerifiedAt ? `Yes · ${date(timeline.emailVerifiedAt)}` : "No"], ["Trial start", date(timeline.trialStartedAt)], ["Trial end", date(timeline.trialEndsAt)], ["Country/region supplied", timeline.user.countryRegion ?? "Not set"], ["Signup country observed", timeline.user.signupCountryObserved ?? "Unknown"], ["Last country observed", timeline.user.lastCountryObserved ?? "Unknown"]].map(([label, value]) => <div key={label}><dt className="text-xs uppercase tracking-[0.1em] text-[#879085]">{label}</dt><dd className="mt-1 text-[#485448]">{value}</dd></div>)}</dl><p className="mt-4 text-xs text-[#879085]">Observed countries are approximate IP-derived locations and may reflect VPNs or proxies.</p></article><article className="rounded-2xl border border-[#dfe4dc] bg-white p-5"><h2 className="flex items-center gap-2 font-semibold text-[#394439]"><CalendarDays className="h-4 w-4 text-[#718d63]" />Acquisition</h2><dl className="mt-4 space-y-3 text-sm">{[["Source", timeline.acquisition.source], ["Medium", timeline.acquisition.medium], ["Campaign", timeline.acquisition.campaign], ["Content", timeline.acquisition.content], ["Term", timeline.acquisition.term], ["Referrer", timeline.acquisition.referrer], ["First landing page", timeline.acquisition.landingPath]].map(([label, value]) => <div key={label}><dt className="text-xs uppercase tracking-[0.1em] text-[#879085]">{label}</dt><dd className="mt-1 break-words text-[#485448]">{value || "Unknown"}</dd></div>)}</dl></article></aside></div>
  </section>;
}
