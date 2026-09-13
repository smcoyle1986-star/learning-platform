import {
  Activity,
  ArrowRight,
  Gamepad2,
  MousePointerClick,
  Presentation,
  Trophy,
  UserPlus,
} from "lucide-react";

import { requireAdmin } from "@/lib/admin/auth";
import { getFreeAnalyticsSnapshot, type FreeAnalyticsBreakdownItem, type FreeAnalyticsItem } from "@/lib/admin/free-analytics";

function periodValue(raw: string) {
  return raw === "all" ? null : [7, 30, 90].includes(Number(raw)) ? Number(raw) : 30;
}

function List({ title, description, items, empty }: { title: string; description: string; items: (FreeAnalyticsItem | FreeAnalyticsBreakdownItem)[]; empty: string }) {
  return (
    <article className="rounded-2xl border border-[#dfe4dc] bg-white p-5">
      <h2 className="font-semibold text-[#394439]">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-[#7a8379]">{description}</p>
      {items.length ? (
        <ol className="mt-4 space-y-3">
          {items.slice(0, 10).map((item, index) => (
            <li key={`${item.label}-${item.category ?? ""}`} className="flex items-center gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#eff5eb] text-xs font-bold text-[#5f7d50]">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm text-[#3d493d]">{item.label.replaceAll("_", " ")}</strong>
                {item.category && <small className="block truncate text-xs text-[#7b8579]">{item.category}</small>}
                {"starts" in item && <small className="block truncate text-[10px] text-[#7b8579]">Start {item.starts} · interact {item.interactions} · complete {item.completions} · own vocab {item.ownVocabularyClicks} · signup {item.signupStarts}/{item.signupCompletions}</small>}
              </span>
              <strong className="text-sm text-[#4d6344]">{item.count.toLocaleString()}</strong>
            </li>
          ))}
        </ol>
      ) : <p className="mt-4 text-sm text-[#7b8579]">{empty}</p>}
    </article>
  );
}

export default async function FreeAnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const params = await searchParams;
  const period = typeof params.period === "string" ? params.period : "30";
  const periodDays = periodValue(period);
  const analytics = await getFreeAnalyticsSnapshot(periodDays);
  const label = periodDays ? `Last ${periodDays} days` : "All time";
  const cards = [
    { label: "Hub sessions", value: analytics.summary.hubSessions, helper: "Unique consented sessions", icon: Activity },
    { label: "Games started", value: analytics.summary.starts, helper: `${analytics.summary.startRate}% of hub sessions`, icon: Gamepad2 },
    { label: "Meaningfully interacted", value: analytics.summary.meaningfulInteractions, helper: "3 player actions in a game", icon: MousePointerClick },
    { label: "Games completed", value: analytics.summary.completions, helper: `${analytics.summary.completionRate}% of meaningful interactions`, icon: Trophy },
    { label: "Started, no interaction", value: analytics.summary.startedWithoutInteraction, helper: "Game sessions without 3 actions", icon: Activity },
    { label: "Interacted, not completed", value: analytics.summary.interactedWithoutCompletion, helper: "Meaningful sessions without a completion event", icon: Activity },
    { label: "Own vocabulary clicks", value: analytics.summary.ownVocabularyClicks, helper: "Unique sessions clicking a custom-vocabulary CTA", icon: MousePointerClick },
    { label: "Signups started", value: analytics.summary.signupStarts, helper: "From Free Games routes", icon: MousePointerClick },
    { label: "Accounts created", value: analytics.summary.signupCompletions, helper: `${analytics.summary.signupRate}% of signup starts`, icon: UserPlus },
    { label: "Animals Demo starts", value: analytics.summary.demoStarts, helper: "Separate demo lesson path", icon: Presentation },
  ];
  const max = Math.max(1, ...analytics.trend.map((item) => Math.max(item.starts, item.interactions, item.completions, item.signups)));

  return (
    <section className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
      <div className="border-b border-[#dfe4dc] pb-7">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#718d63]">Acquisition and classroom use</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#2f3a2f] sm:text-4xl">Free Games funnel</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[#6e786d]">See how consented visitors move from the Free Games hub into gameplay, then toward their own vocabulary and account signup. A started game is not treated as an acquisition failure when it is not completed.</p>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Free Games analytics period">
        {[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }, { value: "all", label: "All time" }].map((item) => (
          <a key={item.value} href={`/admin/free-analytics?period=${item.value}`} className={`rounded-xl px-4 py-2 text-sm font-semibold ${period === item.value ? "bg-[#5f7d50] text-white" : "border border-[#d9dfd5] bg-white text-[#647064] hover:bg-[#f4f7f1]"}`}>{item.label}</a>
        ))}
      </nav>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label: cardLabel, value, helper, icon: Icon }) => (
          <article key={cardLabel} className="rounded-2xl border border-[#dfe4dc] bg-white p-4">
            <div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#7b8579]">{cardLabel}</p><Icon className="h-4 w-4 text-[#78906d]" /></div>
            <p className="mt-3 text-2xl font-semibold text-[#344034]">{value.toLocaleString()}</p>
            <p className="mt-1 text-[0.68rem] text-[#8a9288]">{helper} · {label}</p>
          </article>
        ))}
      </div>

      <article className="mt-5 rounded-2xl border border-[#dfe4dc] bg-white p-5">
        <div><h2 className="font-semibold text-[#394439]">Gameplay funnel</h2><p className="mt-1 text-xs leading-5 text-[#7a8379]">Counts are unique sessions; each rate compares with the previous stage. Completion is contextualized against meaningful interaction, so an engaged game remains visible even when it is not finished.</p></div>
        <ol className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {analytics.funnel.map((stage, index) => (
            <li key={stage.key} className="relative rounded-xl border border-[#e2e7df] bg-[#fbfcfa] p-4">
              {index > 0 && <ArrowRight aria-hidden="true" className="absolute -left-5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-[#9aaa94] xl:block" />}
              <p className="text-xs font-semibold uppercase tracking-[0.09em] text-[#758075]">{stage.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#344034]">{stage.sessions.toLocaleString()}</p>
              <p className="mt-1 text-xs text-[#7b8579]">{stage.previousRate === null ? "Starting point" : `${stage.previousRate}% of previous stage`}</p>
            </li>
          ))}
        </ol>
      </article>

      <article className="mt-5 rounded-2xl border border-[#dfe4dc] bg-white p-5">
        <div><h2 className="font-semibold text-[#394439]">Custom vocabulary and signup</h2><p className="mt-1 text-xs leading-5 text-[#7a8379]">The account conversion path is measured separately from finishing a game.</p></div>
        <ol className="mt-6 grid gap-3 md:grid-cols-3">
          {analytics.conversionFunnel.map((stage, index) => (
            <li key={stage.key} className="relative rounded-xl border border-[#e2e7df] bg-[#fbfcfa] p-4">
              {index > 0 && <ArrowRight aria-hidden="true" className="absolute -left-5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-[#9aaa94] md:block" />}
              <p className="text-xs font-semibold uppercase tracking-[0.09em] text-[#758075]">{stage.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[#344034]">{stage.sessions.toLocaleString()}</p>
              <p className="mt-1 text-xs text-[#7b8579]">{stage.previousRate === null ? "Starting point" : `${stage.previousRate}% of previous stage`}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-[#7b8579]">Also recorded: {analytics.summary.anotherGames.toLocaleString()} sessions selected another game and {analytics.summary.anotherTopics.toLocaleString()} tried another topic.</p>
      </article>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <List title="Campaigns and referring sites" description="Funnel counts by first-touch UTM campaign, source, or referring site." items={analytics.campaigns} empty="Campaign data will appear after a consented visitor reaches Free Games." />
        <List title="Countries" description="Vercel’s anonymous two-letter country context, with funnel counts. Local development will show unknown." items={analytics.countries} empty="Country data will appear after production activity." />
        <List title="Devices" description="Coarse device category inferred from the request, with funnel counts. No full user-agent is stored." items={analytics.devices} empty="Device data will appear after a consented visitor reaches Free Games." />
        <List title="Games" description="Unique sessions at each gameplay and signup stage, grouped by game." items={analytics.games} empty="No Free Games starts recorded yet." />
        <List title="Topics" description="Unique sessions at each gameplay and signup stage, grouped by prepared topic." items={analytics.topics} empty="No public topics started yet." />
        <List title="Games started by account" description="Access tier at the moment the game starts." items={analytics.accountTiers} empty="No account-tier activity recorded yet." />
        <List title="After-game choices" description="Unique sessions choosing a winner-screen action." items={analytics.finishActions} empty="No winner-screen actions recorded yet." />
      </div>

      <article className="mt-5 rounded-2xl border border-[#dfe4dc] bg-white p-5">
        <div><h2 className="font-semibold text-[#394439]">Daily games and signup outcomes</h2><p className="mt-1 text-xs text-[#7a8379]">Unique sessions per day for starts, meaningful interactions, completed games, and server-confirmed accounts.</p></div>
        <div className="mt-6 flex h-44 items-end gap-1.5">
          {analytics.trend.length ? analytics.trend.map((item) => (
            <div key={item.date} className="flex h-full min-w-0 flex-1 items-end gap-px" title={`${item.date}: ${item.starts} starts, ${item.completions} completions, ${item.signups} accounts`}>
              <div className="w-1/3 rounded-t bg-[#87a578]" style={{ height: `${Math.max(item.starts ? 6 : 1, (item.starts / max) * 150)}px` }} />
              <div className="w-1/3 rounded-t bg-[#7c96c8]" style={{ height: `${Math.max(item.interactions ? 6 : 1, (item.interactions / max) * 150)}px` }} />
              <div className="w-1/3 rounded-t bg-[#e0ae61]" style={{ height: `${Math.max(item.completions ? 6 : 1, (item.completions / max) * 150)}px` }} />
              <div className="w-1/3 rounded-t bg-[#a78bca]" style={{ height: `${Math.max(item.signups ? 6 : 1, (item.signups / max) * 150)}px` }} />
            </div>
          )) : <p className="m-auto text-sm text-[#7b8579]">Free Games activity will appear here after teachers opt in to analytics.</p>}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-[#758075]"><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#87a578]" />Starts</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#7c96c8]" />Meaningful interactions</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#e0ae61]" />Completed</span><span><i className="mr-1 inline-block h-2 w-2 rounded-sm bg-[#a78bca]" />Accounts created</span></div>
      </article>

      <p className="mt-5 rounded-2xl border border-[#dfe4dc] bg-[#f9faf7] p-4 text-xs leading-5 text-[#747e73]">This dashboard is Classendo’s detailed, consented Free Games funnel. Use Vercel Web Analytics for overall traffic and route-level pageviews, and Google Ads for campaign delivery and ad-platform conversions. No teacher-entered vocabulary or classroom answers appear here.</p>
    </section>
  );
}
