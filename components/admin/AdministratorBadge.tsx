import { ShieldCheck } from "lucide-react";

type AdministratorRole = "owner" | "admin" | "moderator";

const TITLES: Record<AdministratorRole, string> = {
  owner: "Owner Administrator",
  admin: "Administrator",
  moderator: "Community Moderator",
};

export function administratorTitle(role: AdministratorRole | null | undefined) {
  return role ? TITLES[role] : null;
}

export function AdministratorBadge({
  role,
  compact = false,
}: {
  role: AdministratorRole;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-[#9eb494] bg-[linear-gradient(135deg,#edf6e8,#dcebd4)] font-bold uppercase text-[#426137] shadow-[0_6px_16px_rgba(86,118,72,0.16)] ${
        compact
          ? "gap-1 px-2 py-0.5 text-[0.62rem] tracking-[0.12em]"
          : "gap-1.5 px-3 py-1 text-[0.68rem] tracking-[0.15em]"
      }`}
      title={TITLES[role]}
    >
      <ShieldCheck aria-hidden="true" className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {TITLES[role]}
    </span>
  );
}
