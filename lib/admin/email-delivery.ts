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
  sentAt: string;
  ageMinutes: number;
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

    const delayed = confirmations.flatMap((email) => {
      const recipients = asArray(email.to).map(asString).filter(Boolean);
      const sentAt = asString(email.created_at);
      const ageMinutes = Math.floor((now - Date.parse(sentAt)) / 60_000);
      const status = asString(email.last_event).toLowerCase() || "unknown";
      if (ageMinutes < DELIVERY_GRACE_MINUTES || isDelivered(status)) return [];

      return recipients
        .filter((recipient) => recentlyUnconfirmed.has(recipient.toLowerCase()))
        .map((recipient) => ({
          id: asString(email.id) || `${recipient}-${sentAt}`,
          email: maskEmail(recipient),
          status,
          sentAt,
          ageMinutes,
        }));
    });
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
