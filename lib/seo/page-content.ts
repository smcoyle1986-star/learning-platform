import type { Metadata } from "next";

type PageContent = {
  title: string;
  description: string;
  path: string;
};

export const PAGE_CONTENT = {
  home: {
    title: "Free Interactive ESL Flashcards & Classroom Activities",
    description: "Classendo gives ESL teachers free interactive flashcards and classroom activities. Build a visual vocabulary set, then reuse it in Classroom Mode, games, worksheets, printables, and lesson plans.",
    path: "/",
  },
  flashcards: {
    title: "Free Interactive ESL Flashcards for the Classroom",
    description: "Build free interactive ESL flashcards for the classroom. Search visual vocabulary by topic, choose the cards you need, and reuse the set in Classroom Mode, games, worksheets, and printables.",
    path: "/flashcards",
  },
  classroom: {
    title: "Free Interactive Flashcards for the ESL Classroom",
    description: "Use free interactive flashcards in Classroom Mode for visual vocabulary teaching. Present cards full screen, shuffle them, add drawings, and lead whole-class ESL activities.",
    path: "/flashcards/classroom",
  },
  community: {
    title: "Community Teaching Resources",
    description: "Explore lesson sets and worksheets shared by the Classendo community. Search, filter, preview, and copy useful teaching resources to My Lessons.",
    path: "/teacher/community",
  },
  creator: {
    title: "Flashcard Creator",
    description: "Turn your own images into reusable classroom flashcards. Upload an image, add the card text and content type, then use your cards in lessons, worksheets, printables, and games.",
    path: "/creator",
  },
  dashboard: {
    title: "My Lessons",
    description: "Keep your saved lessons and worksheets organised in one place. Return to recent resources, update your teaching materials, or open a saved set for classroom use.",
    path: "/dashboard",
  },
  editor: {
    title: "Lesson Card Editor",
    description: "Review and organise the cards currently in your lesson tray. Change their order, remove cards you do not need, and save the completed lesson to My Lessons.",
    path: "/teacher/editor",
  },
  worksheets: {
    title: "Free ESL Vocabulary Worksheet Maker",
    description: "Create free printable ESL vocabulary worksheets from the cards in your lesson tray. Choose a classroom activity, customise it, then save or export it for your students.",
    path: "/worksheets",
  },
  printables: {
    title: "Free Printable ESL Vocabulary Cards & Classroom Resources",
    description: "Turn selected vocabulary cards into free printable ESL classroom resources. Adjust the layout and print flashcards, handouts, or supporting materials for lessons and activities.",
    path: "/printables",
  },
  lessons: {
    title: "Free ESL Lesson Plan Maker & Classroom Activities",
    description: "Create practical ESL lesson plans from selected vocabulary and teaching goals. Organise classroom activities and instructions, then save or export the plan when it is ready.",
    path: "/lessons",
  },
  games: {
    title: "Interactive ESL Classroom Games & Vocabulary Activities",
    description: "Turn a visual vocabulary set into interactive ESL classroom games. Classendo supports team challenges, movement activities, memory practice, and speaking tasks using the cards you choose.",
    path: "/games",
  },
  teacherTools: {
    title: "Teacher Tools",
    description: "Explore Classendo's tools for preparing and teaching visual language lessons. Create flashcards, worksheets, printables, lesson plans, and interactive classroom activities from one shared lesson tray.",
    path: "/teacher-tools",
  },
  faq: {
    title: "Frequently Asked Questions",
    description: "Find answers about Classendo accounts, lesson creation, classroom tools, subscriptions, and saved resources. Learn how the main features work and where to get additional help.",
    path: "/faq",
  },
  upgrade: {
    title: "Classendo Premium",
    description: "Compare Classendo's available plans and the teaching tools included with Premium. Choose the option that fits how often you create, save, and use classroom resources.",
    path: "/upgrade",
  },
  feedback: {
    title: "Send Feedback",
    description: "Share an idea, report a problem, or tell us about your experience with Classendo. Your feedback helps improve the tools and resources available to teachers.",
    path: "/feedback",
  },
} satisfies Record<string, PageContent>;

export type PageContentKey = keyof typeof PAGE_CONTENT;

export function createPublicMetadata(key: PageContentKey): Metadata {
  const page = PAGE_CONTENT[key];
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.path },
    openGraph: {
      title: page.title,
      description: page.description,
      type: "website",
      url: page.path,
      siteName: "Classendo",
    },
  };
}

export function createPrivateMetadata(title: string, description: string): Metadata {
  return {
    title,
    description,
    robots: { index: false, follow: false },
  };
}
