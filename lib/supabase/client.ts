import {
  createBrowserClient,
  createChunks,
  stringToBase64URL,
} from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const secureCookies = process.env.NODE_ENV === "production";

function getLegacyStorageKey() {
  if (typeof window === "undefined") return null;

  try {
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
}

function migrateLegacySessionToCookies() {
  const storageKey = getLegacyStorageKey();
  if (!storageKey) return null;

  const hasSessionCookie = document.cookie
    .split("; ")
    .some((cookie) => cookie.startsWith(`${storageKey}=`) || cookie.startsWith(`${storageKey}.`));

  if (hasSessionCookie) return storageKey;

  const legacyValue = window.localStorage.getItem(storageKey);
  if (!legacyValue) return null;

  try {
    const parsed = JSON.parse(legacyValue) as {
      access_token?: unknown;
      refresh_token?: unknown;
    };

    if (
      typeof parsed.access_token !== "string"
      || typeof parsed.refresh_token !== "string"
    ) {
      return null;
    }

    const encodedValue = `base64-${stringToBase64URL(legacyValue)}`;
    const cookieSuffix = [
      "Path=/",
      "Max-Age=34560000",
      "SameSite=Lax",
      secureCookies ? "Secure" : "",
    ].filter(Boolean).join("; ");

    createChunks(storageKey, encodedValue).forEach(({ name, value }) => {
      document.cookie = `${name}=${encodeURIComponent(value)}; ${cookieSuffix}`;
    });

    return storageKey;
  } catch {
    return null;
  }
}

const legacyStorageKey = migrateLegacySessionToCookies();

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: {
    path: "/",
    sameSite: "lax",
    secure: secureCookies,
  },
});

export const supabaseReady =
  typeof window === "undefined"
    ? Promise.resolve()
    : supabase.auth.getSession().then(({ data, error }) => {
        if (!error && data.session && legacyStorageKey) {
          window.localStorage.removeItem(legacyStorageKey);
        }
      });
