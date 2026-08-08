export type Topic = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  intro: string;
  vocabulary: string[];
  classroomIdea: string;
  worksheetIdea: string;
};

export const TOPICS: Topic[] = [
  {
    slug: "animals",
    title: "Animal Flashcards and Activities for ESL Teachers",
    shortTitle: "Animals",
    description: "Use animal flashcards, vocabulary activities, games, and printable ideas to teach English to young and beginner learners.",
    intro: "Build an engaging animal vocabulary lesson with visual flashcards that help learners name, describe, and talk about familiar animals.",
    vocabulary: ["dog", "cat", "bird", "fish", "rabbit", "elephant", "lion", "monkey"],
    classroomIdea: "Reveal one card at a time and ask learners to name the animal, make its sound, or sort it into farm, pet, jungle, or sea groups.",
    worksheetIdea: "Use the same card set for a matching, colouring, or simple ‘I can see a…’ worksheet.",
  },
  {
    slug: "food",
    title: "Food Flashcards and ESL Activities for Teachers",
    shortTitle: "Food",
    description: "Teach food vocabulary with visual flashcards, speaking activities, classroom games, and printable practice for ESL learners.",
    intro: "Use clear food images to introduce everyday vocabulary and give learners a simple way to practise likes, dislikes, meals, and shopping language.",
    vocabulary: ["apple", "banana", "bread", "rice", "milk", "egg", "pizza", "juice"],
    classroomIdea: "Play a food-shopping role play: learners ask for a card, then say whether they like it or do not like it.",
    worksheetIdea: "Create a food sorting or ‘My favourite food’ worksheet from the selected cards.",
  },
  {
    slug: "weather",
    title: "Weather Flashcards and Activities for ESL Teachers",
    shortTitle: "Weather",
    description: "Teach weather vocabulary using illustrated flashcards, speaking prompts, classroom games, and printable ESL activities.",
    intro: "Weather is ideal for a short daily speaking routine. Visual cards make it easy for learners to connect a forecast with the words they need.",
    vocabulary: ["sunny", "rainy", "windy", "cloudy", "snowy", "hot", "cold", "stormy"],
    classroomIdea: "Start class with ‘What’s the weather like today?’ and let learners choose, mime, or hold up the matching card.",
    worksheetIdea: "Make a weather diary or a clothes-for-the-weather matching activity.",
  },
  {
    slug: "classroom-objects",
    title: "Classroom Objects Flashcards for ESL Teachers",
    shortTitle: "Classroom Objects",
    description: "Teach classroom object vocabulary with illustrated flashcards, practical classroom games, and printable ESL activities.",
    intro: "Turn the objects already around your learners into useful English practice with visual vocabulary cards and simple instructions.",
    vocabulary: ["book", "pen", "pencil", "eraser", "bag", "desk", "chair", "ruler"],
    classroomIdea: "Give instructions such as ‘Point to the ruler’ or ‘Put the pencil on the desk’ for an active vocabulary review.",
    worksheetIdea: "Create a label-the-classroom or find-and-tick worksheet using the same card selection.",
  },
  {
    slug: "emotions",
    title: "Feelings and Emotions Flashcards for ESL Teachers",
    shortTitle: "Emotions",
    description: "Use feelings flashcards and speaking activities to teach emotion vocabulary to young and beginner ESL learners.",
    intro: "Visual emotion cards support useful classroom language and help learners express how they feel with confidence.",
    vocabulary: ["happy", "sad", "angry", "tired", "excited", "scared", "hungry", "thirsty"],
    classroomIdea: "Show a card and ask learners to mime the feeling, then practise ‘How do you feel?’ and ‘I feel…’ in pairs.",
    worksheetIdea: "Make a draw-your-face or match-the-feeling worksheet for quiet follow-up practice.",
  },
  {
    slug: "daily-routines",
    title: "Daily Routine Flashcards and ESL Activities",
    shortTitle: "Daily Routines",
    description: "Teach daily routine vocabulary with visual flashcards, sequencing activities, games, and printable ESL practice.",
    intro: "Daily routines give learners a natural reason to practise present simple sentences, time words, and speaking about their lives.",
    vocabulary: ["wake up", "eat breakfast", "go to school", "study", "play", "have dinner", "take a shower", "sleep"],
    classroomIdea: "Give groups mixed routine cards and ask them to sequence a day, then explain it using ‘First’, ‘then’, and ‘finally’.",
    worksheetIdea: "Create a cut-and-order routine worksheet or a ‘My day’ writing prompt.",
  },
  {
    slug: "transportation",
    title: "Transportation Flashcards and ESL Activities",
    shortTitle: "Transportation",
    description: "Teach transportation vocabulary with illustrated flashcards, speaking games, and printable English activities.",
    intro: "Use transport flashcards to help learners name vehicles and talk about how people travel to school, work, and new places.",
    vocabulary: ["car", "bus", "train", "bicycle", "plane", "boat", "taxi", "motorcycle"],
    classroomIdea: "Ask ‘How do you go to school?’ and let learners race to the matching card before answering in a full sentence.",
    worksheetIdea: "Make a transport survey or sort cards into land, air, and water groups.",
  },
  {
    slug: "actions",
    title: "Action Verb Flashcards and ESL Activities",
    shortTitle: "Actions",
    description: "Teach common English action verbs with visual flashcards, movement games, and printable classroom activities.",
    intro: "Action cards make it easy to get learners moving while they practise high-frequency verbs and simple sentence patterns.",
    vocabulary: ["run", "jump", "walk", "swim", "read", "write", "sing", "dance"],
    classroomIdea: "Play a fast mime game: one learner acts out a card while the class guesses using ‘You are…’ or the base verb.",
    worksheetIdea: "Create a draw-the-action or match-the-verb worksheet from the selected cards.",
  },
  {
    slug: "clothes",
    title: "Clothes Flashcards and ESL Activities for Teachers",
    shortTitle: "Clothes",
    description: "Teach clothing vocabulary with illustrated flashcards, speaking games, and printable ESL activities for young learners.",
    intro: "Clothing flashcards support practical classroom language about what people wear and what is suitable for different weather.",
    vocabulary: ["shirt", "t-shirt", "dress", "skirt", "shoes", "hat", "jacket", "socks"],
    classroomIdea: "Describe a card with ‘He is wearing…’ or ‘She is wearing…’ and have learners find the matching item.",
    worksheetIdea: "Make a dress-for-the-weather or label-the-outfit worksheet.",
  },
  {
    slug: "body",
    title: "Body Parts Flashcards and ESL Activities",
    shortTitle: "Body Parts",
    description: "Teach body part vocabulary with visual flashcards, active classroom games, and printable ESL activities.",
    intro: "Body vocabulary is ideal for young learners because it can be practised immediately with movement, songs, and simple instructions.",
    vocabulary: ["head", "eyes", "ears", "nose", "mouth", "hands", "legs", "feet"],
    classroomIdea: "Use a ‘Touch your…’ listening game, then let learners lead the instructions for the class.",
    worksheetIdea: "Create a label-the-body or draw-and-colour worksheet using the selected cards.",
  },
];

export function getTopic(slug: string) {
  return TOPICS.find((topic) => topic.slug === slug);
}
