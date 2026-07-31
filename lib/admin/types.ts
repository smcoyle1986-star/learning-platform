export const ADMIN_ROLES = ["owner", "admin", "moderator"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export type AdminContext = {
  userId: string;
  email: string | null;
  role: AdminRole;
  assuranceLevel: "aal1" | "aal2" | null;
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string"
    && ADMIN_ROLES.includes(value as AdminRole);
}
