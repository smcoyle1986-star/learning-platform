import { OpenPackInClassroomButton } from "@/components/free-resources/OpenPackInClassroomButton";

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
  return <OpenPackInClassroomButton cards={animals} description="Present all six cards full-screen, move through them at your pace, and annotate directly over the cards while you teach." />;
}
