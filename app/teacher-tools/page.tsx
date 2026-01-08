export default function ComingSoonPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center
      bg-[var(--color-bg-main)] text-center px-6">

      <h1 className="text-4xl md:text-5xl font-bold mb-4">
        Coming Soon 🚀
      </h1>

      <p className="text-lg text-[var(--color-text-muted)] max-w-md mb-8">
        This feature is currently under development and will be available soon.
      </p>

      <a
        href="/"
        className="px-6 py-3 rounded-xl bg-[var(--color-primary)]
        text-white transition hover:opacity-90"
      >
        Back to Home
      </a>
    </div>
  );
}
