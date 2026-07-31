import "server-only";

import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

export async function writeAdminAuditLog(params: {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  beforeState?: unknown;
  afterState?: unknown;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await getSupabaseAdmin().from("admin_audit_logs").insert({
    actor_user_id: params.actorUserId,
    action: params.action,
    target_type: params.targetType,
    target_id: params.targetId ?? null,
    before_state: params.beforeState ?? null,
    after_state: params.afterState ?? null,
    metadata: params.metadata ?? {},
  });

  if (error) {
    throw new Error(`Could not write administrator audit log: ${error.message}`);
  }
}
