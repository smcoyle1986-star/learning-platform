export default function AdminUsersLoading() {
  return (
    <section
      className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10"
      aria-label="Loading users"
    >
      <div className="h-10 w-48 animate-pulse rounded-lg bg-[#e4e9e0]" />
      <div className="mt-8 h-16 animate-pulse rounded-2xl border border-[#e1e5de] bg-white" />
      <div className="mt-5 overflow-hidden rounded-2xl border border-[#e1e5de] bg-white">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="flex h-20 items-center gap-4 border-b border-[#edf0ea] px-5 last:border-0"
          >
            <div className="h-10 w-10 animate-pulse rounded-xl bg-[#e8ede4]" />
            <div className="h-4 w-48 animate-pulse rounded bg-[#edf0ea]" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading the user directory…</span>
    </section>
  );
}
