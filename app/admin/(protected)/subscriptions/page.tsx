import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Search,
} from "lucide-react";
import Link from "next/link";

import { AdminSubscriptionReconcileButton } from "@/components/admin/AdminSubscriptionReconcileButton";
import { requireAdmin } from "@/lib/admin/auth";
import {
  ADMIN_SUBSCRIPTIONS_PAGE_SIZE,
  getAdminSubscriptions,
  type AdminSubscription,
} from "@/lib/admin/subscriptions";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
});

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function positiveInteger(value: string, fallback = 1) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : dateFormatter.format(date);
}

function displayName(subscription: AdminSubscription) {
  return (
    subscription.username
    || subscription.displayName
    || subscription.email
    || "Unnamed user"
  );
}

function badgeClass(value: string) {
  if (value === "active" || value === "trialing" || value === "synced") {
    return "bg-[#e7f1df] text-[#4e6d42]";
  }
  if (value === "past_due" || value === "unpaid" || value === "drift") {
    return "bg-[#f7e8e1] text-[#9a5845]";
  }
  if (value === "canceling" || value === "unavailable") {
    return "bg-[#f4edde] text-[#80673e]";
  }
  return "bg-[#eef0eb] text-[#687067]";
}

function pageHref(params: {
  query: string;
  status: string;
  interval: string;
  page: number;
}) {
  const search = new URLSearchParams();
  if (params.query) search.set("q", params.query);
  if (params.status !== "all") search.set("status", params.status);
  if (params.interval !== "all") search.set("interval", params.interval);
  if (params.page > 1) search.set("page", String(params.page));
  const suffix = search.toString();
  return suffix ? `/admin/subscriptions?${suffix}` : "/admin/subscriptions";
}

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query = first(raw.q).trim();
  const status = first(raw.status) || "all";
  const interval = first(raw.interval) || "all";
  const requestedPage = positiveInteger(first(raw.page), 1);
  const admin = await requireAdmin();
  const result = await getAdminSubscriptions({
    query,
    status,
    interval,
    page: requestedPage,
  });
  const totalPages = Math.max(
    1,
    Math.ceil(result.total / ADMIN_SUBSCRIPTIONS_PAGE_SIZE),
  );
  const page = Math.min(requestedPage, totalPages);
  const canManage = admin.role === "owner";
  const mfaVerified = admin.assuranceLevel === "aal2";
  const summary = [
    { label: "Matching records", value: result.total },
    { label: "Active", value: result.summary.active },
    { label: "Trialing", value: result.summary.trialing },
    { label: "Past due", value: result.summary.pastDue },
    { label: "Canceling", value: result.summary.canceling },
  ];

  return (
    <section className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
      <div className="flex flex-col justify-between gap-5 border-b border-[#dfe4dc] pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#718d63]">
            Billing operations
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#2f3a2f] sm:text-4xl">
            Subscriptions
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e786d]">
            Review billing state, renewal dates, and Stripe records. Stripe
            remains the source of truth for all paid subscription changes.
          </p>
        </div>
        <a
          href="https://dashboard.stripe.com/subscriptions"
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-[#d8dfd4] bg-white px-4 py-2.5 text-sm font-semibold text-[#52684a] transition hover:bg-[#f5f8f2]"
        >
          Open Stripe
          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
        </a>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {summary.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-[#dfe4dc] bg-white p-4 shadow-[0_10px_28px_rgba(52,65,48,0.04)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b8579]">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-[#344034]">
              {item.value}
            </p>
          </article>
        ))}
      </div>

      <form
        action="/admin/subscriptions"
        className="mt-5 grid gap-3 rounded-2xl border border-[#dfe4dc] bg-white p-4 shadow-[0_10px_28px_rgba(52,65,48,0.04)] md:grid-cols-[minmax(14rem,1fr)_minmax(10rem,auto)_minmax(10rem,auto)_auto]"
      >
        <label className="relative">
          <span className="sr-only">Search subscriptions</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9288]"
          />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Email, username, or Stripe ID"
            className="w-full rounded-xl border border-[#d9dfd5] bg-[#fbfcfa] py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[#88a879] focus:ring-4 focus:ring-[#edf3e9]"
          />
        </label>

        <label>
          <span className="sr-only">Filter by subscription status</span>
          <select
            name="status"
            defaultValue={status}
            className="w-full rounded-xl border border-[#d9dfd5] bg-[#fbfcfa] px-3 py-2.5 text-sm outline-none focus:border-[#88a879]"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past due</option>
            <option value="canceled">Canceled</option>
            <option value="unpaid">Unpaid</option>
            <option value="no_subscription">No subscription</option>
          </select>
        </label>

        <label>
          <span className="sr-only">Filter by billing interval</span>
          <select
            name="interval"
            defaultValue={interval}
            className="w-full rounded-xl border border-[#d9dfd5] bg-[#fbfcfa] px-3 py-2.5 text-sm outline-none focus:border-[#88a879]"
          >
            <option value="all">All intervals</option>
            <option value="month">Monthly</option>
            <option value="year">Yearly</option>
            <option value="unclassified">Unclassified</option>
          </select>
        </label>

        <button type="submit" className="btn btn-primary px-5 py-2.5 text-sm">
          Apply
        </button>
      </form>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#dfe4dc] bg-white shadow-[0_10px_28px_rgba(52,65,48,0.04)]">
        {result.subscriptions.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[72rem] border-collapse text-left">
              <thead className="bg-[#f5f7f2] text-xs font-bold uppercase tracking-[0.12em] text-[#778075]">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-4 py-3.5">Plan</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Renewal</th>
                  <th className="px-4 py-3.5">Stripe records</th>
                  <th className="px-4 py-3.5">Sync</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0ea]">
                {result.subscriptions.map((subscription) => {
                  const visibleStatus = subscription.cancelAtPeriodEnd
                    ? "canceling"
                    : subscription.status;
                  return (
                    <tr
                      key={subscription.userId}
                      className="transition hover:bg-[#fbfcfa]"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/users/${subscription.userId}`}
                          className="block max-w-56"
                        >
                          <span className="block truncate text-sm font-semibold text-[#364136] hover:underline">
                            {displayName(subscription)}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-[#818981]">
                            {subscription.email ?? "No email"}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-semibold capitalize text-[#4f5b4e]">
                          {subscription.subscriptionTier}
                        </p>
                        <p className="mt-0.5 text-xs capitalize text-[#818981]">
                          {subscription.billingInterval
                            ? `${subscription.billingInterval}ly`
                            : "Unclassified"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badgeClass(visibleStatus)}`}>
                          {visibleStatus.replaceAll("_", " ")}
                        </span>
                        <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#8a9188]">
                          {subscription.stripeLivemode === null
                            ? "Mode unknown"
                            : subscription.stripeLivemode
                              ? "Live"
                              : "Test"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-[#667066]">
                        {formatDate(subscription.currentPeriodEnd)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col items-start gap-1.5 text-xs font-semibold">
                          {subscription.stripeCustomerUrl ? (
                            <a
                              href={subscription.stripeCustomerUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[#58754c] hover:underline"
                            >
                              Customer
                              <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-[#8a9188]">No customer link</span>
                          )}
                          {subscription.stripeSubscriptionUrl && (
                            <a
                              href={subscription.stripeSubscriptionUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[#58754c] hover:underline"
                            >
                              Subscription
                              <ArrowUpRight aria-hidden="true" className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badgeClass(subscription.syncState)}`}>
                          {subscription.syncState.replaceAll("_", " ")}
                        </span>
                        <p className="mt-2 text-xs text-[#818981]">
                          {subscription.lastSyncedAt
                            ? formatDate(subscription.lastSyncedAt)
                            : "Never synced"}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {subscription.stripeSubscriptionId ? (
                          <AdminSubscriptionReconcileButton
                            userId={subscription.userId}
                            canManage={canManage}
                            mfaVerified={mfaVerified}
                          />
                        ) : (
                          <span className="text-xs text-[#8a9188]">
                            No paid subscription
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center px-6 text-center">
            <div>
              <CreditCard
                aria-hidden="true"
                className="mx-auto h-9 w-9 text-[#8e988b]"
              />
              <h2 className="mt-4 text-lg font-semibold text-[#3c473c]">
                No subscriptions match these filters
              </h2>
              <p className="mt-2 text-sm text-[#747d73]">
                Clear the search or broaden the selected filters.
              </p>
              <Link
                href="/admin/subscriptions"
                className="mt-4 inline-block text-sm font-semibold text-[#58754c] underline underline-offset-4"
              >
                Reset filters
              </Link>
            </div>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Subscription directory pages"
          className="mt-5 flex items-center justify-between gap-4"
        >
          <Link
            href={pageHref({
              query,
              status,
              interval,
              page: Math.max(1, page - 1),
            })}
            aria-disabled={page <= 1}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${
              page <= 1
                ? "pointer-events-none border-[#e5e8e2] text-[#a8aea6]"
                : "border-[#d7ddd3] bg-white text-[#52684a]"
            }`}
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            Previous
          </Link>
          <p className="text-sm text-[#727b71]">
            Page <strong className="text-[#3e493d]">{page}</strong> of{" "}
            <strong className="text-[#3e493d]">{totalPages}</strong>
          </p>
          <Link
            href={pageHref({
              query,
              status,
              interval,
              page: Math.min(totalPages, page + 1),
            })}
            aria-disabled={page >= totalPages}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${
              page >= totalPages
                ? "pointer-events-none border-[#e5e8e2] text-[#a8aea6]"
                : "border-[#d7ddd3] bg-white text-[#52684a]"
            }`}
          >
            Next
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </nav>
      )}

      <p className="mt-6 text-xs leading-5 text-[#80887e]">
        Paid billing changes are intentionally completed in Stripe. The sync
        action only imports Stripe&apos;s current state into Classendo and is
        restricted to an owner with a verified MFA session.
      </p>
    </section>
  );
}
