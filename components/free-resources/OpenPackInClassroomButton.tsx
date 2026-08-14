"use client";

import { Presentation } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/AuthProvider";
import { writeLessonTray } from "@/lib/lessons/tray";
import type { LessonCard } from "@/lib/lessons/types";

type PackCard = Omit<LessonCard, "position">;

export function OpenPackInClassroomButton({
  cards,
  description,
}: {
  cards: PackCard[];
  description: string;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  function openClassroom() {
    if (loading) return;
    writeLessonTray(
      cards.map((card, position) => ({ ...card, position })),
      user ? "account" : "guest",
    );
    router.push("/flashcards/classroom?from=free-resource");
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#d7e4cf] bg-[#f3f8f0] p-4">
      <button
        type="button"
        onClick={openClassroom}
        disabled={loading}
        className="btn btn-secondary border-[#9fbc91] bg-white px-5 py-2.5 text-sm text-[#40543a] hover:bg-[#edf5e9] disabled:cursor-wait disabled:opacity-60"
      >
        <Presentation size={18} />
        {loading ? "Loading…" : "Open this set in Classroom"}
      </button>
      <p className="max-w-xl text-sm leading-6 text-[#5b6957]">{description}</p>
    </div>
  );
}
