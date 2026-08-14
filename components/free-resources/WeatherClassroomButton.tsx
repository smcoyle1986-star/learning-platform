import { OpenPackInClassroomButton } from "@/components/free-resources/OpenPackInClassroomButton";

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
  return <OpenPackInClassroomButton cards={weather} description="Present all six weather cards full-screen, move through them at your pace, and annotate directly over the cards while you teach." />;
}
