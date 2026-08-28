import {
  Activity,
  BarChart3,
  Crown,
  Eye,
  FileText,
  Gamepad2,
  Search,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import {
  getAdminAnalyticsSnapshot,
  type AdminAnalyticsRankedItem,
} from "@/lib/admin/analytics";
import { AdminAnalyticsAutoRefresh } from "@/components/admin/AdminAnalyticsAutoRefresh";

const GAME_LABELS: Record<string, string> = {
  "connect-four": "Connect Four",
  conquer: "Conquer",
  "four-corners": "Four Corners",
  "image-reveal": "Image Reveal",
  kaboom: "Kaboom",
  "memory-flip": "Memory Flip",
  "spin-and-speak": "Spin and Speak",
  "whack-a-word": "Whack-a-Word",
  "yes-or-no": "Yes or No",
  "choose-your-side": "Choose Your Side",
};

const WORKSHEET_LABELS: Record<string, string> = {
  crossword: "Crossword",
  bullseye: "Bullseye",
  matching: "Matching",
  battleship: "Battleship",
  questions: "Question Builder",
  reading: "Reading",
  "sentence-scramble": "Sentence Scramble",
  "tic-tac-toe": "Tic-Tac-Toe",
  wordsearch: "Wordsearch",
  writing: "Writing",
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function periodValue(value: string) {
  if (value === "all") return null;
  if (value === "7") return 7;
  if (value === "90") return 90;
  return 30;
}

function displayLabel(item: AdminAnalyticsRankedItem, kind: string) {
  if (kind === "games") return GAME_LABELS[item.key] ?? item.label.replaceAll("-", " ");
  if (kind === "worksheets") return WORKSHEET_LABELS[item.key] ?? item.label.replaceAll("-", " ");
  return item.label;
}

function RankedList({
  title,
  description,
  items,
  kind,
  empty,
}: {
  title: string;
  description: string;
  items: AdminAnalyticsRankedItem[];
  kind: "searches" | "flashcards" | "games" | "worksheets" | "community" | "attribution";
  empty: string;
}) {
  const maximum = Math.max(1, ...items.map((item) => item.count));
  return (
    <article className="rounded-2xl border border-[#dfe4dc] bg-white p-5 shadow-[0_10px_28px_rgba(52,65,48,0.04)]">
      <h2 className="font-semibold text-[#394439]">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-[#7a8379]">{description}</p>
      {items.length ? (
        <ol className="mt-5 space-y-4">
          {items.map((item, index) => (
            <li key={`${kind}-${item.key}`}>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-semibold capitalize text-[#435043]">
                  <span className="mr-2 text-xs text-[#959c94]">{index + 1}</span>
                  {displayLabel(item, kind)}
                </span>
                <span className="shrink-0 tabular-nums text-[#687268]">{item.count.toLocaleString()}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf0ea]">
                <div className="h-full rounded-full bg-[#78966a]" style={{ width: `${Math.max(4, (item.count / maximum) * 100)}%` }} />
              </div>
              {kind === "worksheets" && (
                <p className="mt-1 text-[0.68rem] text-[#8a9189]">
                  {item.generatedCount} previews · {item.savedCount} saved
                </p>
              )}
              {kind === "community" && (
                <p className="mt-1 text-[0.68rem] text-[#8a9189]">
                  {item.downloads} copies · {item.uses} recorded uses
                </p>
              )}
              {kind === "attribution" && item.category && (
                <p className="mt-1 text-[0.68rem] text-[#8a9189]">{item.category}</p>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-6 rounded-xl bg-[#f6f7f4] px-4 py-6 text-center text-sm text-[#7b8479]">{empty}</p>
      )}
    </article>
  );
}

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const period = first(raw.period) || "30";
  const periodDays = periodValue(period);
  await requireAdmin();
  const analytics = await getAdminAnalyticsSnapshot(periodDays);
  const periodLabel = periodDays ? `Last ${periodDays} days` : "All time";
  const summaryCards = [
    { label: "Vocabulary searches", value: analytics.summary.vocabularySearches, icon: Search },
    { label: "Flashcard views", value: analytics.summary.flashcardViews, icon: Eye },
    { label: "Game plays", value: analytics.summary.gamePlays, icon: Gamepad2 },
    { label: "Worksheet activity", value: analytics.summary.worksheetGenerations + analytics.summary.worksheetSaves, icon: FileText },
    { label: "Premium upgrades", value: analytics.summary.premiumUpgrades, icon: Crown },
    { label: "New users", value: analytics.summary.newUsers, icon: UserPlus },
    { label: "Lesson-pack views", value: analytics.summary.lessonPackViews, icon: Eye },
    { label: "PDF downloads", value: analytics.summary.lessonPackDownloads, icon: FileText },
    { label: "Guest flashcard starts", value: analytics.summary.guestFlashcardsOpened, icon: Search },
    { label: "Guest Classroom starts", value: analytics.summary.guestClassroomOpens, icon: Activity },
  ];
  const recentTrends = analytics.trends.slice(-14);
  const trendMaximum = Math.max(
    1,
    ...recentTrends.map((item) => item.events + item.gamePlays + item.newUsers),
  );

  return (
    <section className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
      <AdminAnalyticsAutoRefresh />
      <div className="flex flex-col justify-between gap-5 border-b border-[#dfe4dc] pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#718d63]">Platform signals</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#2f3a2f] sm:text-4xl">Analytics</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e786d]">
            Lightweight first-party usage data for content discovery, classroom tools,
            Community resources, registrations, and Premium growth.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[#dfe4dc] bg-white px-4 py-3 text-sm text-[#697267]">
          <Activity aria-hidden="true" className="h-4 w-4 text-[#68805d]" />
          <strong className="text-[#354035]">{analytics.summary.trackedEvents.toLocaleString()}</strong>
          first-party events · updates every 30 seconds
        </div>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Analytics period">
        {[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }, { value: "all", label: "All time" }].map((item) => (
          <Link key={item.value} href={`/admin/analytics?period=${item.value}`} className={`rounded-xl px-4 py-2 text-sm font-semibold ${period === item.value ? "bg-[#5f7d50] text-white" : "border border-[#d9dfd5] bg-white text-[#647064] hover:bg-[#f4f7f1]"}`}>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map(({ label, value, icon: Icon }) => (
          <article key={label} className="rounded-2xl border border-[#dfe4dc] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#7b8579]">{label}</p>
              <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#78906d]" />
            </div>
            <p className="mt-3 text-2xl font-semibold text-[#344034]">{value.toLocaleString()}</p>
            <p className="mt-1 text-[0.68rem] text-[#8a9288]">{periodLabel}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <RankedList title="Most searched vocabulary" description="Explicit flashcard search terms; short-term repeat submissions are deduplicated." items={analytics.searchTerms} kind="searches" empty="No vocabulary searches recorded for this period." />
        <RankedList title="Most viewed flashcards" description="Flashcards teachers selected from the result grid." items={analytics.flashcards} kind="flashcards" empty="No flashcard engagement recorded for this period." />
        <RankedList title="Most played games" description="Game starts captured by the existing Classendo game tracker." items={analytics.games} kind="games" empty="No game starts recorded for this period." />
        <RankedList title="Most generated worksheets" description="Worksheet previews plus saved worksheet records from the selected period." items={analytics.worksheets} kind="worksheets" empty="No worksheet activity recorded for this period." />
        <RankedList title="Most popular free lesson packs" description="Pack-page views and PDF downloads in the selected period." items={analytics.lessonPacks} kind="flashcards" empty="No lesson-pack activity recorded for this period." />
        <RankedList title="Signup acquisition sources" description="First-touch UTM source or referring website for accounts created after attribution tracking was enabled." items={analytics.signupSources} kind="attribution" empty="No consented signup attribution has been recorded for this period yet." />
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <article className="rounded-2xl border border-[#dfe4dc] bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div><h2 className="font-semibold text-[#394439]">Recent activity trend</h2><p className="mt-1 text-xs text-[#7a8379]">Last {recentTrends.length} days of tracked events, game plays, and registrations.</p></div>
            <BarChart3 aria-hidden="true" className="h-5 w-5 text-[#78906d]" />
          </div>
          <div className="mt-6 flex h-48 items-end gap-1.5" aria-label="Daily activity bars">
            {recentTrends.map((item) => {
              const total = item.events + item.gamePlays + item.newUsers;
              const parsedDate = new Date(`${item.date}T00:00:00Z`);
              return (
                <div key={item.date} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                  <div title={`${item.date}: ${total} activities`} className="w-full rounded-t-md bg-[#87a578] transition hover:bg-[#658457]" style={{ height: `${Math.max(total ? 8 : 2, (total / trendMaximum) * 150)}px` }} />
                  <span className="hidden text-[0.58rem] text-[#8a9288] sm:block">{Number.isNaN(parsedDate.getTime()) ? "—" : dateFormatter.format(parsedDate)}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-[#758075]"><span>Events: {recentTrends.reduce((sum, item) => sum + item.events, 0)}</span><span>Games: {recentTrends.reduce((sum, item) => sum + item.gamePlays, 0)}</span><span>New users: {recentTrends.reduce((sum, item) => sum + item.newUsers, 0)}</span></div>
        </article>

        <RankedList title="Most used Community sets" description={`All-time copy and use counters (${analytics.summary.communityUses.toLocaleString()} total).`} items={analytics.communitySets} kind="community" empty="No public Community set usage has been recorded." />
      </div>

      <div className="mt-5 rounded-2xl border border-[#dfe4dc] bg-[#f9faf7] p-4 text-xs leading-5 text-[#747e73]">
        Analytics intentionally stores only event type, short vocabulary/resource labels,
        broad category, pseudonymous session key, optional account ID, and timestamp.
        Guest starts are events with no signed-in account. Browser Do Not Track is respected. Community counters are all-time because the
        existing schema stores totals rather than individual copy events.
      </div>
    </section>
  );
}
