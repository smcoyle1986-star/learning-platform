import { PUBLISHED_TWELVE_CARD_LESSON_PACKS } from "@/lib/twelve-card-lesson-packs/catalog";

export type FreeLessonPack = {
  slug: string;
  title: string;
  type: "noun" | "verb" | "adjective" | "preposition" | "mixed";
  topic: string;
  worksheet: string;
  terms?: string[];
  format?: "six-card" | "twelve-card";
  cardCount?: number;
  includes?: string[];
};

const SIX_CARD_LESSON_PACKS: FreeLessonPack[] = [
  ["animals-vocabulary-beginner-esl", "Animals Vocabulary", "noun", "Animals", "Picture vocabulary"],
  ["body-parts-vocabulary-beginner-esl", "Body Parts Vocabulary", "noun", "Body Parts", "Picture vocabulary"],
  ["classroom-objects-vocabulary-beginner-esl", "Classroom Objects Vocabulary", "noun", "Classroom Objects", "Picture vocabulary"],
  ["clothing-vocabulary-beginner-esl", "Clothing Vocabulary", "noun", "Clothing", "Picture vocabulary"],
  ["family-vocabulary-beginner-esl", "Family Vocabulary", "noun", "Family", "Picture vocabulary"],
  ["food-vocabulary-beginner-esl", "Food Vocabulary", "noun", "Food", "Picture vocabulary"],
  ["home-furniture-vocabulary-beginner-esl", "Home Furniture Vocabulary", "noun", "Home Furniture", "Bullseye"],
  ["jobs-vocabulary-beginner-esl", "Jobs Vocabulary", "noun", "Jobs", "Tic-Tac-Toe"],
  ["kitchen-objects-vocabulary-beginner-esl", "Kitchen Objects Vocabulary", "noun", "Kitchen Objects", "Bullseye"],
  ["nature-vocabulary-beginner-esl", "Nature Vocabulary", "noun", "Nature", "Bullseye"],
  ["numbers-vocabulary-beginner-esl", "Numbers Vocabulary", "noun", "Numbers", "Wordsearch"],
  ["places-in-town-vocabulary-beginner-esl", "Places in Town Vocabulary", "noun", "Places in Town", "Battleship"],
  ["school-subjects-vocabulary-beginner-esl", "School Subjects Vocabulary", "noun", "School Subjects", "Crossword"],
  ["sports-vocabulary-beginner-esl", "Sports Vocabulary", "noun", "Sports", "Tic-Tac-Toe"],
  ["time-vocabulary-beginner-esl", "Time Vocabulary", "noun", "Time", "Tic-Tac-Toe"],
  ["toys-vocabulary-beginner-esl", "Toys Vocabulary", "noun", "Toys", "Wordsearch"],
  ["transportation-vocabulary-beginner-esl", "Transportation Vocabulary", "noun", "Transportation", "Wordsearch"],
  ["weather-vocabulary-beginner-esl", "Weather Vocabulary", "noun", "Weather", "Wordsearch"],
  ["morning-routine-verbs-beginner-esl", "Morning Routine Verbs", "verb", "Morning Routine", "Wordsearch"],
  ["after-school-verbs-beginner-esl", "After School Verbs", "verb", "After School", "Tic-Tac-Toe"],
  ["home-chores-verbs-beginner-esl", "Home Chores Verbs", "verb", "Home Chores", "Crossword"],
  ["food-actions-verbs-beginner-esl", "Food Actions Verbs", "verb", "Food Actions", "Bullseye"],
  ["classroom-actions-verbs-beginner-esl", "Classroom Actions Verbs", "verb", "Classroom Actions", "Wordsearch"],
  ["speaking-skills-verbs-beginner-esl", "Speaking Skills Verbs", "verb", "Speaking Skills", "Tic-Tac-Toe"],
  ["five-senses-verbs-beginner-esl", "Five Senses Verbs", "verb", "Five Senses", "Crossword"],
  ["thinking-verbs-beginner-esl", "Thinking Verbs", "verb", "Thinking", "Bullseye"],
  ["travel-actions-verbs-beginner-esl", "Travel Actions Verbs", "verb", "Travel Actions", "Wordsearch"],
  ["active-verbs-beginner-esl", "Active Verbs", "verb", "Active Verbs", "Tic-Tac-Toe"],
  ["creative-activities-verbs-beginner-esl", "Creative Activities Verbs", "verb", "Creative Activities", "Crossword"],
  ["outdoor-adventures-verbs-beginner-esl", "Outdoor Adventures Verbs", "verb", "Outdoor Adventures", "Bullseye"],
  ["games-and-play-verbs-beginner-esl", "Games and Play Verbs", "verb", "Games and Play", "Wordsearch"],
  ["friends-and-communication-verbs-beginner-esl", "Friends and Communication Verbs", "verb", "Friends and Communication", "Tic-Tac-Toe"],
  ["learning-and-study-verbs-beginner-esl", "Learning and Study Verbs", "verb", "Learning and Study", "Crossword"],
  ["size-and-shape-adjectives-beginner-esl", "Size and Shape Adjectives", "adjective", "Size and Shape", "Wordsearch"],
  ["colors-adjectives-beginner-esl", "Colors Adjectives", "adjective", "Colors", "Tic-Tac-Toe"],
  ["feelings-adjectives-beginner-esl", "Feelings Adjectives", "adjective", "Feelings", "Crossword"],
  ["food-adjectives-beginner-esl", "Food Adjectives", "adjective", "Food", "Bullseye"],
  ["appearance-adjectives-beginner-esl", "Appearance Adjectives", "adjective", "Appearance", "Wordsearch"],
  ["opposites-adjectives-beginner-esl", "Opposites Adjectives", "adjective", "Opposites", "Tic-Tac-Toe"],
  ["weather-adjectives-beginner-esl", "Weather Adjectives", "adjective", "Weather", "Crossword"],
  ["places-adjectives-beginner-esl", "Places Adjectives", "adjective", "Places", "Bullseye"],
  ["personality-adjectives-beginner-esl", "Personality Adjectives", "adjective", "Personality", "Wordsearch"],
  ["speed-and-difficulty-adjectives-beginner-esl", "Speed and Difficulty Adjectives", "adjective", "Speed and Difficulty", "Tic-Tac-Toe"],
  ["place-prepositions-beginner-esl", "Place Prepositions", "preposition", "Place", "Wordsearch"],
  ["where-things-are-prepositions-beginner-esl", "Where Things Are Prepositions", "preposition", "Where Things Are", "Tic-Tac-Toe"],
  ["movement-prepositions-beginner-esl", "Movement Prepositions", "preposition", "Movement", "Crossword"],
  ["directions-prepositions-beginner-esl", "Directions Prepositions", "preposition", "Directions", "Bullseye"],
  ["travel-routes-prepositions-beginner-esl", "Travel Routes Prepositions", "preposition", "Travel Routes", "Wordsearch"],
].map(([slug, title, type, topic, worksheet]) => ({ slug, title, type, topic, worksheet, format: "six-card" as const, cardCount: 6 })) as FreeLessonPack[];

export const FREE_LESSON_PACKS: FreeLessonPack[] = [
  ...SIX_CARD_LESSON_PACKS,
  ...PUBLISHED_TWELVE_CARD_LESSON_PACKS.map((pack) => ({
    slug: pack.slug,
    title: pack.title,
    type: pack.type,
    topic: pack.topic,
    worksheet: `${pack.studyWorksheets[0]?.title ?? "Study worksheet"} + ${pack.playWorksheets[0]?.title ?? "Play worksheet"}`,
    terms: pack.words,
    format: "twelve-card" as const,
    cardCount: 12,
    includes: ["lesson plan", "12 flashcards", "two study worksheets", "two play worksheets", "movement game"],
  })),
];
