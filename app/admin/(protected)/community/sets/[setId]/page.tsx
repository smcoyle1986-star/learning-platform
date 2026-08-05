import { ArrowLeft, CalendarDays, Flag, Layers3, Mail, Tags, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminCommunityReportActions } from "@/components/admin/AdminCommunityReportActions";
import { AdminCommunitySetActions } from "@/components/admin/AdminCommunitySetActions";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminCommunitySetDetail } from "@/lib/admin/community";

const dateFormatter = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });
function date(value: string | null) { if (!value) return "Not set"; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? "Unknown" : dateFormatter.format(parsed); }
function state(set: { deletedAt: string | null; hiddenAt: string | null; isFeatured: boolean; isPublic: boolean }) { if (set.deletedAt) return "Deleted"; if (set.hiddenAt) return "Hidden"; if (set.isFeatured) return "Featured"; return set.isPublic ? "Public" : "Private"; }

export default async function AdminCommunitySetDetailPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = await params;
  const administrator = await requireAdmin();
  const set = await getAdminCommunitySetDetail(setId);
  if (!set) notFound();
  const owner = set.username || set.displayName || set.email || "Deleted user";
  return <section className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
    <Link href="/admin/community" className="inline-flex items-center gap-2 text-sm font-semibold text-[#62745b] hover:text-[#42543d]"><ArrowLeft className="h-4 w-4" />Back to moderation</Link>
    <div className="mt-6 flex flex-col justify-between gap-5 border-b border-[#dfe4dc] pb-7 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#718d63]">Community set review</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#2f3a2f]">{set.name}</h1><p className="mt-2 text-sm text-[#747d73]">Published by {owner} · {date(set.createdAt)}</p></div><span className="w-fit rounded-full bg-[#eef1ea] px-3 py-1.5 text-xs font-semibold text-[#687267]">{state(set)}</span></div>
    <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
      <div className="min-w-0 space-y-5">
        <article className="rounded-2xl border border-[#dfe4dc] bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold text-[#394439]"><Layers3 className="h-5 w-5 text-[#67815b]" />Cards</h2><span className="text-xs font-semibold text-[#7c857b]">{set.cards.length}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-2">{set.cards.map((card, index) => <div key={card.id} className="rounded-xl border border-[#e3e7e0] bg-[#fbfcfa] p-4"><p className="text-xs font-bold uppercase tracking-[0.1em] text-[#8a9288]">Card {index + 1}</p><p className="mt-2 break-words font-semibold text-[#3e493e]">{card.front}</p><p className="mt-2 break-all text-xs leading-5 text-[#747e73]">{card.back || "No image reference"}</p></div>)}</div>{!set.cards.length && <p className="mt-4 text-sm text-[#747e73]">This set has no cards.</p>}</article>
        <article className="rounded-2xl border border-[#dfe4dc] bg-white p-5"><h2 className="flex items-center gap-2 text-lg font-semibold text-[#394439]"><Flag className="h-5 w-5 text-[#936954]" />Reports ({set.reports.length})</h2><div className="mt-4 divide-y divide-[#edf0ea]">{set.reports.map((report) => <div key={report.id} className="py-4 first:pt-0 last:pb-0"><div className="flex justify-between gap-3"><p className="text-sm leading-6 text-[#596359]">{report.reason}</p><span className="h-fit rounded-full bg-[#f3eee2] px-2.5 py-1 text-xs font-semibold capitalize text-[#80673e]">{report.status}</span></div><p className="mt-1 text-xs text-[#818a80]">{report.reporterEmail ?? "Reporter account unavailable"} · {date(report.createdAt)}</p>{report.resolutionNote && <p className="mt-2 text-xs text-[#687366]">Resolution: {report.resolutionNote}</p>}<AdminCommunityReportActions reportId={report.id} pending={report.status === "pending"} /></div>)}</div>{!set.reports.length && <p className="mt-4 text-sm text-[#747e73]">No reports have been submitted for this set.</p>}</article>
      </div>
      <aside className="space-y-5">
        <article className="rounded-2xl border border-[#dfe4dc] bg-white p-5"><h2 className="font-semibold text-[#394439]">Set details</h2><dl className="mt-3 space-y-3 text-sm"><div className="flex gap-2"><UserRound className="mt-0.5 h-4 w-4 text-[#77906b]" /><div><dt className="text-xs uppercase tracking-wide text-[#899087]">Owner</dt><dd className="mt-0.5 break-words text-[#465146]">{owner}</dd></div></div><div className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 text-[#77906b]" /><div><dt className="text-xs uppercase tracking-wide text-[#899087]">Email</dt><dd className="mt-0.5 break-all text-[#465146]">{set.email ?? "Unavailable"}</dd></div></div><div className="flex gap-2"><Tags className="mt-0.5 h-4 w-4 text-[#77906b]" /><div><dt className="text-xs uppercase tracking-wide text-[#899087]">Tags</dt><dd className="mt-0.5 text-[#465146]">{set.tags.join(", ") || "None"}</dd></div></div><div className="flex gap-2"><CalendarDays className="mt-0.5 h-4 w-4 text-[#77906b]" /><div><dt className="text-xs uppercase tracking-wide text-[#899087]">Featured</dt><dd className="mt-0.5 text-[#465146]">{date(set.featuredAt)}</dd></div></div></dl>{set.moderationNote && <p className="mt-4 rounded-xl bg-[#f8f0eb] p-3 text-xs leading-5 text-[#815f50]">Moderation note: {set.moderationNote}</p>}</article>
        <AdminCommunitySetActions setId={set.id} isPublic={set.isPublic} isFeatured={set.isFeatured} hidden={Boolean(set.hiddenAt)} deleted={Boolean(set.deletedAt)} canDelete={administrator.role === "owner"} mfaVerified={administrator.assuranceLevel === "aal2"} />
      </aside>
    </div>
  </section>;
}
