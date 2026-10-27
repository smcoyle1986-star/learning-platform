import type { User } from "@supabase/supabase-js";

/** Only accounts with an email/password identity can set a password here. */
export function hasEmailPasswordProvider(user: Pick<User, "app_metadata">): boolean {
  const metadata = user.app_metadata as { provider?: unknown; providers?: unknown } | null;
  const providers = Array.isArray(metadata?.providers) ? metadata.providers : [];
  return providers.includes("email") || metadata?.provider === "email";
}
