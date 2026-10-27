"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { trackAuthenticatedAnalyticsSession } from "@/lib/analytics/client";

type GoogleCredentialResponse = { credential: string };
type GoogleButtonOptions = {
  type: "standard";
  theme: "outline";
  size: "large";
  text: "continue_with";
  shape: "rectangular";
  logo_alignment: "left";
  width: number;
  click_listener: () => void;
};
type GoogleIdentityApi = {
  initialize: (options: {
    client_id: string;
    nonce: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select: false;
    ux_mode: "popup";
    context: "signin" | "signup";
    cancel_on_tap_outside: true;
  }) => void;
  renderButton: (element: HTMLElement, options: GoogleButtonOptions) => void;
};

declare global {
  interface Window { google?: { accounts?: { id?: GoogleIdentityApi } } }
}

/**
 * Kept intact as an opt-in rollback path (`NEXT_PUBLIC_GOOGLE_AUTH_FLOW=oauth_redirect`).
 * The normal path below uses GIS and sends the ID token directly to Supabase Auth.
 */
export function googleCallbackUrl(nextPath: string, guestExitContext = false) {
  const safeNext = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/flashcards?onboarding=1";
  const callback = new URL("/auth/callback", window.location.origin);
  callback.searchParams.set("next", safeNext);
  if (guestExitContext) callback.searchParams.set("guest_exit", "1");
  return callback.toString();
}

export async function beginGoogleOAuth(nextPath: string, guestExitContext = false) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: googleCallbackUrl(nextPath, guestExitContext),
      scopes: "openid email profile",
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) throw error;
}

function createNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(nonce)).then((digest) => ({
    nonce,
    hashedNonce: Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(""),
  }));
}

function safeNextPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/flashcards?onboarding=1";
}

export default function GoogleOAuthButton({
  nextPath = "/flashcards?onboarding=1",
  guestExitContext = false,
  className = "",
  onStart,
  onSuccess,
}: {
  nextPath?: string;
  guestExitContext?: boolean;
  className?: string;
  onStart?: () => boolean | void | Promise<boolean | void>;
  onSuccess?: () => void | Promise<void>;
}) {
  const router = useRouter();
  const container = useRef<HTMLDivElement>(null);
  const nonce = useRef("");
  const preparation = useRef<Promise<boolean | void> | null>(null);
  const latest = useRef({ nextPath, guestExitContext, onStart, onSuccess });
  const timeout = useRef<number | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    latest.current = { nextPath, guestExitContext, onStart, onSuccess };
  }, [guestExitContext, nextPath, onStart, onSuccess]);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() ?? "";
  const redirectFallback = process.env.NEXT_PUBLIC_GOOGLE_AUTH_FLOW === "oauth_redirect";

  const prepare = useCallback(() => {
    if (!preparation.current) {
      preparation.current = Promise.resolve(latest.current.onStart?.()).catch(() => {
        // Analytics and attribution helpers must not block Google authentication.
        return true;
      });
    }
    return preparation.current;
  }, []);

  const finishGoogleSignIn = useCallback(async (response: GoogleCredentialResponse) => {
    if (!response.credential || !nonce.current) throw new Error("Google did not return a usable sign-in token.");
    if (timeout.current !== null) window.clearTimeout(timeout.current);
    setLoading(true);
    setError("");
    const canContinue = await (preparation.current ?? prepare());
    if (canContinue === false) throw new Error("Signup preparation could not be completed.");

    const { data, error: authError } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: response.credential,
      nonce: nonce.current,
    });
    if (authError) {
      if (/identity|already exists|already registered|user already/i.test(authError.message)) {
        throw new Error("This Google email may already belong to another sign-in method. Sign in with your existing method first, then connect Google from account settings.");
      }
      throw authError;
    }
    if (!data.session) throw new Error("Google sign-in did not create a Classendo session. Please try again.");

    const statusResponse = await fetch("/api/auth/google/status", {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
      cache: "no-store",
    });
    const status = await statusResponse.json().catch(() => null) as { onboardingRequired?: boolean } | null;
    if (!statusResponse.ok) throw new Error("We could not verify your Classendo account. Please try again.");

    const current = latest.current;
    await current.onSuccess?.();
    if (status?.onboardingRequired) {
      const params = new URLSearchParams({ next: safeNextPath(current.nextPath) });
      if (current.guestExitContext) params.set("from", "guest-exit");
      router.replace(`/signup/complete-google?${params.toString()}`);
    } else {
      await trackAuthenticatedAnalyticsSession("sign_in");
      router.replace(safeNextPath(current.nextPath));
    }
  }, [prepare, router]);

  const handleCredential = useCallback((response: GoogleCredentialResponse) => {
    void finishGoogleSignIn(response).catch((cause: unknown) => {
      if (timeout.current !== null) window.clearTimeout(timeout.current);
      const message = cause instanceof Error ? cause.message : "Google sign-in failed. Please try again.";
      setError(message);
      setLoading(false);
      preparation.current = null;
      setAttempt((value) => value + 1);
    });
  }, [finishGoogleSignIn]);

  useEffect(() => {
    if (!scriptReady || !clientId || redirectFallback || !container.current) return;
    const gis = window.google?.accounts?.id;
    if (!gis) {
      window.setTimeout(() => setError("Google sign-in could not load. Check your connection and try again."), 0);
      return;
    }
    let mounted = true;
    let resizeObserver: ResizeObserver | null = null;
    let renderFrame = 0;
    let renderedWidth = 0;
    void createNonce().then(({ nonce: rawNonce, hashedNonce }) => {
      if (!mounted || !container.current) return;
      nonce.current = rawNonce;
      gis.initialize({
        client_id: clientId,
        nonce: hashedNonce,
        callback: handleCredential,
        auto_select: false,
        ux_mode: "popup",
        context: window.location.pathname === "/signup" ? "signup" : "signin",
        cancel_on_tap_outside: true,
      });
      const renderResponsiveButton = () => {
        if (!mounted || !container.current) return;
        const availableWidth = Math.floor((container.current.parentElement ?? container.current).getBoundingClientRect().width);
        if (!availableWidth || availableWidth === renderedWidth) return;
        container.current.replaceChildren();
        gis.renderButton(container.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          logo_alignment: "left",
          width: Math.max(200, Math.min(400, availableWidth)),
          click_listener: () => {
            setError("");
            setLoading(true);
            preparation.current = null;
            void prepare();
            if (timeout.current !== null) window.clearTimeout(timeout.current);
            timeout.current = window.setTimeout(() => {
              setLoading(false);
              setError("Google sign-in was cancelled or timed out. Please try again.");
              preparation.current = null;
              setAttempt((value) => value + 1);
            }, 90_000);
          },
        });
        renderedWidth = availableWidth;
      };
      renderFrame = window.requestAnimationFrame(renderResponsiveButton);
      resizeObserver = new ResizeObserver(() => {
        window.cancelAnimationFrame(renderFrame);
        renderFrame = window.requestAnimationFrame(renderResponsiveButton);
      });
      resizeObserver.observe(container.current.parentElement ?? container.current);
    }).catch(() => {
      if (mounted) setError("Secure Google sign-in could not be initialized. Please refresh and try again.");
    });
    return () => {
      mounted = false;
      resizeObserver?.disconnect();
      window.cancelAnimationFrame(renderFrame);
      if (timeout.current !== null) window.clearTimeout(timeout.current);
    };
  }, [attempt, clientId, handleCredential, prepare, redirectFallback, scriptReady]);

  if (redirectFallback) {
    return <div className="w-full">
      <button type="button" onClick={() => {
        setLoading(true);
        setError("");
        void Promise.resolve(latest.current.onStart?.()).then((allowed) => {
          if (allowed === false) { setLoading(false); return; }
          return beginGoogleOAuth(latest.current.nextPath, latest.current.guestExitContext);
        }).catch(() => { setError("Google sign-in could not start. Please try again."); setLoading(false); });
      }} disabled={loading} className={`flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[#dfe5d7] bg-white px-5 py-3 font-semibold text-[#2f3a2f] shadow-sm transition hover:bg-[#f8faf6] disabled:cursor-wait disabled:opacity-60 ${className}`}>
        {googleMark}{loading ? "Connecting to Google…" : "Continue with Google"}
      </button>
      {error ? <p role="alert" className="mt-2 text-sm text-[#a45d49]">{error}</p> : null}
    </div>;
  }

  return <div className={`w-full min-w-0 max-w-full ${className}`}>
    {clientId ? <>
      <Script id="google-identity-services" src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={() => setScriptReady(true)} onError={() => setError("Google sign-in could not load. Check your connection and try again.")} />
      <div ref={container} className={`flex min-h-12 w-full min-w-0 max-w-full items-center justify-center overflow-hidden ${loading ? "pointer-events-none opacity-60" : ""}`} aria-label="Continue with Google" />
      {loading ? <p className="sr-only" role="status">Connecting to Google…</p> : null}
    </> : <p role="alert" className="rounded-2xl border border-[#ead0c9] bg-[#fff7f4] px-4 py-3 text-sm text-[#a45d49]">Google sign-in is not configured on this site yet.</p>}
    {error ? <p role="alert" className="mt-2 text-sm text-[#a45d49]">{error}</p> : null}
  </div>;
}

const googleMark = <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.68 5.96c4.48-4.14 7.09-10.24 7.09-17.61Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.2A23.9 23.9 0 0 0 0 24c0 3.88.93 7.57 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.84l-7.68-5.96c-2.13 1.43-4.85 2.3-8.21 2.3-6.25 0-11.56-4.22-13.47-9.92l-7.98 6.2C6.51 42.62 14.62 48 24 48Z"/></svg>;
