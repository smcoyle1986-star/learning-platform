"use client";
import { Presentation } from "lucide-react";
import { useRouter } from "next/navigation";
import { writeLessonTray } from "@/lib/lessons/tray";
const cards = [
  ["apple", "4602822b-bde8-4c62-8167-6226afd351f7"], ["banana", "901cb73f-ebe8-432c-b068-8e89b195395c"], ["bread", "dc1838a6-a1d5-434a-bab7-7abc0976f8d0"], ["cheese", "62df7251-53bf-4b39-bd36-6a0fed1bc6c8"], ["pizza", "ca714725-767e-403b-8f5b-8a43cd6aab95"], ["rice", "d654d89c-23e7-4349-ac93-019b8f2ebdd8"],
].map(([word, id], position) => ({ id, word, image: `/resources/food-vocabulary-beginner-esl/${word}.png`, back: `/resources/food-vocabulary-beginner-esl/${word}.png`, position, type: "noun" }));
export default function FoodClassroomButton() { const router = useRouter(); return <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#d7e4cf] bg-[#f3f8f0] p-4"><button type="button" onClick={() => { writeLessonTray(cards, "guest"); router.push("/flashcards/classroom?from=free-resource"); }} className="btn btn-secondary border-[#9fbc91] bg-white px-5 py-2.5 text-sm text-[#40543a] hover:bg-[#edf5e9]"><Presentation size={18} />Open this set in Classroom</button><p className="max-w-xl text-sm leading-6 text-[#5b6957]">Present all six food cards full-screen, move through them at your pace, and annotate directly over the cards while you teach.</p></div>; }
