import { createClient } from "@supabase/supabase-js";

const SOURCE_URL = "https://disposable.github.io/disposable-email-domains/domains.txt";
const SOURCE_NAME = "disposable-email-domains";
const UPSERT_BATCH_SIZE = 1_000;

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function parseDomains(payload) {
  return [...new Set(
    payload
      .split(/\r?\n/)
      .map((line) => line.trim().toLowerCase())
      .filter((domain) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(domain)),
  )].sort();
}

const response = await fetch(SOURCE_URL, {
  headers: { "User-Agent": "classendo-signup-protection/1.0" },
  signal: AbortSignal.timeout(30_000),
});
if (!response.ok) throw new Error(`Could not download the disposable-domain list (${response.status}).`);

const domains = parseDomains(await response.text());
if (domains.length < 10_000) {
  throw new Error(`Downloaded domain list is unexpectedly small (${domains.length}); refusing to update protection data.`);
}

const supabase = createClient(
  requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);
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
