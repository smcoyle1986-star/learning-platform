"use client";

import { Presentation } from "lucide-react";
import { useRouter } from "next/navigation";
import { writeLessonTray } from "@/lib/lessons/tray";

type Card = { id: string; word: string };

export default function BeginnerPackClassroomButton({ cards, assetPath, cardType = "noun" }: { cards: Card[]; assetPath: string; cardType?: "noun" | "verb" }) {
  const router = useRouter();
  return <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#d7e4cf] bg-[#f3f8f0] p-4"><button type="button" onClick={() => { writeLessonTray(cards.map((card, position) => ({ ...card, image: `${assetPath}/${card.word.replaceAll(" ", "-")}.png`, back: `${assetPath}/${card.word.replaceAll(" ", "-")}.png`, position, type: cardType })), "guest"); router.push("/flashcards/classroom?from=free-resource"); }} className="btn btn-secondary border-[#9fbc91] bg-white px-5 py-2.5 text-sm text-[#40543a] hover:bg-[#edf5e9]"><Presentation size={18} />Open this set in Classroom</button><p className="max-w-xl text-sm leading-6 text-[#5b6957]">Present all six cards full-screen, move through them at your pace, and annotate directly over the cards while you teach.</p></div>;
}
