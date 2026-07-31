function LoadingCard() {
  return (
    <div className="h-36 animate-pulse rounded-2xl border border-[#e1e5de] bg-white p-5">
      <div className="h-4 w-24 rounded bg-[#edf0ea]" />
      <div className="mt-5 h-8 w-16 rounded bg-[#e6ebe2]" />
      <div className="mt-4 h-3 w-36 rounded bg-[#f0f2ed]" />
    </div>
  );
}

export default function AdminDashboardLoading() {
  return (
    <section className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10" aria-label="Loading administrator dashboard">
      <div className="h-10 w-72 animate-pulse rounded-lg bg-[#e4e9e0]" />
      <div className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <LoadingCard key={index} />
        ))}
      </div>
      <span className="sr-only">Loading administrator dashboard data…</span>
    </section>
  );
}
