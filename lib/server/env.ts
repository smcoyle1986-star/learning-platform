type RequiredEnvKey =
  | "NEXT_PUBLIC_SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "OPENAI_API_KEY";

function readEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
}

export function getEnv(key: RequiredEnvKey): string {
  const value = readEnv(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getEnvAny(keys: string[]): string {
  for (const key of keys) {
    const value = readEnv(key);
    if (value) return value;
  }

  throw new Error(`Missing required environment variable. Tried: ${keys.join(", ")}`);
}

export function getOptionalEnv(key: string, fallback?: string): string | undefined {
  return readEnv(key) ?? fallback;
}

export function getOptionalNumberEnv(key: string, fallback: number): number {
  const value = readEnv(key);
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
