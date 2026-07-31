import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";

import { isAdminRole, type AdminContext } from "./types";

export class AdminAuthorizationError extends Error {
  constructor(
    public readonly status: 401 | 403 | 503,
    public readonly code:
      | "not_authenticated"
      | "not_an_administrator"
      | "owner_required"
      | "mfa_required"
      | "authorization_unavailable",
  ) {
    super(code);
    this.name = "AdminAuthorizationError";
  }
}

export async function getAdminContext(): Promise<AdminContext> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new AdminAuthorizationError(401, "not_authenticated");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("admin_memberships")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    throw new AdminAuthorizationError(503, "authorization_unavailable");
  }

  if (!membership || !isAdminRole(membership.role)) {
    throw new AdminAuthorizationError(403, "not_an_administrator");
  }

  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (assuranceError) {
    throw new AdminAuthorizationError(503, "authorization_unavailable");
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    role: membership.role,
    assuranceLevel: assurance.currentLevel,
  };
}

export async function requireAdmin() {
  return getAdminContext();
}

export async function requireOwner(options: { requireMfa?: boolean } = {}) {
  const context = await getAdminContext();

  if (context.role !== "owner") {
    throw new AdminAuthorizationError(403, "owner_required");
  }

  if (options.requireMfa && context.assuranceLevel !== "aal2") {
    throw new AdminAuthorizationError(403, "mfa_required");
  }

  return context;
}
