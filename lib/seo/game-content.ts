import type { Metadata } from "next";

export const GAME_CONTENT = {
  "image-reveal": {
    title: "Free Image Reveal ESL Classroom Game",
    description: "Play Image Reveal, a free interactive ESL classroom game. Choose a ready-made vocabulary topic with no signup, then reveal images for whole-class review.",
  },
  kaboom: {
    title: "Free KaBoom ESL Classroom Game",
    description: "Play KaBoom, a free ESL classroom game for vocabulary review. Choose a ready-made topic with no signup, answer together, and avoid the hidden bombs.",
  },
  "spin-and-speak": {
    title: "Free Spin and Speak ESL Classroom Game",
    description: "Play Spin and Speak, a free interactive ESL game for warm-ups, vocabulary review, and speaking practice. Choose a ready-made topic and start with no signup.",
  },
  "yes-or-no": {
    title: "Free Yes or No ESL Classroom Game",
    description: "Play Yes or No, a free ESL classroom game for fast speaking and decision practice. Choose a ready-made topic with no signup, then add your own questions.",
  },
  "choose-your-side": {
    title: "Free Choose Your Side ESL Classroom Game",
    description: "Play Choose Your Side, a free ESL movement game for whole-class speaking practice. Choose a ready-made topic with no signup, then add teacher-written questions.",
  },
  "four-corners": {
    title: "Free Four Corners ESL Classroom Game",
    description: "Play Four Corners, a free interactive ESL classroom game for vocabulary review. Choose a ready-made topic with no signup and get learners moving.",
  },
  "memory-flip": {
    title: "Free Memory Flip ESL Classroom Game",
    description: "Play Memory Flip, a free ESL vocabulary matching game for teams or individuals. Choose a ready-made topic with no signup and practise visual recall.",
  },
  "connect-four": {
    title: "Free Connect Four ESL Classroom Game",
    description: "Play Connect Four, a free ESL classroom game for vocabulary practice. Choose a ready-made topic with no signup and compete to connect four tokens.",
  },
  conquer: {
    title: "Free Conquer ESL Classroom Game",
    description: "Play Conquer, a free interactive ESL classroom game for vocabulary review and team strategy. Choose a ready-made topic with no signup and claim the board.",
  },
  "whack-a-word": {
    title: "Free Whack-a-Word ESL Classroom Game",
    description: "Play Whack-a-Word, a free ESL vocabulary game for quick recognition and recall. Choose a ready-made topic with no signup and race against the timer.",
  },
} as const;

export type GameContentKey = keyof typeof GAME_CONTENT;

export function createGameMetadata(key: GameContentKey): Metadata {
  const game = GAME_CONTENT[key];
  const path = `/games/${key}`;
  return {
    title: game.title,
    description: game.description,
    alternates: { canonical: path },
    openGraph: {
      title: game.title,
      description: game.description,
      type: "website",
      url: path,
      siteName: "Classendo",
    },
  };
}
