"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  buildUsernameAlternatives,
  isValidUsername,
  normalizeUsername,
  suggestUsernameFromEmail,
} from "@/lib/auth/username";
import { LEGAL_VERSION } from "@/lib/legal/constants";
import {
  buildConfirmationRedirect,
  savePendingEmailConfirmation,
} from "@/lib/auth/pending-confirmation";
import { readSignupAttribution } from "@/lib/analytics/attribution";
import { trackConversion } from "@/lib/analytics/vercel";

type UsernameState = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

const DUPLICATE_EMAIL_MESSAGE = "An account already exists with this email address. Please sign in instead.";

function isDuplicateSignupError(error: unknown) {
  const message = String((error as { message?: unknown } | null)?.message ?? "").toLowerCase();
  return /already registered|already exists|user already|email.*taken|duplicate/.test(message);
}

function safeNextPath(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//") ? value : null;
}

const FALLBACK_COUNTRIES = [
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "New Zealand",
  "Ireland",
  "Singapore",
  "South Korea",
  "Japan",
  "China",
  "Taiwan",
  "Hong Kong",
  "Thailand",
  "Vietnam",
  "Malaysia",
  "Philippines",
  "Indonesia",
  "India",
  "Pakistan",
  "Bangladesh",
  "Nepal",
  "Sri Lanka",
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Bahrain",
  "Oman",
  "Turkey",
  "France",
  "Germany",
  "Spain",
  "Italy",
  "Portugal",
  "Netherlands",
  "Belgium",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "Poland",
  "Czechia",
  "Austria",
  "Switzerland",
  "Greece",
  "Hungary",
  "Romania",
  "Bulgaria",
  "Ukraine",
  "Mexico",
  "Brazil",
  "Argentina",
  "Chile",
  "Colombia",
  "Peru",
  "South Africa",
  "Egypt",
  "Morocco",
  "Nigeria",
  "Kenya",
];

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [countryRegion, setCountryRegion] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [usernameState, setUsernameState] = useState<UsernameState>("idle");
  const [usernameHint, setUsernameHint] = useState("");
  const [usernameOptions, setUsernameOptions] = useState<string[]>([]);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailSuggestion = useMemo(() => suggestUsernameFromEmail(email), [email]);
  const countryOptions = useMemo(() => {
    const displayNames = typeof Intl.DisplayNames === "function"
      ? new Intl.DisplayNames(["en"], { type: "region" })
      : null;

    const names = FALLBACK_COUNTRIES
      .map((value: string) => {
        if (displayNames && value.length === 2 && /^[A-Z]{2}$/.test(value)) {
          return displayNames.of(value) || value;
        }
        return value;
      })
      .filter(Boolean)
      .sort((a: string, b: string) => a.localeCompare(b));

    return Array.from(new Set(names));
  }, []);

  useEffect(() => {
    if (usernameTouched) return;
    setUsername(emailSuggestion);
  }, [emailSuggestion, usernameTouched]);

  useEffect(() => {
    const clean = normalizeUsername(username);
    if (!clean) {
      setUsernameState("idle");
      setUsernameHint("");
      setUsernameOptions([]);
      return;
    }

    if (!isValidUsername(clean)) {
      setUsernameState("invalid");
      setUsernameHint("Use 3–24 characters with lowercase letters, numbers, underscores, or hyphens.");
      setUsernameOptions([]);
      return;
    }

    let cancelled = false;
    setUsernameState("checking");
    setUsernameHint("Checking availability...");

    const timeout = window.setTimeout(async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", clean)
        .maybeSingle();

      if (cancelled) return;

      if (error && !String(error.message || "").toLowerCase().includes("column")) {
        setUsernameState("error");
        setUsernameHint("We could not check that username right now. You can still try submitting it.");
        setUsernameOptions([]);
        return;
      }

      if (data) {
        const alternatives = buildUsernameAlternatives(clean);
        setUsernameState("taken");
        setUsernameHint("That username is already taken.");
        setUsernameOptions(alternatives);
        return;
      }

      setUsernameState("available");
      setUsernameHint("Username available.");
      setUsernameOptions([]);
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [username]);

  const applySuggestion = (value: string) => {
    setUsernameTouched(true);
    setUsername(value);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = normalizeUsername(username);
    const cleanCountry = countryRegion.trim();

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setMessage("Please enter a valid email address.");
      return;
    }

    if (!cleanCountry) {
      setMessage("Please enter your country or region.");
      return;
    }

    if (!legalAccepted) {
      setMessage("Please confirm that you are at least 18 and accept the Terms of Service and Refund Policy.");
      return;
    }

    if (!cleanUsername || !isValidUsername(cleanUsername)) {
      setMessage("Username must be 3–24 characters and use only lowercase letters, numbers, underscores, or hyphens.");
      return;
    }

    if (usernameState === "taken") {
      const alternatives = usernameOptions.length ? usernameOptions : buildUsernameAlternatives(cleanUsername);
      setMessage(`That username is taken. Try ${alternatives.slice(0, 3).join(", ")}.`);
      return;
    }

    setSubmitting(true);
    try {
      const availabilityResponse = await fetch("/api/auth/email-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const availability = await availabilityResponse.json().catch(() => null);
      if (availabilityResponse.ok && availability?.available === false) {
        setMessage(DUPLICATE_EMAIL_MESSAGE);
        return;
      }
      if (!availabilityResponse.ok) {
        setMessage("We could not verify this email right now. Please try again shortly.");
        return;
      }

      const requestedNext = safeNextPath(new URLSearchParams(window.location.search).get("next"));
      const welcomeDestination = requestedNext ?? "/flashcards?onboarding=1";
      const onboardingStartedAt = new Date().toISOString();
      const signupAttribution = readSignupAttribution();
      trackConversion("signup_submitted", {
        destination: requestedNext === "/upgrade" ? "upgrade" : "flashcards",
      });
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: buildConfirmationRedirect(window.location.origin, welcomeDestination),
          data: {
            username: cleanUsername,
            country_region: cleanCountry,
            age_confirmed: true,
            terms_accepted_at: new Date().toISOString(),
            terms_version: LEGAL_VERSION,
            privacy_notice_version: LEGAL_VERSION,
            classendo_onboarding_started_at: onboardingStartedAt,
            signup_attribution: signupAttribution,
          },
        },
      });

      if (error) {
        setMessage(isDuplicateSignupError(error) ? DUPLICATE_EMAIL_MESSAGE : `Error: ${error.message}`);
        return;
      }

      if (!data.user) {
        setMessage("We could not finish creating your account just now. Please try again.");
        return;
      }

      trackConversion("signup_account_created", {
        email_confirmation_required: !data.session,
      });

      if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setMessage(DUPLICATE_EMAIL_MESSAGE);
        return;
      }

      if (data.session) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            display_name: cleanUsername,
            username: cleanUsername,
            country_region: cleanCountry,
            avatar_url: null,
          },
          { onConflict: "id" }
        );

        if (profileError) {
          const messageText = String(profileError.message || "").toLowerCase();
          if (!messageText.includes("column") && !messageText.includes("does not exist")) {
            setMessage(
              "Account created, but we could not save your profile yet. Please sign in again after email confirmation."
            );
            return;
          }
        }
      }

      if (!data.session) {
        savePendingEmailConfirmation({
          email: cleanEmail,
          nextPath: welcomeDestination,
          sentAt: Date.now(),
        });
        router.replace("/check-email");
        return;
      }

      router.replace(welcomeDestination);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#2f3a2f]">
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-14 lg:py-16">
        <aside className="order-2 rounded-[2rem] border border-[#dbe7d2] bg-[#edf4e9] p-6 shadow-[0_18px_40px_rgba(54,64,46,0.08)] sm:p-8 lg:order-1 lg:sticky lg:top-8">
          <div className="rounded-2xl border border-[#c9ddbd] bg-white/90 p-4 text-sm leading-6 text-[#536152]">
            <p className="font-semibold text-[#3f5138]">Your first 14 days include Premium access.</p>
            <p className="mt-1">No payment details are required. After the welcome period, your account automatically moves to Basic unless you choose Premium.</p>
          </div>
          <div className="inline-flex items-center rounded-full border border-[#cbdcc0] bg-white/80 px-4 py-2 text-sm font-semibold text-[#58734b] shadow-sm">
            Made for teachers
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Create your free teacher account
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[#536152]">
            Keep the vocabulary and activities you prepare, so each lesson takes less time to build next time.
          </p>

          <ul className="mt-8 space-y-4" aria-label="What your Classendo account includes">
            {[
              ["Unlimited teaching tools", "Use games, worksheets, printables and lesson plans from the same cards."],
              ["Save every lesson", "Organise and reuse your work in My Lessons whenever you are ready to teach."],
              ["More time for teaching", "Premium keeps your full lesson-building workflow ready for every class."],
            ].map(([title, description]) => (
              <li key={title} className="flex gap-4 rounded-2xl border border-white/80 bg-white/75 p-4">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[#7fa66d]" />
                <div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-[#5c665c]">{description}</p></div>
              </li>
            ))}
          </ul>
        </aside>

        <div className="order-1 lg:order-2">
          <div className="mx-auto max-w-2xl rounded-[2rem] border border-[#e2e6da] bg-white p-6 shadow-[0_18px_40px_rgba(54,64,46,0.10)] sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#6d8160]">Start free</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#2f3a2f] sm:text-4xl">
              Set up your Classendo account
            </h2>
            <p className="mt-3 text-base leading-7 text-[#5c665c]">
              It takes a moment. Confirm your email and your account will be ready for your first lesson.
            </p>

            <form onSubmit={handleSignup} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#2f3a2f]" htmlFor="signup-email">
                  Email address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  placeholder="teacher@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-2xl border border-[#dfe5d7] bg-[#fbfbf8] px-4 py-3 text-[#2f3a2f] outline-none transition focus:border-[#98b37d] focus:bg-white focus:shadow-[0_0_0_5px_rgba(134,169,106,0.12)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#2f3a2f]" htmlFor="signup-username">
                  Username
                </label>
                <input
                  id="signup-username"
                  type="text"
                  placeholder="classroom_teacher"
                  value={username}
                  onChange={(e) => {
                    setUsernameTouched(true);
                    setUsername(normalizeUsername(e.target.value));
                  }}
                  onBlur={() => setUsernameTouched(true)}
                  required
                  maxLength={24}
                  autoComplete="username"
                  className="w-full rounded-2xl border border-[#dfe5d7] bg-[#fbfbf8] px-4 py-3 text-[#2f3a2f] outline-none transition focus:border-[#98b37d] focus:bg-white focus:shadow-[0_0_0_5px_rgba(134,169,106,0.12)]"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                  <span className={`font-medium ${usernameState === "available" ? "text-[#6c8f58]" : usernameState === "taken" ? "text-[#b85f4a]" : "text-[#6b756b]"}`}>
                    {usernameHint || "We’ll suggest a username from your email."}
                  </span>
                  {usernameState === "available" && (
                    <button
                      type="button"
                      className="rounded-full bg-[#eef5e7] px-3 py-1 text-xs font-semibold text-[#6c8f58]"
                      onClick={() => setUsernameTouched(true)}
                    >
                      Available
                    </button>
                  )}
                </div>
                {!usernameTouched && emailSuggestion && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applySuggestion(emailSuggestion)}
                      className="rounded-full border border-[#dbe3d1] bg-[#f7faf4] px-3 py-1.5 text-xs font-semibold text-[#5c665c] transition hover:-translate-y-0.5 hover:bg-white"
                    >
                      Try {emailSuggestion}
                    </button>
                    {buildUsernameAlternatives(emailSuggestion).slice(0, 2).map((alt) => (
                      <button
                        key={alt}
                        type="button"
                        onClick={() => applySuggestion(alt)}
                        className="rounded-full border border-[#dbe3d1] bg-[#f7faf4] px-3 py-1.5 text-xs font-semibold text-[#5c665c] transition hover:-translate-y-0.5 hover:bg-white"
                      >
                        {alt}
                      </button>
                    ))}
                  </div>
                )}
                {usernameState === "taken" && usernameOptions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {usernameOptions.slice(0, 3).map((alt) => (
                      <button
                        key={alt}
                        type="button"
                        onClick={() => applySuggestion(alt)}
                        className="rounded-full border border-[#dbe3d1] bg-[#f7faf4] px-3 py-1.5 text-xs font-semibold text-[#5c665c] transition hover:-translate-y-0.5 hover:bg-white"
                      >
                        {alt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#2f3a2f]" htmlFor="signup-country">
                  Country or region
                </label>
                <select
                  id="signup-country"
                  value={countryRegion}
                  onChange={(e) => setCountryRegion(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-[#dfe5d7] bg-[#fbfbf8] px-4 py-3 text-[#2f3a2f] outline-none transition focus:border-[#98b37d] focus:bg-white focus:shadow-[0_0_0_5px_rgba(134,169,106,0.12)]"
                >
                  <option value="">Choose your country or region</option>
                  {countryOptions.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-sm leading-6 text-[#6b756b]">
                  This helps Classendo recommend vocabulary, spelling, and classroom content that better fits your students.
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-semibold text-[#2f3a2f]" htmlFor="signup-password">Password</label>
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="text-sm font-semibold text-[#5f7f4b] underline underline-offset-4 hover:text-[#4d6a3d]" aria-controls="signup-password" aria-pressed={showPassword}>
                    {showPassword ? "Hide" : "Show"} password
                  </button>
                </div>
                <input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  aria-describedby="signup-password-help"
                  className="w-full rounded-2xl border border-[#dfe5d7] bg-[#fbfbf8] px-4 py-3 text-[#2f3a2f] outline-none transition focus:border-[#98b37d] focus:bg-white focus:shadow-[0_0_0_5px_rgba(134,169,106,0.12)]"
                />
                <p id="signup-password-help" className="mt-2 text-sm leading-6 text-[#6b756b]">Use at least 6 characters. Choose a password you can keep for Classendo.</p>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#dfe5d7] bg-[#fbfbf8] p-4 text-sm leading-6 text-[#566056]">
                <input
                  type="checkbox"
                  checked={legalAccepted}
                  onChange={(event) => setLegalAccepted(event.target.checked)}
                  required
                  className="mt-1 h-4 w-4 shrink-0 accent-[#6c8f58]"
                />
                <span>
                  I confirm that I am at least 18 and agree to the{" "}
                  <Link href="/legal/terms" target="_blank" className="font-semibold underline underline-offset-4">Terms of Service</Link>
                  {" "}and{" "}
                  <Link href="/legal/refunds" target="_blank" className="font-semibold underline underline-offset-4">Cancellation and Refund Policy</Link>.
                  I acknowledge the{" "}
                  <Link href="/legal/privacy" target="_blank" className="font-semibold underline underline-offset-4">Privacy Notice</Link>.
                </span>
              </label>

              <p className="text-sm leading-6 text-[#6b756b]">Classendo accounts are for adult teachers. We use your email for your account, security, and essential Classendo messages. Do not upload identifiable or sensitive pupil information.</p>

              {message && (
                <p role="status" aria-live="polite" className="rounded-2xl border border-[#dbe3d1] bg-[#f7faf4] px-4 py-3 text-sm leading-6 text-[#4c5f49]">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary w-full px-6 py-4 text-base disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating account..." : "Create free account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#5c665c]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#6c8f58] underline underline-offset-4 hover:text-[#5f7f4b]"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
