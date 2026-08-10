"use client";

import { Presentation } from "lucide-react";
import { useRouter } from "next/navigation";
import { writeLessonTray } from "@/lib/lessons/tray";

const weather = [
  { id: "fee72921-5687-4a76-91d4-84d2572afdca", word: "sunny" },
  { id: "e7a09389-4a47-4c51-9a76-8118c61663b2", word: "cloudy" },
  { id: "25fa8ba2-e9c5-4520-b333-bd79aa9baac3", word: "raining" },
  { id: "c9ae1586-60de-4cf5-af16-4b82e057c623", word: "snowing" },
  { id: "9d6cca3c-a418-4e17-99db-d520974df84e", word: "windy" },
  { id: "ce6ac99f-16c0-40da-8d77-2c151b3f3664", word: "stormy" },
].map((card, position) => ({
  ...card,
  image: `/resources/weather-vocabulary-beginner-esl/${card.word}.png`,
  back: `/resources/weather-vocabulary-beginner-esl/${card.word}.png`,
  position,
  type: "noun",
}));

export default function WeatherClassroomButton() {
  const router = useRouter();

  function openClassroom() {
    writeLessonTray(weather, "guest");
    router.push("/flashcards/classroom?from=free-resource");
  }

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#d7e4cf] bg-[#f3f8f0] p-4">
      <button type="button" onClick={openClassroom} className="btn btn-secondary border-[#9fbc91] bg-white px-5 py-2.5 text-sm text-[#40543a] hover:bg-[#edf5e9]">
        <Presentation size={18} />Open this set in Classroom
      </button>
      <p className="max-w-xl text-sm leading-6 text-[#5b6957]">Present all six weather cards full-screen, move through them at your pace, and annotate directly over the cards while you teach.</p>
    </div>
  );
}
