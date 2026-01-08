export default function AIToolsSection() {
  return (
    <section className="bg-indigo-50 py-24">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <span className="inline-block mb-4 px-4 py-1 text-sm font-semibold rounded-full bg-indigo-100 text-indigo-700">
          Coming Soon
        </span>

        <h2 className="text-4xl font-bold text-indigo-900">
          AI-Powered Classroom Tools
        </h2>

        <p className="mt-6 text-lg text-indigo-700 max-w-3xl mx-auto">
          Describe what you want to teach — we’ll build the worksheet for you.
          From grammar practice to themed vocabulary, printable classroom
          resources will be generated in seconds.
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            ✨ Generate printable ESL worksheets
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            ✍️ Custom grammar & vocabulary topics
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            🖨️ Ready-to-print PDFs
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            🎯 Level-appropriate for young learners
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            📚 Designed for real classrooms
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            🚀 Early access for teachers
          </div>
        </div>

        <button className="mt-14 px-8 py-4 rounded-xl bg-indigo-600 text-white text-lg font-semibold hover:bg-indigo-700 transition">
          Get early access
        </button>
      </div>
    </section>
  );
}
