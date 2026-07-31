export default function AdminSubscriptionsLoading() {
  return (
    <section
      aria-label="Loading subscriptions"
      aria-busy="true"
      className="animate-pulse px-5 py-8 sm:px-7 lg:px-10 lg:py-10"
    >
      <div className="h-4 w-36 rounded bg-[#e4e9e1]" />
      <div className="mt-4 h-10 w-60 rounded bg-[#e4e9e1]" />
      <div className="mt-4 h-4 max-w-xl rounded bg-[#edf0ea]" />
      <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-24 rounded-2xl border border-[#e1e6de] bg-white"
          />
        ))}
      </div>
      <div className="mt-5 h-20 rounded-2xl border border-[#e1e6de] bg-white" />
      <div className="mt-5 h-80 rounded-2xl border border-[#e1e6de] bg-white" />
    </section>
  );
}
