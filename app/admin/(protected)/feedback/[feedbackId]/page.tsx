import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Mail,
  MessageSquareText,
  Tag,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminFeedbackActions } from "@/components/admin/AdminFeedbackActions";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminFeedbackDetail } from "@/lib/admin/feedback";

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null) {
  if (!value) return "Not yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : dateFormatter.format(date);
}

function badgeClass(value: string) {
  if (value === "pending") return "bg-[#f4edde] text-[#80673e]";
  if (value === "read") return "bg-[#e7edf7] text-[#506988]";
  if (value === "resolved") return "bg-[#e7f1df] text-[#4e6d42]";
  if (value === "deleted") return "bg-[#f2e5e2] text-[#8a554b]";
  return "bg-[#eef0eb] text-[#687067]";
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
      <Icon
        aria-hidden="true"
        className="mt-0.5 h-4 w-4 shrink-0 text-[#77906b]"
      />
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-[#889086]">
          {label}
        </dt>
        <dd className="mt-1 break-words text-sm text-[#3f4a3f]">{value}</dd>
      </div>
    </div>
  );
}

export default async function AdminFeedbackDetailPage({
  params,
}: {
  params: Promise<{ feedbackId: string }>;
}) {
  const { feedbackId } = await params;
  const administrator = await requireAdmin();
  const feedback = await getAdminFeedbackDetail(feedbackId);
  if (!feedback) notFound();

  const userName =
    feedback.username
    || feedback.displayName
    || feedback.email
    || "Deleted user";

  return (
    <section className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
      <Link
        href="/admin/feedback"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#62745b] hover:text-[#42543d]"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Back to feedback
      </Link>

      <div className="mt-6 flex flex-col justify-between gap-5 border-b border-[#dfe4dc] pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#718d63]">
            Feedback review
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#2f3a2f]">
            {feedback.category.charAt(0).toUpperCase()
              + feedback.category.slice(1)}{" "}
            feedback
          </h1>
          <p className="mt-2 text-sm text-[#747d73]">
            Sent by {userName} on {formatDate(feedback.createdAt)}
          </p>
        </div>
        <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold capitalize ${badgeClass(feedback.status)}`}>
          {feedback.status}
        </span>
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
        <div className="min-w-0 space-y-5">
          <article className="rounded-2xl border border-[#dfe4dc] bg-white p-5 shadow-[0_8px_24px_rgba(52,65,48,0.04)] sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-[#394439]">
              <MessageSquareText
                aria-hidden="true"
                className="h-5 w-5 text-[#67815b]"
              />
              Message
            </h2>
            <p className="mt-5 whitespace-pre-wrap break-words text-[0.95rem] leading-7 text-[#4f5a4f]">
              {feedback.message}
            </p>
          </article>

          <div className="grid gap-5 lg:grid-cols-2">
            <article className="rounded-2xl border border-[#dfe4dc] bg-white p-5">
              <h2 className="text-lg font-semibold text-[#394439]">
                Submission
              </h2>
              <dl className="mt-3">
                <DetailRow label="User" value={userName} icon={UserRound} />
                <DetailRow
                  label="Email"
                  value={feedback.email ?? "Account removed"}
                  icon={Mail}
                />
                <DetailRow
                  label="Category"
                  value={feedback.category}
                  icon={Tag}
                />
                <DetailRow
                  label="Submitted"
                  value={formatDate(feedback.createdAt)}
                  icon={CalendarDays}
                />
              </dl>
            </article>

            <article className="rounded-2xl border border-[#dfe4dc] bg-white p-5">
              <h2 className="text-lg font-semibold text-[#394439]">
                Workflow
              </h2>
              <dl className="mt-3">
                <DetailRow
                  label="Read"
                  value={formatDate(feedback.readAt)}
                  icon={Clock3}
                />
                <DetailRow
                  label="Resolved"
                  value={formatDate(feedback.resolvedAt)}
                  icon={CheckCircle2}
                />
                <DetailRow
                  label="Last updated"
                  value={formatDate(feedback.updatedAt)}
                  icon={Clock3}
                />
                <DetailRow
                  label="Handled by"
                  value={feedback.handlerEmail ?? "Not assigned"}
                  icon={UserRound}
                />
              </dl>
            </article>
          </div>
        </div>

        <aside>
          <div className="sticky top-5">
            <AdminFeedbackActions
              feedbackId={feedback.id}
              initialStatus={feedback.status}
              initialNote={feedback.adminNote}
              canDelete={administrator.role === "owner"}
              mfaVerified={administrator.assuranceLevel === "aal2"}
            />
          </div>
        </aside>
      </div>
    </section>
  );
}
