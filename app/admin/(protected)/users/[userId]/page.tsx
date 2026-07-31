import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CreditCard,
  FileText,
  ImageIcon,
  KeyRound,
  Mail,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminUserActions } from "@/components/admin/AdminUserActions";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminUserDetail } from "@/lib/admin/users";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : dateFormatter.format(date);
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isFuture(value: string | null) {
  return Boolean(value && new Date(value).getTime() > Date.now());
}

function DetailRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon: typeof Mail;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-[#edf0ea] py-3 last:border-0">
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#77906b]" />
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#889086]">
          {label}
        </dt>
        <dd className="mt-1 break-words text-sm text-[#3f4a3f]">{value}</dd>
      </div>
    </div>
  );
}

function badgeClass(value: string) {
  if (value === "premium" || value === "active" || value === "trialing") {
    return "bg-[#e7f1df] text-[#4e6d42]";
  }
  if (value === "suspended" || value === "past_due") {
    return "bg-[#f7e8e1] text-[#9a5845]";
  }
  if (value === "owner" || value === "admin" || value === "moderator") {
    return "bg-[#eee8f7] text-[#6c5687]";
  }
  return "bg-[#eef0eb] text-[#687067]";
}

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const [{ userId }, administrator] = await Promise.all([
    params,
    requireAdmin(),
  ]);
  const user = await getAdminUserDetail(userId);
  if (!user) notFound();

  const suspended = isFuture(user.bannedUntil);
  const protectedAccount = user.role !== "user";

  return (
    <section className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#62745b] hover:text-[#42543d]"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Back to users
      </Link>

      <div className="mt-6 flex flex-col justify-between gap-5 border-b border-[#dfe4dc] pb-7 sm:flex-row sm:items-end">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#e7efe2] text-lg font-bold text-[#58724d]">
            {(user.username || user.displayName || user.email || "U").slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#718d63]">
              User account
            </p>
            <h1 className="mt-1 truncate text-3xl font-semibold tracking-tight text-[#2f3a2f]">
              {user.username || user.displayName || user.email || "Unnamed user"}
            </h1>
            <p className="mt-1 truncate text-sm text-[#747d73]">
              {user.email ?? "No email address"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${badgeClass(user.role)}`}>
            {user.role}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${badgeClass(user.tier)}`}>
            {user.tier}
          </span>
          {suspended && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass("suspended")}`}>
              Suspended
            </span>
          )}
        </div>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Lesson sets", value: user.counts.lessonSets, icon: BookOpen },
              { label: "Public sets", value: user.counts.publicSets, icon: ShieldCheck },
              { label: "Worksheets", value: user.counts.worksheets, icon: FileText },
              { label: "Creator images", value: user.counts.creatorImages, icon: ImageIcon },
            ].map((metric) => (
              <article key={metric.label} className="rounded-2xl border border-[#dfe4dc] bg-white p-5 shadow-[0_8px_24px_rgba(52,65,48,0.04)]">
                <metric.icon aria-hidden="true" className="h-5 w-5 text-[#668159]" />
                <p className="mt-4 text-2xl font-semibold text-[#344034]">{metric.value}</p>
                <p className="mt-1 text-xs font-semibold text-[#7c857a]">{metric.label}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-[#dfe4dc] bg-white p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[#394439]">
                <UserRound aria-hidden="true" className="h-5 w-5 text-[#67815b]" />
                Account information
              </h2>
              <dl className="mt-4">
                <DetailRow label="Email" value={user.email ?? "Not available"} icon={Mail} />
                <DetailRow label="Username" value={user.username ?? "Not set"} icon={UserRound} />
                <DetailRow label="Display name" value={user.displayName ?? "Not set"} icon={UserRound} />
                <DetailRow label="Region" value={user.countryRegion ?? "Not set"} icon={MapPin} />
                <DetailRow label="Joined" value={formatDate(user.createdAt)} icon={CalendarDays} />
                <DetailRow label="Last sign-in" value={formatDate(user.lastSignInAt)} icon={KeyRound} />
              </dl>
            </article>

            <article className="rounded-2xl border border-[#dfe4dc] bg-white p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-[#394439]">
                <CreditCard aria-hidden="true" className="h-5 w-5 text-[#67815b]" />
                Subscription information
              </h2>
              <dl className="mt-4">
                <DetailRow
                  label="Effective access"
                  value={user.effectivePremium ? "Premium" : "Free"}
                  icon={ShieldCheck}
                />
                <DetailRow
                  label="Access source"
                  value={
                    user.hasStripePremium
                      ? "Stripe subscription"
                      : user.hasComplimentaryPremium
                        ? "Complimentary administrator grant"
                        : "Free account"
                  }
                  icon={CreditCard}
                />
                <DetailRow
                  label="Subscription status"
                  value={user.subscription?.status?.replaceAll("_", " ") ?? "None"}
                  icon={CreditCard}
                />
                <DetailRow
                  label="Renews / ends"
                  value={formatDate(user.subscription?.currentPeriodEnd ?? null)}
                  icon={CalendarDays}
                />
                <DetailRow
                  label="Complimentary expiry"
                  value={formatDate(user.complimentaryAccess?.expiresAt ?? null)}
                  icon={CalendarDays}
                />
                <DetailRow
                  label="Stripe customer"
                  value={user.subscription?.stripeCustomerId ?? "Not linked"}
                  icon={KeyRound}
                />
              </dl>
            </article>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <ContentList
              title="Saved lesson sets"
              empty="No lesson sets saved."
              items={user.lessonSets.map((item) => ({
                id: item.id,
                title: item.name,
                detail: item.isPublic ? "Public" : "Private",
                date: item.createdAt,
              }))}
            />
            <ContentList
              title="Saved worksheets"
              empty="No worksheets saved."
              items={user.worksheets.map((item) => ({
                id: item.id,
                title: item.name,
                detail: item.worksheetType || (item.isPublic ? "Public" : "Private"),
                date: item.createdAt,
              }))}
            />
            <ContentList
              title="Creator uploads"
              empty="No Creator images uploaded."
              items={user.creatorImages.map((item) => ({
                id: item.id,
                title: item.originalFilename,
                detail: `${item.status} · ${formatBytes(item.sizeBytes)}`,
                date: item.createdAt,
              }))}
            />
          </div>
        </div>

        <aside>
          <div className="sticky top-5 rounded-2xl border border-[#dfe4dc] bg-[#fbfcfa] p-5">
            <h2 className="text-lg font-semibold text-[#394439]">Owner actions</h2>
            <p className="mt-1 text-sm leading-6 text-[#727b71]">
              Every change requires MFA and a reason, and is written to the
              administrator audit log.
            </p>
            <div className="mt-5">
              <AdminUserActions
                userId={user.id}
                email={user.email}
                isSuspended={suspended}
                protectedAccount={protectedAccount}
                hasStripePremium={user.hasStripePremium}
                hasComplimentaryPremium={user.hasComplimentaryPremium}
                canManage={administrator.role === "owner"}
                mfaVerified={administrator.assuranceLevel === "aal2"}
              />
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ContentList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ id: string; title: string; detail: string; date: string }>;
}) {
  return (
    <article className="rounded-2xl border border-[#dfe4dc] bg-white p-5">
      <h2 className="text-base font-semibold text-[#394439]">{title}</h2>
      {items.length ? (
        <ol className="mt-4 divide-y divide-[#edf0ea]">
          {items.map((item) => (
            <li key={item.id} className="py-3 first:pt-0 last:pb-0">
              <p className="truncate text-sm font-semibold text-[#465146]">{item.title}</p>
              <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-[#818981]">
                <span className="capitalize">{item.detail}</span>
                <time dateTime={item.date}>{formatDate(item.date)}</time>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-[#dde2da] bg-[#fafbf8] px-4 py-8 text-center text-sm text-[#7b8379]">
          {empty}
        </p>
      )}
    </article>
  );
}
