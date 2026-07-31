"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";

const categories = [
  { value: "bug", label: "Something is not working" },
  { value: "feature", label: "Feature suggestion" },
  { value: "content", label: "Content or vocabulary" },
  { value: "billing", label: "Subscription or billing" },
  { value: "account", label: "Account or sign-in" },
  { value: "other", label: "Something else" },
] as const;

export function FeedbackForm() {
  const [category, setCategory] = useState("feature");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const normalizedMessage = message.trim();
    if (normalizedMessage.length < 10) {
      setError("Tell us a little more so we can understand your feedback.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: normalizedMessage,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(String(payload?.error ?? "Feedback could not be sent."));
      }

      setSuccess(String(payload?.message ?? "Thank you for your feedback."));
      setMessage("");
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Feedback could not be sent.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-[#dce3d7] bg-white p-5 shadow-[0_18px_55px_rgba(55,69,51,0.08)] sm:p-7"
    >
      <label className="block">
        <span className="text-sm font-semibold text-[#3f4b3f]">
          What would you like to tell us about?
        </span>
        <select
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="mt-2 w-full rounded-xl border border-[#d7ded3] bg-[#fbfcfa] px-3 py-3 text-sm outline-none transition focus:border-[#84a274] focus:ring-4 focus:ring-[#edf3e9]"
        >
          {categories.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>

      <label className="mt-5 block">
        <span className="text-sm font-semibold text-[#3f4b3f]">
          Your feedback
        </span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value.slice(0, 4000))}
          rows={8}
          placeholder="Describe what happened, what you expected, or what would make Classendo more useful."
          className="mt-2 w-full resize-y rounded-xl border border-[#d7ded3] bg-[#fbfcfa] px-3 py-3 text-sm leading-6 outline-none transition focus:border-[#84a274] focus:ring-4 focus:ring-[#edf3e9]"
        />
        <span className="mt-1 block text-right text-xs text-[#858d83]">
          {message.length.toLocaleString()} / 4,000
        </span>
      </label>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-[#ead7cf] bg-[#fff8f5] px-4 py-3 text-sm text-[#915844]"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="mt-4 flex items-start gap-2 rounded-xl border border-[#d7e4d0] bg-[#f4f9f1] px-4 py-3 text-sm text-[#526f47]"
        >
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0"
          />
          {success}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || message.trim().length < 10}
        className="btn btn-primary mt-5 inline-flex items-center gap-2 px-5 py-3 text-sm disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Send aria-hidden="true" className="h-4 w-4" />
        {busy ? "Sending…" : "Send feedback"}
      </button>
    </form>
  );
}
