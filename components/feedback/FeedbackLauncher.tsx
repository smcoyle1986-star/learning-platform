"use client";

import { MessageSquareText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";

export function FeedbackLauncher() {
  const pathname = usePathname();
  const { user, loading } = useAuth();

  if (loading || !user || pathname.startsWith("/feedback") || pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <Link
      href="/feedback"
      className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full border border-[#cfdcc8] bg-white px-4 py-2.5 text-sm font-semibold text-[#506a47] shadow-[0_12px_30px_rgba(48,65,43,0.16)] transition hover:-translate-y-0.5 hover:bg-[#f7faf5]"
    >
      <MessageSquareText aria-hidden="true" className="h-4 w-4" />
      Feedback
    </Link>
  );
}
