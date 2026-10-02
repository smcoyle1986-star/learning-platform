import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

const MIN_ACCOUNT_AGE_DAYS = 30;
const SOURCE = "daily_unverified_cleanup";
const CONTENT_TABLES = ["lesson_sets", "worksheets", "creator_images", "game_prompt_sets"] as const;

function isoOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
}

function latestDate(values: unknown[]) {
  const dates = values.map(isoOrNull).filter((value): value is string => Boolean(value));
  return dates.sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000);
}

export async function runUnverifiedAccountCleanup() {
  try {
    const supabase = getSupabaseAdmin();
    const now = Date.now();
    const threshold = now - MIN_ACCOUNT_AGE_DAYS * 24 * 60 * 60 * 1000;
    const thresholdIso = new Date(threshold).toISOString();
    let page = 1;
    let deleted = 0;
    let kept = 0;

    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
      if (error || !data) throw error ?? new Error("Could not determine Auth users.");
      const users = data.users ?? [];

      for (const user of users) {
        const createdAt = isoOrNull(user.created_at);
        if (!createdAt || Date.parse(createdAt) > threshold) continue;

        // Require positive, matching evidence that both Auth and Classendo still
        // consider this email unverified. A missing row is uncertainty.
        const { data: verification, error: verificationError } = await supabase
          .from("classendo_email_verifications")
          .select("verified_at")
          .eq("user_id", user.id)
          .maybeSingle();
        if (verificationError || !verification || user.email_confirmed_at || verification.verified_at) {
          kept += 1;
          continue;
        }

        const contentResults = await Promise.all(CONTENT_TABLES.map((table) =>
          supabase.from(table).select("id", { count: "exact", head: true }).eq("user_id", user.id),
        ));
        if (contentResults.some((result) => result.error || typeof result.count !== "number" || result.count < 0)) {
          kept += 1;
          continue;
        }
        const contentChecks = Object.fromEntries(CONTENT_TABLES.map((table, index) => [table, contentResults[index].count]));
        if (Object.values(contentChecks).some((count) => (count ?? 0) > 0)) {
          kept += 1;
          continue;
        }

        const [{ data: lifecycle, error: lifecycleError }, { data: analytics, error: analyticsError }] = await Promise.all([
          supabase.from("analytics_lifecycle_events").select("created_at").eq("user_id", user.id).gte("created_at", thresholdIso).limit(1),
          supabase.from("analytics_events").select("created_at").eq("user_id", user.id).gte("created_at", thresholdIso).limit(1),
        ]);
        if (lifecycleError || analyticsError) {
          kept += 1;
          continue;
        }

        const lastKnownActivity = latestDate([
          user.last_sign_in_at,
          ...(lifecycle ?? []).map((event) => event.created_at),
          ...(analytics ?? []).map((event) => event.created_at),
        ]);
        // Existing session and analytics events are consent-gated. Their absence
        // cannot prove inactivity, so zero rows is explicitly treated as unknown.
        const activityStatus = lastKnownActivity && Date.parse(lastKnownActivity) > threshold ? "active" : "unknown";
        const decision = decideUnverifiedAccountCleanup({
          createdAt,
          now,
          verified: false,
          contentCounts: contentChecks as Record<string, number>,
          contentChecksCertain: true,
          activityStatus,
        });
        if (decision !== "delete") {
          kept += 1;
          continue;
        }

        // The policy helper currently has no way to produce a positive inactive
        // result from consent-gated telemetry. Keep this guard at the side-effect
        // boundary so future edits cannot accidentally turn unknown into delete.
        if (activityStatus !== "inactive") {
          kept += 1;
          continue;
        }

        const { data: audit, error: auditError } = await supabase.from("auth_user_cleanup_audit").insert({
          user_id: user.id,
          email: user.email ?? null,
          created_at: createdAt,
          last_known_activity_at: lastKnownActivity,
          verification_status: "unverified",
          content_checks: contentChecks,
          deletion_reason: "Unverified account at least 30 days old with no saved content and confirmed inactivity.",
          source: SOURCE,
          result: "pending",
        }).select("id").single();
        if (auditError || !audit?.id) throw auditError ?? new Error("Could not create deletion audit record.");

        let deleteError: unknown = null;
        try {
          const result = await supabase.auth.admin.deleteUser(user.id, false);
          deleteError = result.error;
        } catch (error) {
          deleteError = error;
        }
        if (deleteError) {
          const { error: auditUpdateError } = await supabase.from("auth_user_cleanup_audit").update({
            result: "failed",
            result_at: new Date().toISOString(),
            error_message: errorText(deleteError),
          }).eq("id", audit.id);
          if (auditUpdateError) console.error("Could not record auth deletion failure:", auditUpdateError);
          throw deleteError;
        }

        const { error: auditUpdateError } = await supabase.from("auth_user_cleanup_audit").update({
          result: "succeeded",
          result_at: new Date().toISOString(),
        }).eq("id", audit.id);
        if (auditUpdateError) {
          console.error("Auth user was deleted but cleanup audit result could not be updated:", { auditId: audit.id, userId: user.id, auditUpdateError });
          throw auditUpdateError;
        }
        deleted += 1;
      }

      if (users.length < 100) break;
      page += 1;
    }
    return { deleted, kept, minimumAgeDays: MIN_ACCOUNT_AGE_DAYS };
  } catch (error) {
    console.error("Unverified-account cleanup failed:", error);
    throw error;
  }
}
