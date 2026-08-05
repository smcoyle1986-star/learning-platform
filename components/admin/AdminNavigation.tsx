"use client";

import {
  BarChart3,
  BookOpenText,
  CreditCard,
  HeartHandshake,
  Images,
  LayoutDashboard,
  Library,
  LockKeyhole,
  MessageSquareText,
  Settings,
  ShieldAlert,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const primaryItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard, available: true },
  { label: "Users", href: "/admin/users", icon: Users, available: true },
  { label: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard, available: true },
  { label: "Feedback", href: "/admin/feedback", icon: MessageSquareText, available: true },
  { label: "Community", href: "/admin/community", icon: ShieldAlert, available: true },
  { label: "Creator", href: "/admin/creator", icon: Images, available: false },
  { label: "Content", href: "/admin/content", icon: Library, available: true },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3, available: false },
  { label: "Supporters", href: "/admin/supporters", icon: HeartHandshake, available: false },
  { label: "Settings", href: "/admin/settings", icon: Settings, available: false },
] as const;

export function AdminNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Administrator navigation">
      <p className="px-3 text-[0.68rem] font-bold uppercase tracking-[0.2em] text-[#899287]">
        Workspace
      </p>
      <ul className="mt-3 flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1 lg:overflow-visible lg:pb-0">
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/admin"
              ? pathname === item.href
              : pathname.startsWith(item.href);
          const className = `flex min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            active
              ? "bg-[#e7f0e0] text-[#47633c]"
              : "text-[#677167] hover:bg-[#f0f3ed] hover:text-[#364136]"
          }`;

          return (
            <li key={item.href}>
              {item.available ? (
                <Link
                  href={item.href}
                  className={className}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon aria-hidden="true" className="h-[1.1rem] w-[1.1rem]" />
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className={`${className} cursor-not-allowed opacity-55`}
                  aria-disabled="true"
                  title={`${item.label} is planned for a later phase`}
                >
                  <Icon aria-hidden="true" className="h-[1.1rem] w-[1.1rem]" />
                  <span>{item.label}</span>
                  <span className="ml-auto rounded-full bg-[#e8ebe5] px-2 py-0.5 text-[0.62rem] uppercase tracking-wide text-[#7b8479]">
                    Soon
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-5 border-t border-[#e2e6df] pt-5 lg:mt-7">
        <Link
          href="/admin/security"
          className={`flex min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
            pathname === "/admin/security"
              ? "bg-[#e7f0e0] text-[#47633c]"
              : "text-[#677167] hover:bg-[#f0f3ed] hover:text-[#364136]"
          }`}
          aria-current={pathname === "/admin/security" ? "page" : undefined}
        >
          <LockKeyhole aria-hidden="true" className="h-[1.1rem] w-[1.1rem]" />
          Owner security
        </Link>
        <Link
          href="/"
          className="mt-1 flex min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#677167] transition hover:bg-[#f0f3ed] hover:text-[#364136]"
        >
          <BookOpenText aria-hidden="true" className="h-[1.1rem] w-[1.1rem]" />
          Back to Classendo
        </Link>
      </div>
    </nav>
  );
}
