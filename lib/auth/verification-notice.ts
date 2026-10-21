export type VerificationSendOutcome = {
  verified: boolean;
  message: string;
};

export function verificationSendOutcome(responseOk: boolean, result: unknown): VerificationSendOutcome {
  const payload = typeof result === "object" && result !== null
    ? result as { verified?: unknown; sent?: unknown; error?: unknown }
    : null;

  if (responseOk && payload?.verified === true) {
    return { verified: true, message: "Your email is already verified." };
  }
  if (responseOk && payload?.sent === true) {
    return { verified: false, message: "Verification email sent. Check your inbox." };
  }
  if (!responseOk) {
    return {
      verified: false,
      message: typeof payload?.error === "string" ? payload.error : "Could not send email. Please try again.",
    };
  }
  return { verified: false, message: "We couldn't confirm that an email was sent. Please try again." };
}
