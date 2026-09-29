export class TurnstileVerificationError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function verifyTurnstileToken({
  token,
  secret,
  remoteIp,
  fetcher = fetch,
  allowUnconfigured = false,
}: {
  token: string;
  secret: string | undefined;
  remoteIp: string;
  fetcher?: typeof fetch;
  allowUnconfigured?: boolean;
}) {
  if (!secret) {
    if (allowUnconfigured) return;
    throw new TurnstileVerificationError("Signup protection is temporarily unavailable. Please try again later.", 503);
  }
  if (!token) throw new TurnstileVerificationError("Please complete the security check and try again.", 400);

  const form = new URLSearchParams({ secret, response: token, remoteip: remoteIp });
  let response: Response;
  try {
    response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
  } catch {
    throw new TurnstileVerificationError("Signup protection could not be reached. Please try again.", 503);
  }

  const result = await response.json().catch(() => null) as { success?: boolean } | null;
  if (!response.ok) throw new TurnstileVerificationError("Signup protection could not be reached. Please try again.", 503);
  if (!result?.success) throw new TurnstileVerificationError("The security check expired or could not be verified. Please retry it.", 400);
}
