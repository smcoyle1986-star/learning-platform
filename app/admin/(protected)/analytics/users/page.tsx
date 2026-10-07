import { Activity, ArrowLeft, ChevronLeft, ChevronRight, UserRoundSearch } from "lucide-react";
import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import { getAuthenticatedAnalyticsUsers } from "@/lib/admin/authenticated-analytics";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function pageNumber(value: string) {
  const number = Number.parseInt(value, 10);
  return Number.isFinite(number) && number > 0 ? number : 1;
}

function date(value: string | null) {
  if (!value) return "Never";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Unknown" : new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

export default async function AuthenticatedUsersAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const page = pageNumber(first(params.page));
  const query = first(params.q).trim();
  const result = await getAuthenticatedAnalyticsUsers({ page, query });
  const pageCount = Math.max(1, Math.ceil(result.total / 25));
  const href = (next: number) => {
    const search = new URLSearchParams();
    if (query) search.set("q", query);
    if (next > 1) search.set("page", String(next));
    const value = search.toString();
    return `/admin/analytics/users${value ? `?${value}` : ""}`;
  };

  return (
    <section className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
      <Link href="/admin/analytics" className="inline-flex items-center gap-2 text-sm font-semibold text-[#62745b] hover:text-[#42543d]">
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to analytics
      </Link>
      <div className="mt-6 flex flex-col justify-between gap-5 border-b border-[#dfe4dc] pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#718d63]">Private first-party analytics</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#2f3a2f] sm:text-4xl">Authenticated Users</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e786d]">Open a Classendo account to see its joined, chronological product journey. Usernames are display labels; UUIDs remain internal only.</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-xl border border-[#dfe4dc] bg-white px-3 py-2 text-sm text-[#687268]"><Activity aria-hidden="true" className="h-4 w-4" />{result.total} accounts</span>
      </div>

      <form action="/admin/analytics/users" className="mt-6 flex max-w-xl gap-2">
        <label className="sr-only" htmlFor="analytics-user-search">Search accounts</label>
        <input id="analytics-user-search" name="q" defaultValue={query} placeholder="Search username or display name" className="min-w-0 flex-1 rounded-xl border border-[#d9dfd5] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#88a879] focus:ring-4 focus:ring-[#edf3e9]" />
        <button className="btn btn-primary px-4 py-2.5 text-sm">Search</button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-[#dfe4dc] bg-white shadow-[0_10px_28px_rgba(52,65,48,0.04)]">
        <table className="min-w-[100rem] w-full text-left text-sm">
          <thead className="border-b border-[#e8ece5] bg-[#fbfcfa] text-xs uppercase tracking-[0.1em] text-[#7e887d]"><tr><th className="px-5 py-4">Username / email</th><th className="px-4 py-4">User type</th><th className="px-4 py-4">Created</th><th className="px-4 py-4">Signup country (supplied)</th><th className="px-4 py-4">Signup country (observed)</th><th className="px-4 py-4">Email verified</th><th className="px-4 py-4">Trial</th><th className="px-4 py-4">First seen</th><th className="px-4 py-4">Last active</th><th className="px-4 py-4">Sessions</th><th className="px-4 py-4">Meaningful actions</th><th className="px-4 py-4">Last country (observed)</th><th className="px-5 py-4">Acquisition</th></tr></thead>
          <tbody>
            {result.users.map((user) => <tr key={user.id} className="border-b border-[#edf0ea] last:border-0 hover:bg-[#f8faf6]"><td className="px-5 py-4"><Link href={`/admin/analytics/users/${encodeURIComponent(user.id)}`} className="inline-flex items-center gap-2 font-semibold text-[#4f7044] hover:underline"><UserRoundSearch aria-hidden="true" className="h-4 w-4" />{user.label}</Link><p className="mt-1 text-xs text-[#788278]">{user.email ?? "No email"}</p></td><td className="px-4 py-4">{user.userType ?? "Not set"}</td><td className="px-4 py-4">{date(user.createdAt)}</td><td className="px-4 py-4">{user.countryRegion ?? "Not set"}</td><td className="px-4 py-4">{user.signupCountryObserved ?? "Unknown"}</td><td className="px-4 py-4">{user.emailVerifiedAt ? `Yes · ${date(user.emailVerifiedAt)}` : "No"}</td><td className="px-4 py-4">{user.trialStatus}{user.trialStartedAt && <p className="text-xs text-[#788278]">{date(user.trialStartedAt)} → {date(user.trialEndsAt)}</p>}</td><td className="px-4 py-4">{date(user.firstSeenAt)}</td><td className="px-4 py-4">{date(user.lastActiveAt)}</td><td className="px-4 py-4 tabular-nums">{user.sessions}</td><td className="px-4 py-4 tabular-nums">{user.meaningfulEvents}</td><td className="px-4 py-4">{user.lastCountryObserved ?? "Unknown"}</td><td className="px-5 py-4">{user.acquisitionSource}</td></tr>)}
          </tbody>
        </table>
        {!result.users.length && <p className="px-5 py-12 text-center text-sm text-[#7b8579]">No accounts match this search.</p>}
      </div>
      <p className="mt-3 text-xs text-[#778175]">Observed countries are approximate IP-derived locations. A VPN or proxy can change them; the supplied signup country is the user’s answer.</p>
      {pageCount > 1 && <nav className="mt-5 flex items-center justify-between" aria-label="Authenticated user pages"><Link aria-disabled={page <= 1} href={href(Math.max(1, page - 1))} className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold ${page <= 1 ? "pointer-events-none opacity-40" : "border-[#d9dfd5] text-[#5f7d50]"}`}><ChevronLeft className="h-4 w-4" />Previous</Link><span className="text-sm text-[#737d72]">Page {page} of {pageCount}</span><Link aria-disabled={page >= pageCount} href={href(Math.min(pageCount, page + 1))} className={`inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold ${page >= pageCount ? "pointer-events-none opacity-40" : "border-[#d9dfd5] text-[#5f7d50]"}`}>Next<ChevronRight className="h-4 w-4" /></Link></nav>}
    </section>
  );
}
