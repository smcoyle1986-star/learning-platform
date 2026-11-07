import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { NextRequest, NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";
import { GUEST_EXIT_RECEIPT_LIFETIME_MS, guestExitSignupIsAttributable } from "@/lib/analytics/guest-exit-eligibility";

export const GUEST_EXIT_COOKIE = "classendo-guest-exit-signup";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function receiptHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function clearGuestExitReceipt(response: NextResponse) {
  response.cookies.set(GUEST_EXIT_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
}

export async function issueGuestExitReceipt(input: {
  response: NextResponse;
  clickEventId: string;
  gameKey: string;
  anonymousId: string;
  sessionKey: string;
}) {
  const receipt = randomUUID();
  const { error } = await getSupabaseAdmin().from("guest_exit_signup_journeys").insert({
    receipt_hash: receiptHash(receipt),
    click_event_id: input.clickEventId,
    game_key: input.gameKey,
    anonymous_id: input.anonymousId,
    session_key: input.sessionKey,
  });
  if (error) throw error;
  input.response.cookies.set(GUEST_EXIT_COOKIE, receipt, {
    path: "/", maxAge: GUEST_EXIT_RECEIPT_LIFETIME_MS / 1000,
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production",
  });
}

export async function findGuestExitReceipt(request: NextRequest) {
  const receipt = request.cookies.get(GUEST_EXIT_COOKIE)?.value ?? "";
  if (!UUID.test(receipt)) return null;
  const { data, error } = await getSupabaseAdmin().from("guest_exit_signup_journeys")
    .select("receipt_hash,game_key,anonymous_id,session_key,clicked_at,arrived_at,user_id")
    .eq("receipt_hash", receiptHash(receipt)).maybeSingle();
  if (error) throw error;
  if (!data || Date.now() - new Date(data.clicked_at).getTime() > GUEST_EXIT_RECEIPT_LIFETIME_MS) return null;
  return data;
}

export async function attributeGuestExitSignup(request: NextRequest, userId: string, accountCreatedAt: string, sessionKey: unknown, anonymousId: unknown) {
  const receipt = await findGuestExitReceipt(request);
  if (!receipt || !guestExitSignupIsAttributable({
    clickedAt: receipt.clicked_at, arrivedAt: receipt.arrived_at,
    existingUserId: receipt.user_id, sessionKey: receipt.session_key,
    anonymousId: receipt.anonymous_id,
  }, { sessionKey, anonymousId }, accountCreatedAt, Date.now())) return false;
  const { data, error } = await getSupabaseAdmin().from("guest_exit_signup_journeys")
    .update({ user_id: userId, signed_up_at: accountCreatedAt })
    .eq("receipt_hash", receipt.receipt_hash).is("user_id", null)
    .select("receipt_hash").maybeSingle();
  if (error) throw error;
  return Boolean(data);
}
