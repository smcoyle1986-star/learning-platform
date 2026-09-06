export type LandingSection = {
  slug: string;
  title: string;
  description: string;
  previewLead: string;
  previewBullets: string[];
  href: string;
};

export const LANDING_HERO_TITLE = "Build one English lesson.\nTeach it live.";

export const LANDING_HERO_DESCRIPTION =
  "Open Classendo on a projector, TV, interactive whiteboard, laptop, or tablet. Choose your lesson cards once, present them full screen, annotate as you teach, then reuse the same lesson in games, worksheets, printables, and activities.";

export const LANDING_SECTIONS: LandingSection[] = [
  {
    slug: "flashcards",
    title: "Build a lesson",
    description: "Choose the vocabulary and images for one focused lesson.",
    previewLead: "Create focused word sets from the cards in your lesson tray.",
    previewBullets: [
      "Search and sort by grammar or theme.",
      "Add cards quickly and keep them ready for later.",
      "Move the same cards into games, worksheets, or printables.",
    ],
    href: "/flashcards",
  },
  {
    slug: "lessons",
    title: "Lesson plans",
    description: "Plan complete lessons with clear classroom flow.",
    previewLead: "Build a full lesson plan from the same Classendo cards.",
    previewBullets: [
      "Create a simple 50-minute plan for the class.",
      "Choose activities that match the level you want.",
      "Save the plan and return to it later from My Lessons.",
    ],
    href: "/lessons",
  },
  {
    slug: "games",
    title: "Classroom games",
    description: "Turn your cards into whole-class activities.",
    previewLead: "Use the same cards to run simple, teacher-led classroom games.",
    previewBullets: [
      "Choose from game boards made for the whole class.",
      "Keep the score visible and easy to follow.",
      "Use the lesson tray cards without rebuilding anything.",
    ],
    href: "/games",
  },
  {
    slug: "worksheets",
    title: "Worksheets and printables",
    description: "Make printable practice pages from your cards.",
    previewLead: "Build worksheet activities straight from the lesson tray.",
    previewBullets: [
      "Use reading, writing, and matching style activities.",
      "Keep the layout classroom-friendly and clear.",
      "Print a finished worksheet when you’re ready.",
    ],
    href: "/worksheets",
  },
  {
    slug: "printables",
    title: "Printables",
    description: "Export classroom-ready sheets from the same lesson set.",
    previewLead: "Choose how many cards fit on each page and print them cleanly.",
    previewBullets: [
      "Keep the images sharp and uncluttered.",
      "Pick 2, 4, 8, or more cards per page.",
      "Make materials for students to use in class or at home.",
    ],
    href: "/printables",
  },
  {
    slug: "dashboard",
    title: "My Lessons",
    description: "Save, reopen, and edit your lessons anytime.",
    previewLead: "Keep your lessons organised and easy to return to.",
    previewBullets: [
      "Store lesson sets for future classes.",
      "Open saved work and keep editing.",
      "Move from Flashcards into the rest of Classendo.",
    ],
    href: "/dashboard",
  },
  {
    slug: "community",
    title: "Community",
    description: "Find and share lesson sets with other teachers.",
    previewLead: "Browse teacher-made sets and copy the ones that fit your class.",
    previewBullets: [
      "Preview shared lessons before you add them.",
      "Save good ideas into My Lessons.",
      "Share your own sets back with the community.",
    ],
    href: "/teacher/community",
  },
];

export const LANDING_STEPS = [
  {
    title: "1. Build your lesson",
    description: "Choose the words and images you want to teach once.",
  },
  {
    title: "2. Open Classroom Mode",
    description: "Present the same cards full screen on your classroom display and annotate as you teach.",
  },
  {
    title: "3. Reuse the lesson",
    description: "Take the same set into games, worksheets, printables, and future lessons without rebuilding it.",
  },
];
