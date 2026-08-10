"use client";

import { Presentation } from "lucide-react";
import { useRouter } from "next/navigation";
import { writeLessonTray } from "@/lib/lessons/tray";

const animals = [
  { id: "bfb2264c-3e72-470a-9f77-8b54d153f89a", word: "dog" },
  { id: "13ae6973-3cc1-48c4-a10c-3d871716b215", word: "cat" },
  { id: "93d255ef-0ce8-4c8f-868b-37d4a71fd196", word: "bird" },
  { id: "f35bdf1a-2e85-46dd-8017-340a1b594053", word: "fish" },
  { id: "3b700e9c-08d1-4587-bb46-4b9e77ef0a93", word: "rabbit" },
  { id: "b2f0e90a-bdfa-4444-8a78-0ad7da819ddf", word: "lion" },
].map((card, position) => ({
  ...card,
  image: `/resources/animals-vocabulary-beginner-esl/${card.word}.png`,
  back: `/resources/animals-vocabulary-beginner-esl/${card.word}.png`,
  position,
  type: "noun",
}));

export default function AnimalsClassroomButton() {
  const router = useRouter();

  function openClassroom() {
    writeLessonTray(animals, "guest");
    router.push("/flashcards/classroom?from=free-resource");
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#d7e4cf] bg-[#f3f8f0] p-4">
      <button type="button" onClick={openClassroom} className="btn btn-secondary border-[#9fbc91] bg-white px-5 py-2.5 text-sm text-[#40543a] hover:bg-[#edf5e9]">
        <Presentation size={18} />Open this set in Classroom
      </button>
      <p className="max-w-xl text-sm leading-6 text-[#5b6957]">Present all six cards full-screen, move through them at your pace, and annotate directly over the cards while you teach.</p>
    </div>
  );
}
