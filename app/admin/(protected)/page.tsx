import {
  BookOpen,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  CreditCard,
  FileStack,
  ImageIcon,
  Images,
  Layers3,
  MessageSquareText,
  ShieldAlert,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

import {
  getAdminDashboardSnapshot,
  type AdminDashboardSnapshot,
} from "@/lib/admin/dashboard";

const numberFormatter = new Intl.NumberFormat("en-US");
const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

type Icon = typeof Users;

function formatCount(value: number | null) {
  return value === null ? "Not configured" : numberFormatter.format(value);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown time" : dateFormatter.format(date);
}

function MetricCard({
  label,
  value,
  detail,
  icon: IconComponent,
  unavailable = false,
}: {
  label: string;
  value: string;
  detail: string;
  icon: Icon;
  unavailable?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-[#dfe4dc] bg-white p-5 shadow-[0_10px_28px_rgba(52,65,48,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#667064]">{label}</p>
          <p className={`mt-3 font-semibold tracking-tight text-[#2f3a2f] ${
            unavailable ? "text-xl" : "text-3xl"
          }`}>
            {value}
          </p>
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
          unavailable
            ? "bg-[#f2f1ed] text-[#8b8b83]"
            : "bg-[#edf4e8] text-[#5d7b50]"
        }`}>
          <IconComponent aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#858c83]">{detail}</p>
    </article>
  );
}

function SectionHeading({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="mb-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#718d63]">
        {eyebrow}
      </p>
      <div className="mt-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <h2 className="text-2xl font-semibold tracking-tight text-[#303b30]">{title}</h2>
        <p className="max-w-xl text-sm leading-6 text-[#747d72]">{detail}</p>
      </div>
    </div>
  );
}

function EmptyActivity({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-32 place-items-center rounded-xl border border-dashed border-[#dce1d8] bg-[#fafbf8] px-5 text-center text-sm leading-6 text-[#7b8379]">
      {children}
    </div>
  );
}

function ActivityPanel({
  title,
  icon: IconComponent,
  children,
}: {
  title: string;
  icon: Icon;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-2xl border border-[#dfe4dc] bg-white p-5 shadow-[0_10px_28px_rgba(52,65,48,0.05)]">
      <h3 className="flex items-center gap-2 text-base font-semibold text-[#354135]">
        <IconComponent aria-hidden="true" className="h-4 w-4 text-[#648057]" />
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function ActivityList({
  items,
}: {
  items: Array<{
    id: string;
    title: string;
    detail: string;
    occurredAt: string;
  }>;
}) {
  return (
    <ol className="divide-y divide-[#edf0ea]">
      {items.map((item) => (
        <li key={item.id} className="py-3 first:pt-0 last:pb-0">
          <p className="truncate text-sm font-semibold text-[#3d483d]">{item.title}</p>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-[#81897f]">
            <span>{item.detail}</span>
            <time dateTime={item.occurredAt}>{formatDate(item.occurredAt)}</time>
          </div>
        </li>
      ))}
    </ol>
  );
}

function activityGroups(snapshot: AdminDashboardSnapshot) {
  return {
    registrations: snapshot.recent.registrations.map((item) => ({
      id: item.id,
      title: item.email ?? "Email unavailable",
      detail: "New account",
      occurredAt: item.createdAt,
    })),
    subscriptions: snapshot.recent.subscriptions.map((item) => ({
      id: item.id,
      title: item.email ?? "Email unavailable",
      detail: [item.tier, item.status].filter(Boolean).join(" · ") || "Subscription updated",
      occurredAt: item.occurredAt,
    })),
    publicContent: snapshot.recent.publicContent.map((item) => ({
      id: item.id,
      title: item.name,
      detail: "Public lesson set",
      occurredAt: item.createdAt,
    })),
    adminActivity: snapshot.recent.adminActivity.map((item) => ({
      id: item.id,
      title: item.action.replace(/[._]/g, " "),
      detail: item.targetId
        ? `${item.targetType.replaceAll("_", " ")} · ${item.targetId.slice(0, 8)}`
        : item.targetType.replaceAll("_", " "),
      occurredAt: item.createdAt,
    })),
    rejectedSignups: snapshot.recent.rejectedSignups.map((item) => ({
      id: item.id,
      title: item.domain,
      detail: item.reason.replaceAll("_", " "),
      occurredAt: item.createdAt,
    })),
  };
}

export default async function AdminDashboardPage() {
  const snapshot = await getAdminDashboardSnapshot();
  const activity = activityGroups(snapshot);

  return (
    <section className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
      <div className="flex flex-col justify-between gap-5 border-b border-[#dfe4dc] pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#718d63]">
            Platform overview
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#2f3a2f] sm:text-4xl">
            Administrator dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e786d]">
            A live operational view of Classendo accounts, premium access,
            learning content, Creator uploads, and moderation readiness.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#7c857a]">
          <Clock3 aria-hidden="true" className="h-4 w-4" />
          <span>
            Updated{" "}
            <time dateTime={snapshot.generatedAt}>{formatDate(snapshot.generatedAt)}</time>
          </span>
        </div>
      </div>

      <div className="mt-9 space-y-11">
        <section aria-labelledby="users-heading">
          <div id="users-heading">
            <SectionHeading
              eyebrow="Accounts"
              title="Users"
              detail="Premium reflects accounts with active platform access, including trialing and past-due grace access."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total users" value={formatCount(snapshot.users.total)} detail="Supabase Auth accounts" icon={Users} />
            <MetricCard label="Free users" value={formatCount(snapshot.users.free)} detail="Accounts without premium access" icon={UserPlus} />
            <MetricCard label="Premium users" value={formatCount(snapshot.users.premium)} detail="Active, trialing, or grace access" icon={Sparkles} />
            <MetricCard label="New users" value={formatCount(snapshot.users.new30d)} detail="Registered in the last 30 days" icon={CalendarDays} />
          </div>
        </section>

        <section aria-labelledby="subscriptions-heading">
          <div id="subscriptions-heading">
            <SectionHeading
              eyebrow="Revenue access"
              title="Subscriptions"
              detail="Counts come from the Stripe-synchronized Supabase subscription records."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Active premium" value={formatCount(snapshot.subscriptions.activePremium)} detail="Active or trialing subscriptions" icon={CircleDollarSign} />
            <MetricCard label="Monthly" value={formatCount(snapshot.subscriptions.monthly)} detail="Verified monthly billing interval" icon={CreditCard} />
            <MetricCard label="Yearly" value={formatCount(snapshot.subscriptions.yearly)} detail="Verified yearly billing interval" icon={CalendarDays} />
            <MetricCard label="Other price" value={formatCount(snapshot.subscriptions.unclassified)} detail="Billing interval could not be classified" icon={ShieldAlert} />
          </div>
        </section>

        <section aria-labelledby="content-heading">
          <div id="content-heading">
            <SectionHeading
              eyebrow="Learning library"
              title="Content"
              detail="Public community sets are a subset of all lesson sets, so they are not double-counted as a separate content type."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Lesson sets" value={formatCount(snapshot.content.lessonSets)} detail="All saved flashcard lesson sets" icon={FileStack} />
            <MetricCard label="Cards" value={formatCount(snapshot.content.cards)} detail="Cards attached to lesson sets" icon={Layers3} />
            <MetricCard label="Public sets" value={formatCount(snapshot.content.publicSets)} detail="Visible on the Community page" icon={BookOpen} />
            <MetricCard label="Creator uploads" value={formatCount(snapshot.content.creatorImages)} detail="Ready, non-deleted user images" icon={ImageIcon} unavailable={snapshot.content.creatorImages === null} />
            <MetricCard label="Creator uploaders" value={formatCount(snapshot.content.creatorUploaders)} detail="Users with at least one ready image" icon={Images} unavailable={snapshot.content.creatorUploaders === null} />
          </div>
        </section>

        <section aria-labelledby="platform-heading">
          <div id="platform-heading">
            <SectionHeading
              eyebrow="Moderation readiness"
              title="Platform queues"
              detail="Missing queue systems are identified explicitly instead of being reported as zero."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              label="Feedback pending"
              value={formatCount(snapshot.platform.feedbackPending)}
              detail={snapshot.platform.feedbackConfigured ? "Items awaiting review" : "Feedback storage will be added in its dedicated phase"}
              icon={MessageSquareText}
              unavailable={!snapshot.platform.feedbackConfigured}
            />
            <MetricCard
              label="Reports pending"
              value={formatCount(snapshot.platform.reportsPending)}
              detail={snapshot.platform.reportsConfigured ? "Community reports awaiting review" : "Moderation reports will be added in the community phase"}
              icon={ShieldAlert}
              unavailable={!snapshot.platform.reportsConfigured}
            />
            <MetricCard
              label="Rejected signups"
              value={formatCount(snapshot.platform.rejectedSignups24h)}
              detail="Disposable-email attempts in the last 24 hours"
              icon={ShieldAlert}
            />
          </div>
        </section>

        <section aria-labelledby="activity-heading">
          <div id="activity-heading">
            <SectionHeading
              eyebrow="Latest changes"
              title="Recent activity"
              detail="The newest account, subscription, public-content, and privileged events."
            />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <ActivityPanel title="Registrations" icon={UserPlus}>
              {activity.registrations.length ? (
                <ActivityList items={activity.registrations} />
              ) : (
                <EmptyActivity>No registrations have been recorded.</EmptyActivity>
              )}
            </ActivityPanel>
            <ActivityPanel title="Subscription updates" icon={CreditCard}>
              {activity.subscriptions.length ? (
                <ActivityList items={activity.subscriptions} />
              ) : (
                <EmptyActivity>No premium subscription activity yet.</EmptyActivity>
              )}
            </ActivityPanel>
            <ActivityPanel title="Public content" icon={BookOpen}>
              {activity.publicContent.length ? (
                <ActivityList items={activity.publicContent} />
              ) : (
                <EmptyActivity>No lesson sets are currently public.</EmptyActivity>
              )}
            </ActivityPanel>
            <ActivityPanel title="Administrator activity" icon={ShieldAlert}>
              {activity.adminActivity.length ? (
                <ActivityList items={activity.adminActivity} />
              ) : (
                <EmptyActivity>No privileged actions have been recorded.</EmptyActivity>
              )}
            </ActivityPanel>
            <ActivityPanel title="Blocked signups" icon={ShieldAlert}>
              {activity.rejectedSignups.length ? (
                <ActivityList items={activity.rejectedSignups} />
              ) : (
                <EmptyActivity>No disposable-email signups have been blocked.</EmptyActivity>
              )}
            </ActivityPanel>
          </div>
        </section>
      </div>
    </section>
  );
}
