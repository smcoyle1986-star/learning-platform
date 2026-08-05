import { createPrivateMetadata } from "@/lib/seo/page-content";

export const GAME_CONTENT = {
  "image-reveal": {
    title: "Image Reveal Classroom Game",
    description: "Slowly reveal a hidden vocabulary image while students compete to identify it. Adjust the teams and reveal tiles at your own pace for whole-class review.",
  },
  kaboom: {
    title: "KaBoom Classroom Game",
    description: "Students choose tiles, answer vocabulary questions, and collect points while trying to avoid hidden bombs. KaBoom turns a Classendo lesson set into a fast-paced team challenge.",
  },
  "spin-and-speak": {
    title: "Spin and Speak Classroom Game",
    description: "Spin the wheel to choose a vocabulary card or speaking prompt for the class. Use it for quick reviews, warm-ups, sentence practice, and spontaneous speaking activities.",
  },
  "yes-or-no": {
    title: "Yes or No Classroom Game",
    description: "Present quick questions and ask students to choose between yes and no. Use classroom sides, teams, and selected vocabulary to create an active decision-making game.",
  },
  "four-corners": {
    title: "Four Corners Classroom Game",
    description: "Assign answers or vocabulary choices to four areas of the classroom. Students move to the corner that matches their answer for an active whole-class review.",
  },
  "memory-flip": {
    title: "Memory Flip Classroom Game",
    description: "Turn your lesson cards into a visual matching game for individuals or teams. Students remember card positions and collect matching pairs while reviewing vocabulary.",
  },
  "connect-four": {
    title: "Connect Four Classroom Game",
    description: "Students answer vocabulary questions to place tokens on the board. Teams compete to connect four tokens in a row while practising the selected lesson content.",
  },
  conquer: {
    title: "Conquer Classroom Game",
    description: "Teams answer questions to claim spaces and expand across the game board. Use any lesson tray to combine vocabulary practice with strategy and classroom competition.",
  },
  "whack-a-word": {
    title: "Whack-a-Word Classroom Game",
    description: "Students identify the correct word or image before time runs out. This quick-response game develops vocabulary recognition, attention, and recall.",
  },
} as const;

export type GameContentKey = keyof typeof GAME_CONTENT;

export function createGameMetadata(key: GameContentKey) {
  const game = GAME_CONTENT[key];
  return createPrivateMetadata(game.title, game.description);
}
