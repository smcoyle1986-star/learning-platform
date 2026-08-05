import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock3,
  Database,
  ExternalLink,
  KeyRound,
  ServerCog,
  Webhook,
} from "lucide-react";

import { requireAdmin } from "@/lib/admin/auth";
import {
  getAdminSettingsSnapshot,
  type AdminHealthStatus,
} from "@/lib/admin/settings";

const statusStyles: Record<AdminHealthStatus, string> = {
  operational: "border-[#c7dcc0] bg-[#edf7e9] text-[#42633a]",
  configured: "border-[#d8d7b8] bg-[#f8f6e8] text-[#716b35]",
  attention: "border-[#ead1c5] bg-[#fbefea] text-[#8b5944]",
};

function StatusIcon({ status }: { status: AdminHealthStatus }) {
  if (status === "operational") return <CheckCircle2 aria-hidden="true" className="h-4 w-4" />;
  if (status === "configured") return <CircleDot aria-hidden="true" className="h-4 w-4" />;
  return <AlertTriangle aria-hidden="true" className="h-4 w-4" />;
}

function statusLabel(status: AdminHealthStatus) {
  if (status === "operational") return "Operational";
  if (status === "configured") return "Configured";
  return "Needs attention";
}

function date(value: string | null) {
  if (!value) return "No event recorded";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "Unknown"
    : parsed.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
}

export default async function AdminSettingsPage() {
  const administrator = await requireAdmin();
  const snapshot = await getAdminSettingsSnapshot(administrator.userId);

  return (
    <section className="px-5 py-8 sm:px-7 lg:px-10 lg:py-10">
      <div className="flex flex-col justify-between gap-5 border-b border-[#dfe4dc] pb-7 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#718d63]">Platform configuration</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#2f3a2f] sm:text-4xl">Settings and system health</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#6e786d]">
            Read-only production checks for Classendo services, billing webhooks,
            environment configuration, and database connectivity.
          </p>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-[#dfe4dc] bg-white px-4 py-3 text-sm text-[#697267]">
          <Clock3 aria-hidden="true" className="h-4 w-4 text-[#68805d]" />
          Checked {date(snapshot.checkedAt)}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {snapshot.services.map((service) => (
          <article key={service.name} className="rounded-2xl border border-[#dfe4dc] bg-white p-5 shadow-[0_10px_28px_rgba(52,65,48,0.04)]">
            <div className="flex items-start justify-between gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef3ea] text-[#5d7652]">
                {service.name === "Supabase" ? <ServerCog className="h-5 w-5" /> : service.name === "Database" ? <Database className="h-5 w-5" /> : <ExternalLink className="h-5 w-5" />}
              </div>
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] ${statusStyles[service.status]}`}>
                <StatusIcon status={service.status} />
                {statusLabel(service.status)}
              </span>
            </div>
            <h2 className="mt-4 text-lg font-semibold text-[#374337]">{service.name}</h2>
            <p className="mt-2 min-h-10 text-sm leading-5 text-[#707a6f]">{service.detail}</p>
            <p className="mt-4 text-xs text-[#8a9288]">{service.latencyMs === null ? "Response time unavailable" : `${service.latencyMs} ms response`}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <article className="rounded-2xl border border-[#dfe4dc] bg-white p-5">
          <div className="flex items-center gap-3">
            <KeyRound aria-hidden="true" className="h-5 w-5 text-[#66805b]" />
            <div>
              <h2 className="font-semibold text-[#394439]">Environment variable checks</h2>
              <p className="mt-1 text-xs text-[#7a8379]">Presence only—secret values are never displayed.</p>
            </div>
          </div>
          <ul className="mt-5 divide-y divide-[#edf0ea]">
            {snapshot.variables.map((variable) => (
              <li key={variable.label} className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-[#3f4b3e]">{variable.label}</p>
                  <p className="mt-1 text-xs leading-5 text-[#7c857b]">{variable.detail}</p>
                  <code className="mt-1 block text-[0.68rem] text-[#8d948c]">{variable.variable}</code>
                </div>
                <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${variable.configured ? statusStyles.operational : statusStyles.attention}`}>
                  {variable.configured ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                  {variable.configured ? "Configured" : "Missing"}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <div className="space-y-5">
          <article className="rounded-2xl border border-[#dfe4dc] bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <Webhook aria-hidden="true" className="h-5 w-5 text-[#66805b]" />
              <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] ${statusStyles[snapshot.webhook.status]}`}>
                <StatusIcon status={snapshot.webhook.status} />
                {statusLabel(snapshot.webhook.status)}
              </span>
            </div>
            <h2 className="mt-4 font-semibold text-[#394439]">Stripe webhook</h2>
            <p className="mt-2 text-sm leading-6 text-[#707a6f]">{snapshot.webhook.detail}</p>
            <dl className="mt-5 space-y-3 rounded-xl bg-[#f6f8f4] p-4 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-[#7a8379]">Endpoint</dt><dd className="font-medium text-[#455044]">/api/stripe/webhook</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#7a8379]">Mode</dt><dd className="font-medium capitalize text-[#455044]">{snapshot.webhook.mode}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#7a8379]">Last event</dt><dd className="truncate font-medium text-[#455044]">{snapshot.webhook.lastEventType ?? "None"}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#7a8379]">Processed</dt><dd className="text-right font-medium text-[#455044]">{date(snapshot.webhook.lastProcessedAt)}</dd></div>
            </dl>
          </article>

          <article className="rounded-2xl border border-[#d8dfd2] bg-[#f4f7f1] p-5">
            <h2 className="font-semibold text-[#40513c]">Deployment checklist</h2>
            <p className="mt-2 text-sm leading-6 text-[#697666]">
              Environment: <strong className="capitalize text-[#40513c]">{snapshot.environment}</strong>
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-5 text-[#647160]">
              <li>• Add <code>http://localhost:3000/auth/callback</code> to Supabase Auth redirects for development.</li>
              <li>• When Vercel is connected, add <code>https://your-domain/auth/callback</code> for production.</li>
              <li>• Register the production Stripe webhook endpoint and select subscription and checkout events.</li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
