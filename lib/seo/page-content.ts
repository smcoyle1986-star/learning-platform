import type { Metadata } from "next";

type PageContent = {
  title: string;
  description: string;
  path: string;
};

export const PAGE_CONTENT = {
  home: {
    title: "Classendo | Visual Teaching Tools for the Classroom",
    description: "Classendo helps teachers create visual lessons, classroom games, worksheets, and printable learning materials. Build resources from ready-made vocabulary or your own images, then use them directly with your class.",
    path: "/",
  },
  flashcards: {
    title: "Flashcards",
    description: "Find illustrated vocabulary cards and assemble them into lessons for your students. Search by topic, choose the cards you need, and send the finished set to Classendo's classroom tools.",
    path: "/flashcards",
  },
  community: {
    title: "Community Lesson Sets",
    description: "Explore lesson sets created and shared by the Classendo community. Search by topic or content type, preview the cards, and copy useful sets to your own teaching dashboard.",
    path: "/teacher/community",
  },
  creator: {
    title: "Flashcard Creator",
    description: "Turn your own images into reusable classroom flashcards. Upload an image, add the card text and content type, then use your cards in lessons, worksheets, printables, and games.",
    path: "/creator",
  },
  dashboard: {
    title: "Teaching Dashboard",
    description: "Keep your saved lessons and worksheets organised in one place. Return to recent resources, update your teaching materials, or open a saved set for classroom use.",
    path: "/dashboard",
  },
  editor: {
    title: "Lesson Card Editor",
    description: "Review and organise the cards currently in your lesson tray. Change their order, remove cards you do not need, and save the completed lesson to your dashboard.",
    path: "/teacher/editor",
  },
  worksheets: {
    title: "Worksheet Maker",
    description: "Create classroom worksheets from the vocabulary cards in your lesson tray. Choose an activity and customise the content before saving or exporting the worksheet for your students.",
    path: "/worksheets",
  },
  printables: {
    title: "Classroom Printables",
    description: "Turn your selected vocabulary cards into printable classroom resources. Adjust the layout and print flashcards, handouts, or supporting materials for lessons and activities.",
    path: "/printables",
  },
  lessons: {
    title: "Lesson Plan Maker",
    description: "Create structured lesson plans using your selected vocabulary and teaching goals. Organise activities and classroom instructions into a practical plan you can save or export.",
    path: "/lessons",
  },
  games: {
    title: "Interactive Classroom Games",
    description: "Choose an interactive classroom game and play it with the cards in your lesson tray. Classendo games turn vocabulary review into team challenges, movement activities, memory practice, and speaking tasks.",
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
