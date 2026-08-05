import "server-only";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { getStripeServer } from "@/lib/server/stripe";

export type AdminHealthStatus = "operational" | "configured" | "attention";

export type AdminServiceHealth = {
  name: string;
  status: AdminHealthStatus;
  detail: string;
  latencyMs: number | null;
};

export type AdminEnvironmentCheck = {
  label: string;
  configured: boolean;
  variable: string;
  detail: string;
};

export type AdminSettingsSnapshot = {
  checkedAt: string;
  environment: string;
  services: AdminServiceHealth[];
  variables: AdminEnvironmentCheck[];
  webhook: {
    status: AdminHealthStatus;
    detail: string;
    lastEventType: string | null;
    lastProcessedAt: string | null;
    mode: "live" | "test" | "unknown";
  };
};

const STRIPE_SECRET_KEYS = ["STRIPE_SECRET_KEY", "STRIPE_SANDBOX_SECRET_KEY"];
const STRIPE_WEBHOOK_KEYS = ["STRIPE_WEBHOOK_SECRET", "STRIPE_SANDBOX_WEBHOOK_SECRET"];
const MONTHLY_PRICE_KEYS = [
  "STRIPE_PRICE_PREMIUM_MONTHLY",
  "STRIPE_PREMIUM_MONTHLY_PRICE_ID",
  "STRIPE_MONTHLY_PRICE_ID",
  "STRIPE_PRICE_MONTHLY",
  "NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_MONTHLY",
];
const YEARLY_PRICE_KEYS = [
  "STRIPE_PRICE_PREMIUM_YEARLY",
  "STRIPE_PREMIUM_YEARLY_PRICE_ID",
  "STRIPE_YEARLY_PRICE_ID",
  "STRIPE_PRICE_YEARLY",
  "NEXT_PUBLIC_STRIPE_PRICE_PREMIUM_YEARLY",
];
const APP_URL_KEYS = ["NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SITE_URL", "APP_URL", "SITE_URL", "VERCEL_URL"];

function configuredKey(keys: string[]) {
  return keys.find((key) => Boolean(process.env[key]?.trim())) ?? null;
}

function environmentCheck(
  label: string,
  keys: string[],
  detail: string,
): AdminEnvironmentCheck {
  const key = configuredKey(keys);
  return {
    label,
    configured: Boolean(key),
    variable: key ?? keys[0],
    detail,
  };
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs = 6_000) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Health check timed out")),
      timeoutMs,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function measure<T>(operation: PromiseLike<T>) {
  const startedAt = Date.now();
  const value = await operation;
  return { value, latencyMs: Date.now() - startedAt };
}

export async function getAdminSettingsSnapshot(
  administratorUserId: string,
): Promise<AdminSettingsSnapshot> {
  const supabase = getSupabaseAdmin();
  const databaseCheck = supabase
    .from("admin_memberships")
    .select("user_id", { count: "exact", head: true });
  const authCheck = supabase.auth.admin.getUserById(administratorUserId);
  const webhookCheck = supabase
    .from("stripe_webhook_events")
    .select("event_type,processed_at,livemode")
    .order("processed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const stripeSecretKey = configuredKey(STRIPE_SECRET_KEYS);
  const stripeCheck = stripeSecretKey
    ? withTimeout(getStripeServer().customers.list({ limit: 1 }))
    : Promise.reject(new Error("Stripe key is not configured"));

  const [databaseResult, authResult, stripeResult, webhookResult] = await Promise.allSettled([
    measure(databaseCheck),
    measure(authCheck),
    measure(stripeCheck),
    measure(webhookCheck),
  ]);

  const databaseOperational =
    databaseResult.status === "fulfilled" && !databaseResult.value.value.error;
  const authOperational =
    authResult.status === "fulfilled"
    && !authResult.value.value.error
    && Boolean(authResult.value.value.data.user);
  const stripeOperational = stripeResult.status === "fulfilled";
  const webhookSecretKey = configuredKey(STRIPE_WEBHOOK_KEYS);
  const webhookRow =
    webhookResult.status === "fulfilled" && !webhookResult.value.value.error
      ? webhookResult.value.value.data
      : null;
  const webhookStatus: AdminHealthStatus = !webhookSecretKey
    ? "attention"
    : webhookRow
      ? "operational"
      : "configured";

  return {
    checkedAt: new Date().toISOString(),
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    services: [
      {
        name: "Supabase",
        status: authOperational ? "operational" : "attention",
        detail: authOperational
          ? "Authentication and service-role access responded successfully."
          : "Supabase authentication could not be verified.",
        latencyMs: authResult.status === "fulfilled" ? authResult.value.latencyMs : null,
      },
      {
        name: "Database",
        status: databaseOperational ? "operational" : "attention",
        detail: databaseOperational
          ? "The primary Classendo database accepted a read-only query."
          : "The primary database connectivity check failed.",
        latencyMs: databaseResult.status === "fulfilled" ? databaseResult.value.latencyMs : null,
      },
      {
        name: "Stripe",
        status: stripeOperational ? "operational" : "attention",
        detail: stripeOperational
          ? "Stripe API credentials responded successfully."
          : stripeSecretKey
            ? "Stripe is configured but the API check did not succeed."
            : "Stripe API credentials are not configured.",
        latencyMs: stripeResult.status === "fulfilled" ? stripeResult.value.latencyMs : null,
      },
    ],
    variables: [
      environmentCheck("Supabase project URL", ["NEXT_PUBLIC_SUPABASE_URL"], "Connects browser and server requests to the Classendo project."),
      environmentCheck("Supabase anonymous key", ["NEXT_PUBLIC_SUPABASE_ANON_KEY"], "Required for sign-in and row-level-security sessions."),
      environmentCheck("Supabase service role", ["SUPABASE_SERVICE_ROLE_KEY"], "Required for trusted server and administrator operations."),
      environmentCheck("Stripe secret key", STRIPE_SECRET_KEYS, "Required for checkout, portal, and subscription reconciliation."),
      environmentCheck("Stripe webhook secret", STRIPE_WEBHOOK_KEYS, "Validates that billing events genuinely came from Stripe."),
      environmentCheck("Monthly Premium price", MONTHLY_PRICE_KEYS, "Maps monthly checkout to the correct Stripe price."),
      environmentCheck("Yearly Premium price", YEARLY_PRICE_KEYS, "Maps yearly checkout to the correct Stripe price."),
      environmentCheck("Application URL", APP_URL_KEYS, "Builds production checkout, portal, and authentication return URLs."),
      environmentCheck("OpenAI API key", ["OPENAI_API_KEY"], "Powers AI-assisted Classendo content generation."),
    ],
    webhook: {
      status: webhookStatus,
      detail: !webhookSecretKey
        ? "A Stripe webhook signing secret is required."
        : webhookRow
          ? "The webhook secret is configured and Classendo has processed an event."
          : "The webhook secret is configured; no processed event is recorded yet.",
      lastEventType: typeof webhookRow?.event_type === "string" ? webhookRow.event_type : null,
      lastProcessedAt: typeof webhookRow?.processed_at === "string" ? webhookRow.processed_at : null,
      mode: webhookRow?.livemode === true
        ? "live"
        : webhookRow?.livemode === false
          ? "test"
          : stripeSecretKey?.startsWith("sk_live_")
            ? "live"
            : stripeSecretKey
              ? "test"
              : "unknown",
    },
  };
}
