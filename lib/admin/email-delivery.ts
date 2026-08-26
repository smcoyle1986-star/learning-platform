import "server-only";

import { getOptionalEnv } from "@/lib/server/env";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

const SIGNUP_CONFIRMATION_SUBJECT = "Confirm your Classendo account";
const LOOKBACK_HOURS = 24;
const DELIVERY_GRACE_MINUTES = 20;

type ResendEmail = {
  id?: unknown;
  to?: unknown;
  created_at?: unknown;
  subject?: unknown;
  last_event?: unknown;
};

type DeliveryIssue = {
  id: string;
  email: string;
  status: string;
  detail: string;
  sentAt: string;
  ageMinutes: number;
  attempts: number;
  suppressedAttempts: number;
};

export type EmailDeliveryHealth = {
  configured: boolean;
  checkedAt: string;
  status: "healthy" | "attention" | "unavailable";
  sent24h: number;
  delivered24h: number;
  failed24h: number;
  delayed: DeliveryIssue[];
  message: string;
};

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "Email unavailable";
  return `${local.slice(0, 1)}${"•".repeat(Math.min(Math.max(local.length - 1, 1), 5))}@${domain}`;
}

function isDelivered(event: string) {
  return ["delivered", "opened", "clicked"].includes(event);
}

function isFailure(event: string) {
  return ["bounced", "complained", "failed"].includes(event);
}

function statusPriority(event: string) {
  if (event === "bounced" || event === "complained" || event === "failed") return 3;
  if (event === "suppressed") return 2;
  return 1;
}

function statusDetail(event: string) {
  switch (event) {
    case "bounced":
      return "Recipient server rejected the address";
    case "complained":
      return "Recipient marked a previous message as spam";
    case "failed":
      return "Provider could not deliver the message";
    case "suppressed":
      return "Resend blocked a repeat after a bounce or spam complaint";
    case "delivery delayed":
    case "delivery_delayed":
      return "Recipient server has not accepted the message yet";
    case "sent":
      return "No delivery event received yet";
    default:
      return "Delivery needs review";
  }
}

async function listRecentResendEmails(apiKey: string): Promise<ResendEmail[]> {
  const response = await fetch("https://api.resend.com/emails?limit=100", {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Resend returned ${response.status}.`);
  }

  const body = await response.json() as { data?: unknown };
  return asArray(body.data) as ResendEmail[];
}

export async function getEmailDeliveryHealth(): Promise<EmailDeliveryHealth> {
  const checkedAt = new Date().toISOString();
  const apiKey = getOptionalEnv("RESEND_API_KEY");
  if (!apiKey) {
    return {
      configured: false,
      checkedAt,
      status: "unavailable",
      sent24h: 0,
      delivered24h: 0,
      failed24h: 0,
      delayed: [],
      message: "Resend monitoring is not configured.",
    };
  }

  try {
    const [resendEmails, usersResult] = await Promise.all([
      listRecentResendEmails(apiKey),
      getSupabaseAdmin().auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);
    if (usersResult.error) throw usersResult.error;

    const now = Date.now();
    const lookback = now - LOOKBACK_HOURS * 60 * 60 * 1_000;
    const recentlyUnconfirmed = new Map(
      usersResult.data.users
        .filter((user) => !user.email_confirmed_at && user.email && user.confirmation_sent_at)
        .map((user) => [user.email!.toLowerCase(), user]),
    );
    const confirmations = resendEmails.filter((email) => {
      const createdAt = Date.parse(asString(email.created_at));
      return asString(email.subject) === SIGNUP_CONFIRMATION_SUBJECT && Number.isFinite(createdAt) && createdAt >= lookback;
    });

    const delayedByRecipient = new Map<string, DeliveryIssue>();
    for (const email of confirmations) {
      const recipients = asArray(email.to).map(asString).filter(Boolean);
      const sentAt = asString(email.created_at);
      const ageMinutes = Math.floor((now - Date.parse(sentAt)) / 60_000);
      const status = asString(email.last_event).toLowerCase() || "unknown";
      if (ageMinutes < DELIVERY_GRACE_MINUTES || isDelivered(status)) continue;

      for (const recipient of recipients) {
        const recipientKey = recipient.toLowerCase();
        if (!recentlyUnconfirmed.has(recipientKey)) continue;

        const existing = delayedByRecipient.get(recipientKey);
        const candidate = {
          id: asString(email.id) || `${recipientKey}-${sentAt}`,
          email: maskEmail(recipient),
          status,
          detail: statusDetail(status),
          sentAt,
          ageMinutes,
          attempts: 1,
          suppressedAttempts: status === "suppressed" ? 1 : 0,
        };
        if (!existing) {
          delayedByRecipient.set(recipientKey, candidate);
          continue;
        }

        existing.attempts += 1;
        existing.suppressedAttempts += candidate.suppressedAttempts;
        const existingIsMoreSevere = statusPriority(existing.status) > statusPriority(candidate.status);
        const sameSeverityButNewer = statusPriority(existing.status) === statusPriority(candidate.status)
          && Date.parse(candidate.sentAt) > Date.parse(existing.sentAt);
        if (!existingIsMoreSevere && (statusPriority(candidate.status) > statusPriority(existing.status) || sameSeverityButNewer)) {
          Object.assign(existing, candidate, {
            attempts: existing.attempts,
            suppressedAttempts: existing.suppressedAttempts,
          });
        }
      }
    }
    const delayed = Array.from(delayedByRecipient.values())
      .sort((first, second) => Date.parse(second.sentAt) - Date.parse(first.sentAt));
    const failed24h = confirmations.filter((email) => isFailure(asString(email.last_event).toLowerCase())).length;
    const delivered24h = confirmations.filter((email) => isDelivered(asString(email.last_event).toLowerCase())).length;
    const status = delayed.length || failed24h ? "attention" : "healthy";

    return {
      configured: true,
      checkedAt,
      status,
      sent24h: confirmations.length,
      delivered24h,
      failed24h,
      delayed: delayed.slice(0, 6),
      message: status === "healthy"
        ? "No delayed, bounced, or complained-about confirmation emails in the last 24 hours."
        : "One or more recent signups may be blocked before confirmation.",
    };
  } catch (error) {
    console.error("Could not check Resend confirmation-email delivery:", error);
    return {
      configured: true,
      checkedAt,
      status: "unavailable",
      sent24h: 0,
      delivered24h: 0,
      failed24h: 0,
      delayed: [],
      message: "Resend delivery status could not be checked. Review the provider connection.",
    };
  }
}
