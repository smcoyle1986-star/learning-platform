"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase/client";

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

type Props = {
  initialAssuranceLevel: "aal1" | "aal2" | null;
};

export function AdminMfaSetup({ initialAssuranceLevel }: Props) {
  const [assuranceLevel, setAssuranceLevel] = useState(initialAssuranceLevel);
  const [verifiedFactorId, setVerifiedFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadFactors() {
      const { data, error } = await supabase.auth.mfa.listFactors();

      if (!active) return;

      if (error) {
        setMessage(error.message);
      } else {
        setVerifiedFactorId(data.totp[0]?.id ?? null);
      }

      setLoading(false);
    }

    void loadFactors();

    return () => {
      active = false;
    };
  }, []);

  async function beginEnrollment() {
    setMessage("");
    setSubmitting(true);

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Classendo owner",
      issuer: "Classendo",
    });

    if (error) {
      setMessage(error.message);
    } else {
      const qrCode = data.totp.qr_code.startsWith("data:")
        ? data.totp.qr_code
        : `data:image/svg+xml;utf-8,${encodeURIComponent(data.totp.qr_code)}`;

      setEnrollment({
        factorId: data.id,
        qrCode,
        secret: data.totp.secret,
      });
    }

    setSubmitting(false);
  }

  async function verifyCode() {
    const factorId = enrollment?.factorId ?? verifiedFactorId;
    if (!factorId || !/^\d{6}$/.test(code)) {
      setMessage("Enter the six-digit code from your authenticator app.");
      return;
    }

    setMessage("");
    setSubmitting(true);

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId,
      code,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setVerifiedFactorId(factorId);
      setEnrollment(null);
      setCode("");
      setAssuranceLevel("aal2");
      setMessage("Authenticator verified. This session now has elevated assurance.");
    }

    setSubmitting(false);
  }

  if (loading) {
    return (
      <div className="mt-8 rounded-3xl border border-[#dde3d6] bg-white p-6">
        Checking authenticator status…
      </div>
    );
  }

  const hasVerifiedFactor = Boolean(verifiedFactorId);
  const needsSessionVerification =
    hasVerifiedFactor && assuranceLevel !== "aal2";

  return (
    <div className="mt-8 rounded-3xl border border-[#dde3d6] bg-white p-6 shadow-[0_12px_30px_rgba(54,64,46,0.06)]">
      <div className="flex items-start justify-between gap-5">
        <div>
          <h2 className="text-xl font-semibold">Authenticator app</h2>
          <p className="mt-2 text-sm leading-6 text-[#687268]">
            {hasVerifiedFactor
              ? assuranceLevel === "aal2"
                ? "MFA is enabled and verified for this session."
                : "MFA is enabled. Verify a code to elevate this session."
              : "No verified authenticator is attached to this account yet."}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            hasVerifiedFactor
              ? "bg-[#edf4e8] text-[#58704d]"
              : "bg-[#f4eee8] text-[#8a654f]"
          }`}
        >
          {hasVerifiedFactor ? "Enabled" : "Not enabled"}
        </span>
      </div>

      {!hasVerifiedFactor && !enrollment && (
        <button
          type="button"
          onClick={beginEnrollment}
          disabled={submitting}
          className="btn btn-primary mt-6 px-5 py-3 disabled:opacity-60"
        >
          {submitting ? "Preparing…" : "Set up authenticator"}
        </button>
      )}

      {enrollment && (
        <div className="mt-6 border-t border-[#e3e7df] pt-6">
          <p className="font-semibold">1. Scan this QR code</p>
          <div className="mt-4 inline-flex rounded-2xl border border-[#dde3d6] bg-white p-3">
            <Image
              src={enrollment.qrCode}
              alt="Classendo authenticator enrollment QR code"
              width={208}
              height={208}
              unoptimized
            />
          </div>
          <p className="mt-4 text-sm text-[#687268]">
            Manual key:{" "}
            <code className="break-all rounded bg-[#f2f4ef] px-2 py-1 text-[#3f493f]">
              {enrollment.secret}
            </code>
          </p>
        </div>
      )}

      {(enrollment || needsSessionVerification) && (
        <div className="mt-6 border-t border-[#e3e7df] pt-6">
          <label htmlFor="mfa-code" className="block font-semibold">
            {enrollment ? "2. Verify enrollment" : "Verify this session"}
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="mfa-code"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              className="w-full rounded-xl border border-[#d9dfd2] px-4 py-3 tracking-[0.3em] outline-none focus:border-[#8daa78] sm:max-w-[12rem]"
            />
            <button
              type="button"
              onClick={verifyCode}
              disabled={submitting || code.length !== 6}
              className="btn btn-primary px-5 py-3 disabled:opacity-60"
            >
              {submitting ? "Verifying…" : "Verify code"}
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          aria-live="polite"
          className="mt-5 rounded-xl bg-[#f3f6f0] px-4 py-3 text-sm text-[#53604f]"
        >
          {message}
        </p>
      )}
    </div>
  );
}
