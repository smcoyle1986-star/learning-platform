"use client";

import { supabase, supabaseReady } from "@/lib/supabase/client";

async function getAuthHeaders() {
  await supabaseReady;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function postJson<T>(url: string, body?: Record<string, unknown>) {
  const authHeaders = await getAuthHeaders();
  const headers = new Headers({
    "Content-Type": "application/json",
  });
  if (authHeaders.Authorization) {
    headers.set("Authorization", authHeaders.Authorization);
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body ?? {}),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(String(payload?.error ?? "Request failed."));
  }

  return payload as T;
}

export async function startPremiumCheckout(plan: "monthly" | "yearly") {
  const payload = await postJson<{ url: string }>("/api/stripe/checkout", { plan });
  window.location.href = payload.url;
}

export async function openBillingPortal() {
  const payload = await postJson<{ url: string }>("/api/stripe/portal");
  window.location.href = payload.url;
}
