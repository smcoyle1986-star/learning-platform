import fs from "node:fs";

import { createClient } from "@supabase/supabase-js";

const SOURCE_URL = "https://disposable.github.io/disposable-email-domains/domains.txt";
const SOURCE_NAME = "disposable-email-domains";
const UPSERT_BATCH_SIZE = 1_000;

function loadEnvFile() {
  const values: Record<string, string> = {};
  if (!fs.existsSync(".env.local")) return values;

  for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    values[trimmed.slice(0, separator)] = trimmed.slice(separator + 1);
  }
  return values;
}

function envValue(key: string, fileValues: Record<string, string>) {
  return process.env[key]?.trim() || fileValues[key]?.trim() || "";
}

function parseDomains(payload: string) {
  return Array.from(new Set(
    payload
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter((domain) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain)),
  )).sort();
}

async function main() {
  const env = loadEnvFile();
  const url = envValue("NEXT_PUBLIC_SUPABASE_URL", env);
  const serviceRoleKey = envValue("SUPABASE_SERVICE_ROLE_KEY", env);
  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in the environment or .env.local.");
  }

  const response = await fetch(SOURCE_URL, {
    headers: { "User-Agent": "classendo-signup-protection/1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Could not download the disposable-domain list (${response.status}).`);

  const domains = parseDomains(await response.text());
  if (domains.length < 10_000) {
    throw new Error(`Downloaded domain list is unexpectedly small (${domains.length}); refusing to replace protection data.`);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const syncedAt = new Date().toISOString();

  for (let index = 0; index < domains.length; index += UPSERT_BATCH_SIZE) {
    const rows = domains.slice(index, index + UPSERT_BATCH_SIZE).map((domain) => ({
      domain,
      source: SOURCE_NAME,
      last_synced_at: syncedAt,
    }));
    const { error } = await supabase
      .from("disposable_email_domains")
      .upsert(rows, { onConflict: "domain" });
    if (error) throw error;
  }

  console.log(`Synced ${domains.length.toLocaleString()} disposable email domains at ${syncedAt}.`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
