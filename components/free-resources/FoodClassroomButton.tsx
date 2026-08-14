import { OpenPackInClassroomButton } from "@/components/free-resources/OpenPackInClassroomButton";
const cards = [
  ["apple", "4602822b-bde8-4c62-8167-6226afd351f7"], ["banana", "901cb73f-ebe8-432c-b068-8e89b195395c"], ["bread", "dc1838a6-a1d5-434a-bab7-7abc0976f8d0"], ["cheese", "62df7251-53bf-4b39-bd36-6a0fed1bc6c8"], ["pizza", "ca714725-767e-403b-8f5b-8a43cd6aab95"], ["rice", "d654d89c-23e7-4349-ac93-019b8f2ebdd8"],
].map(([word, id], position) => ({ id, word, image: `/resources/food-vocabulary-beginner-esl/${word}.png`, back: `/resources/food-vocabulary-beginner-esl/${word}.png`, position, type: "noun" }));
export default function FoodClassroomButton() { return <OpenPackInClassroomButton cards={cards} description="Present all six food cards full-screen, move through them at your pace, and annotate directly over the cards while you teach." />; }
