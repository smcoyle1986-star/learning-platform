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

type UsernameState = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

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

function LandingInfoImage({
  path,
  alt,
  caption,
}: {
  path: string;
  alt: string;
  caption: string;
}) {
  return (
    <figure className="overflow-hidden rounded-[1.75rem] bg-transparent">
      <img
        src={`/api/landing-image?path=${encodeURIComponent(path)}`}
        alt={alt}
        className="block w-full h-full object-contain"
        style={{ maxHeight: "420px" }}
        loading="lazy"
        decoding="async"
      />
      <figcaption className="px-2 pt-3 text-sm text-[#5c665c]">
        {caption}
      </figcaption>
    </figure>
  );
}

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
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/`,
          data: {
            username: cleanUsername,
            country_region: cleanCountry,
          },
        },
      });

      if (error) {
        setMessage(`Error: ${error.message}`);
        return;
      }

      if (!data.user) {
        setMessage("We could not finish creating your account just now. Please try again.");
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

      setMessage("Signup successful! Check your email for confirmation.");
      router.replace("/?signed_up=1");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f6f2] text-[#2f3a2f]">
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:py-14">
        <div className="space-y-8">
          <div className="inline-flex items-center rounded-full border border-[#dbe3d1] bg-white px-4 py-2 text-sm font-semibold text-[#6d8160] shadow-sm">
            Create your account
          </div>

          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold tracking-tight text-[#2f3a2f] md:text-6xl">
              Create your FREE Classendo account
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#5c665c]">
              Build lesson sets, save your resources, and reuse them across flashcards, games, worksheets, and lesson plans.
            </p>
          </div>

          <div className="grid gap-8">
            <LandingInfoImage
              path="classendo-images/information/resources.png"
              alt="Classendo resources for every lesson and learner"
              caption="Resources and ready-made materials for your lessons."
            />
            <LandingInfoImage
              path="classendo-images/information/pricing.png"
              alt="Classendo premium monthly and yearly pricing"
              caption="Start free, then upgrade when you need more."
            />
            <div className="flex flex-wrap gap-3">
              <Link href="/upgrade" className="btn btn-primary px-6 py-3">
                Go Premium
              </Link>
              <Link href="/upgrade" className="btn btn-secondary px-6 py-3">
                View Pricing
              </Link>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[#e5e8de] bg-white/70 px-6 py-5 shadow-[0_14px_30px_rgba(54,64,46,0.06)]">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#6d8160]">
              Why teachers sign up
            </p>
            <ul className="mt-4 space-y-3 text-base leading-7 text-[#5c665c]">
              <li>• Create flashcards from your lesson tray.</li>
              <li>• Turn the same cards into games, worksheets, and printables.</li>
              <li>• Save your sets and return to them later from your dashboard.</li>
            </ul>
          </div>
        </div>

        <div className="lg:sticky lg:top-8">
          <div className="rounded-[2rem] border border-[#e2e6da] bg-white p-6 shadow-[0_18px_40px_rgba(54,64,46,0.10)] md:p-8">
            <h2 className="text-3xl font-semibold text-[#2f3a2f]">
              Create your free account
            </h2>
            <p className="mt-3 text-base leading-7 text-[#5c665c]">
              Use one account to save lessons, build activities, and move quickly between flashcards, games, worksheets, and lesson plans.
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
                <label className="mb-2 block text-sm font-semibold text-[#2f3a2f]" htmlFor="signup-password">
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-2xl border border-[#dfe5d7] bg-[#fbfbf8] px-4 py-3 text-[#2f3a2f] outline-none transition focus:border-[#98b37d] focus:bg-white focus:shadow-[0_0_0_5px_rgba(134,169,106,0.12)]"
                />
                <p className="mt-2 text-sm leading-6 text-[#6b756b]">
                  Use the password you’ll keep for Classendo.
                </p>
              </div>

              {message && (
                <p className="rounded-2xl border border-[#dbe3d1] bg-[#f7faf4] px-4 py-3 text-sm leading-6 text-[#4c5f49]">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary w-full px-6 py-4 text-base disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating account..." : "Create account"}
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
