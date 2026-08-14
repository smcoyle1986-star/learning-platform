import { OpenPackInClassroomButton } from "@/components/free-resources/OpenPackInClassroomButton";

type Card = { id: string; word: string; type?: "noun" | "verb" | "adjective" | "preposition" };

export default function BeginnerPackClassroomButton({ cards, assetPath, cardType = "noun" }: { cards: Card[]; assetPath: string; cardType?: "noun" | "verb" | "adjective" | "preposition" }) {
  return (
    <OpenPackInClassroomButton
      cards={cards.map((card) => ({
        ...card,
        image: `${assetPath}/${card.word.replaceAll(" ", "-")}.png`,
        back: `${assetPath}/${card.word.replaceAll(" ", "-")}.png`,
        type: card.type ?? cardType,
      }))}
      description="Present all six cards full-screen, move through them at your pace, and annotate directly over the cards while you teach."
    />
  );
}
