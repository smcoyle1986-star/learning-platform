import {
  ChevronLeft,
  ChevronRight,
  Search,
  UserRoundSearch,
} from "lucide-react";
import Link from "next/link";

import {
  ADMIN_USERS_PAGE_SIZE,
  getAdminUsers,
  type AdminUserListItem,
} from "@/lib/admin/users";

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
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : dateFormatter.format(date);
}

function badgeClass(value: string) {
  if (value === "premium" || value === "active" || value === "trialing") {
    return "bg-[#e7f1df] text-[#4e6d42]";
  }
  if (value === "suspended" || value === "past_due") {
    return "bg-[#f7e8e1] text-[#9a5845]";
  }
  if (value === "complimentary") {
    return "bg-[#e7edf7] text-[#506988]";
  }
  if (value === "owner" || value === "admin" || value === "moderator") {
    return "bg-[#eee8f7] text-[#6c5687]";
  }
  return "bg-[#eef0eb] text-[#687067]";
}

function displayName(user: AdminUserListItem) {
  return user.username || user.displayName || user.email || "Unnamed user";
}

function initials(user: AdminUserListItem) {
  return displayName(user).slice(0, 2).toUpperCase();
}

function pageHref(params: {
  query: string;
  role: string;
  tier: string;
  status: string;
  page: number;
}) {
  const search = new URLSearchParams();
  if (params.query) search.set("q", params.query);
  if (params.role !== "all") search.set("role", params.role);
  if (params.tier !== "all") search.set("tier", params.tier);
  if (params.status !== "all") search.set("status", params.status);
  if (params.page > 1) search.set("page", String(params.page));
  const suffix = search.toString();
  return suffix ? `/admin/users?${suffix}` : "/admin/users";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query = first(raw.q).trim();
  const role = first(raw.role) || "all";
  const tier = first(raw.tier) || "all";
  const status = first(raw.status) || "all";
  const requestedPage = positiveInteger(first(raw.page), 1);
  const result = await getAdminUsers({
    query,
    role,
    tier,
    status,
    page: requestedPage,
  });
  const totalPages = Math.max(1, Math.ceil(result.total / ADMIN_USERS_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  return (
    <section className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
      <div className="flex flex-col justify-between gap-5 border-b border-[#dfe4dc] pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#718d63]">
            Account operations
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#2f3a2f] sm:text-4xl">
            Users
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e786d]">
            Search accounts, review access and subscription state, and open a
            complete account record.
          </p>
        </div>
        <div className="rounded-2xl border border-[#dfe4dc] bg-white px-4 py-3 text-sm text-[#697267]">
          <strong className="text-[#354035]">{result.total}</strong>{" "}
          {result.total === 1 ? "matching user" : "matching users"}
        </div>
      </div>

      <form
        action="/admin/users"
        className="mt-7 grid gap-3 rounded-2xl border border-[#dfe4dc] bg-white p-4 shadow-[0_10px_28px_rgba(52,65,48,0.04)] md:grid-cols-[minmax(14rem,1fr)_repeat(3,minmax(9rem,auto))_auto]"
      >
        <label className="relative">
          <span className="sr-only">Search users</span>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9288]"
          />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Email, username, or name"
            className="w-full rounded-xl border border-[#d9dfd5] bg-[#fbfcfa] py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-[#88a879] focus:ring-4 focus:ring-[#edf3e9]"
          />
        </label>

        <label>
          <span className="sr-only">Filter by role</span>
          <select
            name="role"
            defaultValue={role}
            className="w-full rounded-xl border border-[#d9dfd5] bg-[#fbfcfa] px-3 py-2.5 text-sm outline-none focus:border-[#88a879]"
          >
            <option value="all">All roles</option>
            <option value="user">Users</option>
            <option value="owner">Owners</option>
            <option value="admin">Admins</option>
            <option value="moderator">Moderators</option>
          </select>
        </label>

        <label>
          <span className="sr-only">Filter by tier</span>
          <select
            name="tier"
            defaultValue={tier}
            className="w-full rounded-xl border border-[#d9dfd5] bg-[#fbfcfa] px-3 py-2.5 text-sm outline-none focus:border-[#88a879]"
          >
            <option value="all">All tiers</option>
            <option value="free">Free</option>
            <option value="premium">Premium</option>
          </select>
        </label>

        <label>
          <span className="sr-only">Filter by status</span>
          <select
            name="status"
            defaultValue={status}
            className="w-full rounded-xl border border-[#d9dfd5] bg-[#fbfcfa] px-3 py-2.5 text-sm outline-none focus:border-[#88a879]"
          >
            <option value="all">All statuses</option>
            <option value="paid">Paid premium</option>
            <option value="complimentary">Complimentary</option>
            <option value="free">Free</option>
            <option value="suspended">Suspended</option>
            <option value="past_due">Past due</option>
          </select>
        </label>

        <button type="submit" className="btn btn-primary px-5 py-2.5 text-sm">
          Apply
        </button>
      </form>

      <div className="mt-5 overflow-hidden rounded-2xl border border-[#dfe4dc] bg-white shadow-[0_10px_28px_rgba(52,65,48,0.04)]">
        {result.users.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[58rem] border-collapse text-left">
              <thead className="bg-[#f5f7f2] text-xs font-bold uppercase tracking-[0.12em] text-[#778075]">
                <tr>
                  <th className="px-5 py-3.5">User</th>
                  <th className="px-4 py-3.5">Role</th>
                  <th className="px-4 py-3.5">Tier</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5">Joined</th>
                  <th className="px-4 py-3.5">Last sign-in</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0ea]">
                {result.users.map((user) => (
                  <tr key={user.id} className="transition hover:bg-[#fbfcfa]">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e9f0e4] text-xs font-bold text-[#5c7651]">
                          {initials(user)}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#364136]">
                            {displayName(user)}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-[#818981]">
                            {user.email ?? "No email"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badgeClass(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badgeClass(user.tier)}`}>
                        {user.tier}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${badgeClass(user.status)}`}>
                        {user.status.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-[#667066]">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-4 text-sm text-[#667066]">
                      {formatDate(user.lastSignInAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="text-sm font-semibold text-[#58754c] underline-offset-4 hover:underline"
                      >
                        View
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
              <UserRoundSearch
                aria-hidden="true"
                className="mx-auto h-9 w-9 text-[#8e988b]"
              />
              <h2 className="mt-4 text-lg font-semibold text-[#3c473c]">
                No users match these filters
              </h2>
              <p className="mt-2 text-sm text-[#747d73]">
                Clear the search or broaden the selected filters.
              </p>
              <Link
                href="/admin/users"
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
          aria-label="User directory pages"
          className="mt-5 flex items-center justify-between gap-4"
        >
          <Link
            href={pageHref({ query, role, tier, status, page: Math.max(1, page - 1) })}
            aria-disabled={page <= 1}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${
              page <= 1
                ? "pointer-events-none border-[#e3e6e0] text-[#afb4ac]"
                : "border-[#d5dbd1] bg-white text-[#576557] hover:bg-[#f7f9f5]"
            }`}
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            Previous
          </Link>
          <p className="text-sm text-[#747d73]">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </p>
          <Link
            href={pageHref({ query, role, tier, status, page: Math.min(totalPages, page + 1) })}
            aria-disabled={page >= totalPages}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold ${
              page >= totalPages
                ? "pointer-events-none border-[#e3e6e0] text-[#afb4ac]"
                : "border-[#d5dbd1] bg-white text-[#576557] hover:bg-[#f7f9f5]"
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
