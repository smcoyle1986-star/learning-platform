import { Activity, ArrowLeft, Clock3, MousePointerClick, Users } from "lucide-react";
import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import { getAdminActivitySnapshot, type AdminActivityEvent } from "@/lib/admin/activity";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function periodValue(value: string) {
  if (value === "all") return null;
  if (value === "7" || value === "90") return Number(value);
  return 30;
}

function date(value: string) {
  return new Date(value).toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
    timeZoneName: "short",
  });
}

function shortId(value: string) {
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-5)}` : value;
}

function EventRow({ event }: { event: AdminActivityEvent }) {
  return (
    <li className="grid gap-2 border-b border-[#edf0ea] py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_12rem] sm:items-start">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[#3d493c]">{event.title}</p>
          <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold ${event.source === "Free Games" ? "bg-[#edf3e8] text-[#617e51]" : "bg-[#eef1f6] text-[#62718a]"}`}>{event.source}</span>
          {event.accountTier && <span className="rounded-full bg-[#f4f1e9] px-2 py-0.5 text-[0.65rem] font-semibold capitalize text-[#89734f]">{event.accountTier.replaceAll("_", " ")}</span>}
        </div>
        {event.detail && <p className="mt-1 text-xs capitalize leading-5 text-[#778175]">{event.detail}</p>}
        {event.userId && <p className="mt-1 font-mono text-[0.65rem] text-[#9aa197]">Account {shortId(event.userId)}</p>}
      </div>
      <time className="flex items-center gap-1.5 text-xs text-[#828b81]" dateTime={event.createdAt}><Clock3 aria-hidden="true" className="h-3.5 w-3.5" />{date(event.createdAt)}</time>
    </li>
  );
}

export default async function AdminActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const period = first(params.period) || "30";
  const periodDays = periodValue(period);
  const selectedKey = first(params.session);
  const activity = await getAdminActivitySnapshot(periodDays);
  const selected = selectedKey ? activity.sessions.find((item) => item.key === selectedKey) : null;
  const recentSessions = activity.sessions.slice(0, 100);
  const periodLabel = periodDays ? `Last ${periodDays} days` : "All time";

  return (
    <section className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
      <div className="flex flex-col justify-between gap-5 border-b border-[#dfe4dc] pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#718d63]">Consented first-party events</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#2f3a2f] sm:text-4xl">Activity Explorer</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e786d]">Follow tracked actions within a browser session across platform tools and Free Games. Times are shown in Korea Standard Time (KST). Session IDs are pseudonymous; account IDs are shortened.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfe4dc] bg-white px-3 py-2 text-[#687268]"><MousePointerClick aria-hidden="true" className="h-3.5 w-3.5" />{activity.events.toLocaleString()} events</span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#dfe4dc] bg-white px-3 py-2 text-[#687268]"><Users aria-hidden="true" className="h-3.5 w-3.5" />{activity.sessions.length.toLocaleString()} sessions</span>
        </div>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Activity period">
        {[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }, { value: "all", label: "All time" }].map((item) => (
          <Link key={item.value} href={`/admin/activity?period=${item.value}`} className={`rounded-xl px-4 py-2 text-sm font-semibold ${period === item.value ? "bg-[#5f7d50] text-white" : "border border-[#d9dfd5] bg-white text-[#647064] hover:bg-[#f4f7f1]"}`}>
            {item.label}
          </Link>
        ))}
      </nav>

      {activity.truncated && <p className="mt-4 rounded-xl border border-[#eadfc7] bg-[#fbf7ed] px-4 py-3 text-xs leading-5 text-[#7b6b4c]">Showing the latest 1,000 events from each source for {periodLabel}. Choose a shorter period to narrow the activity.</p>}

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(19rem,0.8fr)_minmax(0,1.2fr)]">
        <article className={`overflow-hidden rounded-2xl border border-[#dfe4dc] bg-white ${selected ? "order-last xl:order-none" : ""}`}>
          <div className="border-b border-[#e8ece5] p-5">
            <h2 className="flex items-center gap-2 font-semibold text-[#394439]"><Users aria-hidden="true" className="h-4 w-4 text-[#78906d]" />Recent sessions</h2>
            <p className="mt-1 text-xs text-[#7a8379]">{periodLabel} · most recently active first</p>
          </div>
          {recentSessions.length ? (
            <ol className="divide-y divide-[#edf0ea]">
              {recentSessions.map((session) => {
                const selectedSession = selectedKey === session.key;
                return (
                  <li key={session.key}>
                    <Link href={`/admin/activity?period=${period}&session=${encodeURIComponent(session.key)}#session-timeline`} aria-current={selectedSession ? "true" : undefined} className={`block px-5 py-4 transition hover:bg-[#f7f9f5] ${selectedSession ? "bg-[#f0f5ec]" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-xs font-semibold text-[#475647]">{session.userIds.length ? `Account ${shortId(session.userIds[0])}` : `Guest session ${shortId(session.key)}`}</p>
                          {session.userIds.length > 1 && <p className="mt-1 text-[0.65rem] text-[#8c948a]">{session.userIds.length} accounts in this browser session</p>}
                          <p className="mt-1 text-xs text-[#818a80]">{session.eventCount} tracked {session.eventCount === 1 ? "event" : "events"}</p>
                        </div>
                        <time className="shrink-0 text-[0.68rem] text-[#879085]" dateTime={session.lastActivity}>{date(session.lastActivity)}</time>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ol>
          ) : <p className="px-5 py-10 text-center text-sm text-[#7b8579]">No consented activity found for {periodLabel.toLowerCase()}.</p>}
          {activity.sessions.length > recentSessions.length && <p className="border-t border-[#edf0ea] px-5 py-3 text-xs text-[#879085]">Showing the latest 100 sessions.</p>}
        </article>

        <article id="session-timeline" className={`rounded-2xl border border-[#dfe4dc] bg-white p-5 sm:p-6 ${selected ? "order-first xl:order-none" : ""}`}>
          {selected ? (
            <>
              <div className="flex flex-col justify-between gap-3 border-b border-[#e8ece5] pb-4 sm:flex-row sm:items-start">
                <div>
                  <h2 className="font-semibold text-[#394439]">Session timeline</h2>
                  <p className="mt-1 break-all font-mono text-xs text-[#778175]">{selected.userIds.length ? `Account ${shortId(selected.userIds[0])}` : `Guest · ${shortId(selected.key)}`}</p>
                  <p className="mt-1 text-xs text-[#879085]">{selected.eventCount} events · first {date(selected.firstActivity)}</p>
                </div>
                <Link href={`/admin/activity?period=${period}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5f7d50] hover:underline"><ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />All sessions</Link>
              </div>
              <ol className="mt-1">
                {[...selected.events].reverse().map((event) => <EventRow key={event.id} event={event} />)}
              </ol>
            </>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <Activity aria-hidden="true" className="h-8 w-8 text-[#9aaa94]" />
              <h2 className="mt-3 font-semibold text-[#394439]">Select a session</h2>
              <p className="mt-1 max-w-sm text-sm leading-6 text-[#7a8379]">Choose a session to see its sequence of tracked product and Free Games events.</p>
            </div>
          )}
        </article>
      </div>

      <p className="mt-5 rounded-xl bg-[#f0f3ed] px-4 py-3 text-xs leading-5 text-[#758075]">This explorer includes only consented events already tracked by Classendo. It hides vocabulary search text and does not record every page view or interaction. Sessions without a browser session key appear as individual events.</p>
    </section>
  );
}
