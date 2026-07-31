import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  MessageSquareText,
  Search,
} from "lucide-react";
import Link from "next/link";

import { requireAdmin } from "@/lib/admin/auth";
import {
  ADMIN_FEEDBACK_PAGE_SIZE,
  getAdminFeedback,
  type AdminFeedbackListItem,
} from "@/lib/admin/feedback";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function positiveInteger(value: string, fallback = 1) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : dateFormatter.format(date);
}

function displayName(item: AdminFeedbackListItem) {
  return item.username || item.displayName || item.email || "Deleted user";
}

function badgeClass(value: string) {
  if (value === "pending") return "bg-[#f4edde] text-[#80673e]";
  if (value === "read") return "bg-[#e7edf7] text-[#506988]";
  if (value === "resolved") return "bg-[#e7f1df] text-[#4e6d42]";
  if (value === "deleted") return "bg-[#f2e5e2] text-[#8a554b]";
  if (value === "bug" || value === "billing") {
    return "bg-[#f7e8e1] text-[#925c49]";
  }
  return "bg-[#eef0eb] text-[#687067]";
}

function excerpt(value: string) {
  return value.length > 130 ? `${value.slice(0, 127)}…` : value;
}

function pageHref(params: {
  query: string;
  status: string;
  category: string;
  page: number;
}) {
  const search = new URLSearchParams();
  if (params.query) search.set("q", params.query);
  if (params.status !== "all") search.set("status", params.status);
  if (params.category !== "all") search.set("category", params.category);
  if (params.page > 1) search.set("page", String(params.page));
  const suffix = search.toString();
  return suffix ? `/admin/feedback?${suffix}` : "/admin/feedback";
}

export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query = first(raw.q).trim();
  const status = first(raw.status) || "all";
  const category = first(raw.category) || "all";
  const requestedPage = positiveInteger(first(raw.page), 1);
  await requireAdmin();
  const result = await getAdminFeedback({
    query,
    status,
    category,
    page: requestedPage,
  });
  const totalPages = Math.max(
    1,
    Math.ceil(result.total / ADMIN_FEEDBACK_PAGE_SIZE),
  );
  const page = Math.min(requestedPage, totalPages);
  const summary = [
    { label: "Matching feedback", value: result.total },
    { label: "Pending", value: result.summary.pending },
    { label: "Read", value: result.summary.read },
    { label: "Resolved", value: result.summary.resolved },
    { label: "Deleted", value: result.summary.deleted },
  ];

  return (
    <section className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
      <div className="flex flex-col justify-between gap-5 border-b border-[#dfe4dc] pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#718d63]">
            User insight
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#2f3a2f] sm:text-4xl">
            Feedback
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e786d]">
            Review suggestions and problems sent by signed-in Classendo users,
            then track each item through resolution.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[#dfe4dc] bg-white px-4 py-3 text-sm text-[#697267]">
          <Inbox aria-hidden="true" className="h-4 w-4 text-[#68805d]" />
          <strong className="text-[#354035]">{result.summary.pending}</strong>
          awaiting review
        </div>
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
        action="/admin/feedback"
        className="mt-5 grid gap-3 rounded-2xl border border-[#dfe4dc] bg-white p-4 shadow-[0_10px_28px_rgba(52,65,48,0.04)] md:grid-cols-[minmax(14rem,1fr)_minmax(10rem,auto)_minmax(11rem,auto)_auto]"
      >
        <label className="relative">
          <span className="sr-only">Search feedback</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9288]"
          />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="User or message"
            className="w-full rounded-xl border border-[#d9dfd5] bg-[#fbfcfa] py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[#88a879] focus:ring-4 focus:ring-[#edf3e9]"
          />
        </label>

        <label>
          <span className="sr-only">Filter by status</span>
          <select
            name="status"
            defaultValue={status}
            className="w-full rounded-xl border border-[#d9dfd5] bg-[#fbfcfa] px-3 py-2.5 text-sm outline-none focus:border-[#88a879]"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="read">Read</option>
            <option value="resolved">Resolved</option>
            <option value="deleted">Deleted</option>
          </select>
        </label>

        <label>
          <span className="sr-only">Filter by category</span>
          <select
            name="category"
            defaultValue={category}
            className="w-full rounded-xl border border-[#d9dfd5] bg-[#fbfcfa] px-3 py-2.5 text-sm outline-none focus:border-[#88a879]"
          >
            <option value="all">All categories</option>
            <option value="bug">Bugs</option>
            <option value="feature">Feature requests</option>
            <option value="content">Content</option>
            <option value="billing">Billing</option>
            <option value="account">Accounts</option>
            <option value="other">Other</option>
          </select>
        </label>

        <button type="submit" className="btn btn-primary px-5 py-2.5 text-sm">
          Apply
        </button>
      </form>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#dfe4dc] bg-white shadow-[0_10px_28px_rgba(52,65,48,0.04)]">
        {result.feedback.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[66rem] border-collapse text-left">
              <thead className="bg-[#f5f7f2] text-xs font-bold uppercase tracking-[0.12em] text-[#778075]">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Message</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0ea]">
                {result.feedback.map((item) => (
                  <tr key={item.id} className="transition hover:bg-[#fbfcfa]">
                    <td className="px-5 py-4">
                      <p className="max-w-48 truncate text-sm font-semibold text-[#364136]">
                        {displayName(item)}
                      </p>
                      <p className="mt-0.5 max-w-48 truncate text-xs text-[#818981]">
                        {item.email ?? "Account removed"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-[#667066]">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badgeClass(item.category)}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="max-w-md px-4 py-4 text-sm leading-6 text-[#596359]">
                      {excerpt(item.message)}
                      {item.hasAdminNote && (
                        <span className="mt-1 block text-xs font-semibold text-[#718269]">
                          Internal note added
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/feedback/${item.id}`}
                        className="text-sm font-semibold text-[#58754c] underline-offset-4 hover:underline"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center px-6 text-center">
            <div>
              <MessageSquareText
                aria-hidden="true"
                className="mx-auto h-9 w-9 text-[#8e988b]"
              />
              <h2 className="mt-4 text-lg font-semibold text-[#3c473c]">
                No feedback matches these filters
              </h2>
              <p className="mt-2 text-sm text-[#747d73]">
                Clear the search or broaden the selected filters.
              </p>
              <Link
                href="/admin/feedback"
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
          aria-label="Feedback inbox pages"
          className="mt-5 flex items-center justify-between gap-4"
        >
          <Link
            href={pageHref({
              query,
              status,
              category,
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
              category,
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
    </section>
  );
}
