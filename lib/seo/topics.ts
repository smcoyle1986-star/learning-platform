export type Topic = {
  slug: string;
  title: string;
  shortTitle: string;
  description: string;
  intro: string;
  vocabulary: string[];
  classroomIdea: string;
  worksheetIdea: string;
  lessonSteps?: string[];
  languageFocus?: string;
  teachingFocus: string[];
  classroomLanguage: string[];
  activityIdeas: { title: string; description: string }[];
  resources: { href: string; label: string; description: string }[];
};

export const TOPICS: Topic[] = [
  {
    slug: "animals",
    title: "Animal Flashcards and Activities for ESL Teachers",
    shortTitle: "Animals",
    description: "Use animal flashcards, vocabulary activities, games, and printable ideas to teach English to young and beginner learners.",
    intro: "Animal vocabulary gives beginner learners an immediate way to talk about pets, farm animals, wildlife, and the creatures they see in books. Start with familiar animals, then use the same visual cards for sorting, describing, and speaking practice.",
    vocabulary: ["dog", "cat", "bird", "fish", "rabbit", "elephant", "lion", "monkey"],
    classroomIdea: "Reveal one card at a time and ask learners to name the animal, make its sound, or sort it into farm, pet, jungle, or sea groups.",
    worksheetIdea: "Use the same card set for a matching, colouring, or simple ‘I can see a…’ worksheet.",
    teachingFocus: ["Move beyond naming by sorting cards into pets, farm animals, wild animals, and sea animals. This gives learners a reason to repeat the vocabulary while noticing useful categories.", "Animal cards also work well with singular and plural nouns, appearance words, habitats, and abilities. A lion can run; a fish can swim; a bird can fly."],
    classroomLanguage: ["What is it? It’s a rabbit.", "Where does it live? It lives on a farm / in the sea.", "What can it do? It can jump.", "How many lions can you see?"],
    activityIdeas: [
      { title: "Habitat corners", description: "Label corners farm, home, jungle, and sea. Show a card and have learners move to the habitat they choose, then say the animal together." },
      { title: "Animal detective", description: "Describe one card without naming it: ‘It is big. It has a trunk.’ Pairs point to or hold up the matching animal." },
      { title: "Can / can’t relay", description: "Teams match animal cards with ability cards, then make a full sentence before earning a point." },
    ],
    resources: [
      { href: "/free-resources/animals-vocabulary-beginner-esl", label: "Animals vocabulary lesson pack", description: "A ready-to-print beginner animal lesson." },
      { href: "/flashcards", label: "Build animal flashcards", description: "Choose more animal vocabulary for an interactive set." },
    ],
  },
  {
    slug: "food",
    title: "Food Flashcards and ESL Activities for Teachers",
    shortTitle: "Food",
    description: "Teach food vocabulary with visual flashcards, speaking activities, classroom games, and printable practice for ESL learners.",
    intro: "Food lessons quickly lead into personal speaking because every learner can talk about meals, snacks, and favourites. Use visual food vocabulary to build from simple naming to likes, dislikes, shopping, and meal choices.",
    vocabulary: ["apple", "banana", "bread", "rice", "milk", "egg", "pizza", "juice"],
    classroomIdea: "Play a food-shopping role play: learners ask for a card, then say whether they like it or do not like it.",
    worksheetIdea: "Create a food sorting or ‘My favourite food’ worksheet from the selected cards.",
    teachingFocus: ["Group food cards by fruit, vegetables, drinks, snacks, or meals. Sorting creates repetition without turning the lesson into a word list.", "Food is a natural context for countable and uncountable nouns: an apple, two eggs, some rice, and some milk. Stronger classes can practise requests and simple shopping dialogues."],
    classroomLanguage: ["Do you like bananas? Yes, I do. / No, I don’t.", "What do you have for breakfast?", "Can I have some juice, please?", "How many apples are there?"],
    activityIdeas: [
      { title: "Class café", description: "Give each pair a small menu of card pictures. One learner orders politely and the other checks the order with the matching cards." },
      { title: "Lunchbox sort", description: "Teams sort cards into healthy lunchbox choices, drinks, and treats, then explain one choice." },
      { title: "Find someone who…", description: "Learners ask classmates ‘Do you like…?’ and record a name beside each food picture." },
    ],
    resources: [
      { href: "/free-resources/food-vocabulary-beginner-esl", label: "Food vocabulary lesson pack", description: "A complete beginner printable food lesson." },
      { href: "/flashcards", label: "Build food flashcards", description: "Create an interactive food vocabulary set." },
    ],
  },
  {
    slug: "weather",
    title: "Weather Flashcards and Activities for ESL Teachers",
    shortTitle: "Weather",
    description: "Teach weather vocabulary using illustrated flashcards, speaking prompts, classroom games, and printable ESL activities.",
    intro: "Weather makes an effective daily ESL speaking routine because learners can look outside, choose a card, and report a real condition. Visual weather vocabulary also connects naturally to seasons, temperature, forecasts, and suitable clothing.",
    vocabulary: ["sunny", "rainy", "windy", "cloudy", "snowy", "hot", "cold", "stormy"],
    classroomIdea: "Start class with ‘What’s the weather like today?’ and let learners choose, mime, or hold up the matching card.",
    worksheetIdea: "Make a weather diary or a clothes-for-the-weather matching activity.",
    languageFocus: "What’s the weather like today? It’s sunny / rainy / windy. I wear a jacket when it’s cold.",
    lessonSteps: [
      "Introduce four to eight weather flashcards and drill the words with gestures.",
      "Ask ‘What’s the weather like today?’ and have learners answer with a complete sentence.",
      "Play a quick weather mime or picture-reveal game to review the vocabulary.",
      "Finish with a weather diary or a clothes-for-the-weather worksheet.",
    ],
    teachingFocus: ["Use weather cards to contrast conditions that learners often confuse, such as windy and stormy or cold and snowy. Gestures make the differences memorable.", "Once the core words are secure, connect the weather to seasons and clothes: a coat for cold days, boots for rainy days, and a hat for sunny weather."],
    classroomLanguage: ["What’s the weather like today? It’s cloudy.", "Is it hot or cold?", "What should we wear when it’s rainy?", "What is the weather forecast for tomorrow?"],
    activityIdeas: [
      { title: "Weather reporter", description: "Give one learner a map or window view and a weather card. They deliver a short forecast while the class holds up the matching picture." },
      { title: "Weather wardrobe", description: "Match clothing cards to weather cards, then ask pairs to explain: ‘I wear boots when it’s rainy.’" },
      { title: "Four-day forecast", description: "Groups arrange four weather cards in a sequence and present a simple forecast for Monday to Thursday." },
    ],
    resources: [
      { href: "/free-resources/weather-vocabulary-beginner-esl", label: "Weather vocabulary lesson pack", description: "A printable beginner weather lesson." },
      { href: "/flashcards", label: "Build weather flashcards", description: "Choose weather and clothing words for an interactive set." },
    ],
  },
  {
    slug: "classroom-objects",
    title: "Classroom Objects Flashcards for ESL Teachers",
    shortTitle: "Classroom Objects",
    description: "Teach classroom object vocabulary with illustrated flashcards, practical classroom games, and printable ESL activities.",
    intro: "Classroom object vocabulary is useful from the first lesson because learners can point to real items while they listen and speak. Combine visual cards with the objects on their desks to practise nouns, classroom instructions, and prepositions.",
    vocabulary: ["book", "pen", "pencil", "eraser", "bag", "desk", "chair", "ruler"],
    classroomIdea: "Give instructions such as ‘Point to the ruler’ or ‘Put the pencil on the desk’ for an active vocabulary review.",
    worksheetIdea: "Create a label-the-classroom or find-and-tick worksheet using the same card selection.",
    teachingFocus: ["Teach a small set of objects that learners need every day, then reuse them in genuine instructions such as ‘Open your book’ and ‘Put your pencil in your bag.’", "This topic is also a simple way to introduce there is / there are and position language: the ruler is on the desk; the bag is under the chair."],
    classroomLanguage: ["What is this? It’s a ruler.", "Where is the pencil? It’s on the desk.", "Please open your book.", "Have you got an eraser?"],
    activityIdeas: [
      { title: "Classroom scavenger hunt", description: "Call or display an object card. Pairs find the real object, point to it, and say its name before returning." },
      { title: "Teacher says", description: "Use classroom-object instructions: ‘Put the pen under the book’ or ‘Touch the chair.’" },
      { title: "Mystery bag", description: "Hide one object in a bag. Learners ask yes/no questions or feel the shape before guessing." },
    ],
    resources: [
      { href: "/free-resources/classroom-objects-vocabulary-beginner-esl", label: "Classroom objects lesson pack", description: "A printable set for everyday classroom English." },
      { href: "/flashcards", label: "Build classroom object flashcards", description: "Add the objects your learners use most." },
    ],
  },
  {
    slug: "emotions",
    title: "Feelings and Emotions Flashcards for ESL Teachers",
    shortTitle: "Emotions",
    description: "Use feelings flashcards and speaking activities to teach emotion vocabulary to young and beginner ESL learners.",
    intro: "Feelings vocabulary helps learners take part in real classroom conversations, from a quick check-in to describing characters in a story. Clear facial-expression cards make abstract words such as excited, worried, and tired easier to recognise and use.",
    vocabulary: ["happy", "sad", "angry", "tired", "excited", "scared", "hungry", "thirsty"],
    classroomIdea: "Show a card and ask learners to mime the feeling, then practise ‘How do you feel?’ and ‘I feel…’ in pairs.",
    worksheetIdea: "Make a draw-your-face or match-the-feeling worksheet for quiet follow-up practice.",
    teachingFocus: ["Begin with the feelings learners can safely identify in pictures, then connect them to everyday causes: hungry before lunch, tired after sport, excited before a trip.", "This topic supports ‘I feel…’, ‘He looks…’, and simple questions about wellbeing. It also works well with story characters and role play."],
    classroomLanguage: ["How do you feel today? I feel happy.", "Why is she sad?", "He looks tired.", "Are you excited about the game?"],
    activityIdeas: [
      { title: "Feelings check-in", description: "At the start of class, learners choose one card and complete ‘Today I feel…’ if they are comfortable sharing." },
      { title: "Emotion freeze frames", description: "Pairs make a silent face and body pose for a card. The class guesses the feeling and gives a possible reason." },
      { title: "Story mood tracker", description: "Pause during a familiar story and ask learners to place a feeling card beside a character." },
    ],
    resources: [
      { href: "/free-resources/feelings-adjectives-beginner-esl", label: "Feelings lesson pack", description: "A printable beginner lesson about feelings." },
      { href: "/flashcards", label: "Build feelings flashcards", description: "Choose emotion words for an interactive check-in or game." },
    ],
  },
  {
    slug: "daily-routines",
    title: "Daily Routine Flashcards and ESL Activities",
    shortTitle: "Daily Routines",
    description: "Teach daily routine vocabulary with visual flashcards, sequencing activities, games, and printable ESL practice.",
    intro: "Daily routines give learners a practical reason to use the present simple, time expressions, and sequencing words. Visual routine cards help them move from isolated actions to talking about a typical school day or home routine.",
    vocabulary: ["wake up", "eat breakfast", "go to school", "study", "play", "have dinner", "take a shower", "sleep"],
    classroomIdea: "Give groups mixed routine cards and ask them to sequence a day, then explain it using ‘First’, ‘then’, and ‘finally’.",
    worksheetIdea: "Create a cut-and-order routine worksheet or a ‘My day’ writing prompt.",
    languageFocus: "I wake up at seven. First I eat breakfast, then I go to school. What time do you…?",
    lessonSteps: [
      "Teach the daily routine flashcards with actions learners can copy.",
      "Give pairs mixed cards and ask them to put a typical day in order.",
      "Have pairs describe their sequence using first, then, and finally.",
      "Use a ‘My day’ worksheet as a writing or speaking follow-up.",
    ],
    teachingFocus: ["Sequence routine cards before asking learners to speak. The visual order supports first, then, after that, and finally without requiring a long written text.", "Use the topic to contrast what learners do every day with what they do at a specific time: ‘I have dinner at seven’ and ‘I go to school at eight.’"],
    classroomLanguage: ["What time do you wake up?", "I have breakfast at seven.", "What do you do after school?", "First I get dressed, then I go to school."],
    activityIdeas: [
      { title: "Routine race", description: "Teams put mixed routine cards in a logical order, then one learner explains the sequence aloud." },
      { title: "Find the difference", description: "Pairs compare two short card sequences and say what is different: ‘She takes a shower before breakfast.’" },
      { title: "Class timetable interview", description: "Learners ask classmates about one routine and one time, then report back to a partner." },
    ],
    resources: [
      { href: "/free-resources/morning-routine-verbs-beginner-esl", label: "Morning routine verb lesson pack", description: "A focused printable lesson for routine actions." },
      { href: "/flashcards", label: "Build daily routine flashcards", description: "Create an interactive sequence of routine actions." },
    ],
  },
  {
    slug: "transportation",
    title: "Transportation Flashcards and ESL Activities",
    shortTitle: "Transportation",
    description: "Teach transportation vocabulary with illustrated flashcards, speaking games, and printable English activities.",
    intro: "Transportation vocabulary helps learners describe how they travel to school, compare journeys, and talk about land, air, and water vehicles. Visual transport flashcards make questions about everyday travel accessible to beginner speakers.",
    vocabulary: ["car", "bus", "train", "bicycle", "plane", "boat", "taxi", "motorcycle"],
    classroomIdea: "Ask ‘How do you go to school?’ and let learners race to the matching card before answering in a full sentence.",
    worksheetIdea: "Make a transport survey or sort cards into land, air, and water groups.",
    teachingFocus: ["Sort vehicles by where they travel before introducing ‘by bus’, ‘by train’, and ‘on foot’. The categories give learners a clear way to organise new words.", "Transport also supports simple travel questions, speed comparisons, and route language. Older learners can explain which vehicle is best for a particular journey."],
    classroomLanguage: ["How do you go to school? I go by bus.", "Can a boat fly? No, it can’t.", "Which is faster, a train or a bicycle?", "Let’s go by taxi."],
    activityIdeas: [
      { title: "Transport survey", description: "Learners ask three classmates how they get to school and make a quick class tally with vehicle cards." },
      { title: "Travel sorting relay", description: "Teams race to place each vehicle under land, air, or water and say the word clearly." },
      { title: "Journey planner", description: "Give a destination card and ask pairs to choose a vehicle, then justify it with a simple sentence." },
    ],
    resources: [
      { href: "/free-resources/transportation-vocabulary-beginner-esl", label: "Transportation lesson pack", description: "A printable beginner transportation lesson." },
      { href: "/flashcards", label: "Build transportation flashcards", description: "Choose vehicles for an interactive travel-vocabulary set." },
    ],
  },
  {
    slug: "actions",
    title: "Action Verb Flashcards and ESL Activities",
    shortTitle: "Actions",
    description: "Teach common English action verbs with visual flashcards, movement games, and printable classroom activities.",
    intro: "Action verb cards turn vocabulary practice into movement, which is especially useful with young and beginner learners. They support commands, guessing games, present continuous sentences, and talk about what people can do.",
    vocabulary: ["run", "jump", "walk", "swim", "read", "write", "sing", "dance"],
    classroomIdea: "Play a fast mime game: one learner acts out a card while the class guesses using ‘You are…’ or the base verb.",
    worksheetIdea: "Create a draw-the-action or match-the-verb worksheet from the selected cards.",
    languageFocus: "Run! Jump! Can you swim? He is reading. She can dance.",
    lessonSteps: [
      "Introduce action verb flashcards and use each word as a whole-class movement command.",
      "Mix the cards and play a fast listen-and-do round.",
      "Let learners mime an action while classmates guess the verb or make a sentence.",
      "Consolidate with a match-the-action worksheet or a Classendo game.",
    ],
    teachingFocus: ["Start with commands learners can physically follow, then change the grammar without changing the pictures: ‘Jump!’, ‘Can you jump?’, and ‘She is jumping.’", "Contrast similar actions such as walk and run or read and write. This gives learners a reason to listen closely as well as move."],
    classroomLanguage: ["Can you swim? Yes, I can.", "What is he doing? He is reading.", "Please walk, don’t run.", "She can dance, but she can’t sing."],
    activityIdeas: [
      { title: "Action charades", description: "One learner mimes a card while the class guesses the verb or makes a present continuous sentence." },
      { title: "Listen and move", description: "Call one action for the whole class, then introduce a distractor card to test careful listening." },
      { title: "Can you…? circle", description: "Learners ask a partner a question from a card and respond with a full yes/no answer before changing partners." },
    ],
    resources: [
      { href: "/free-resources/active-verbs-beginner-esl", label: "Action verbs lesson pack", description: "A printable beginner lesson built around high-frequency verbs." },
      { href: "/flashcards", label: "Build action flashcards", description: "Select movement and classroom action verbs for a live activity." },
    ],
  },
  {
    slug: "clothes",
    title: "Clothes Flashcards and ESL Activities for Teachers",
    shortTitle: "Clothes",
    description: "Teach clothing vocabulary with illustrated flashcards, speaking games, and printable ESL activities for young learners.",
    intro: "Clothes vocabulary gives learners useful language for describing people, choosing outfits, and talking about the weather. Illustrated clothing cards let beginners practise specific items before combining them into longer descriptions.",
    vocabulary: ["shirt", "t-shirt", "dress", "skirt", "shoes", "hat", "jacket", "socks"],
    classroomIdea: "Describe a card with ‘He is wearing…’ or ‘She is wearing…’ and have learners find the matching item.",
    worksheetIdea: "Make a dress-for-the-weather or label-the-outfit worksheet.",
    teachingFocus: ["Teach clothing in outfits rather than as one long list. A simple person card can prompt several phrases: a blue shirt, black shoes, and a red hat.", "Link clothes to weather and occasions so the vocabulary has a purpose. Learners can decide what to wear for a rainy day, a beach trip, or school."],
    classroomLanguage: ["What is she wearing? She is wearing a dress.", "Put on your jacket.", "I wear boots when it rains.", "He has got a blue hat."],
    activityIdeas: [
      { title: "Dress the character", description: "Give pairs a weather or event card and a set of clothes cards. They build an outfit and explain their choices." },
      { title: "What changed?", description: "Show a character with several clothing cards, hide one, and ask learners to identify the missing item." },
      { title: "Classroom fashion show", description: "Learners describe a card character or a simple outfit drawing using colour and clothing words." },
    ],
    resources: [
      { href: "/free-resources/clothing-vocabulary-beginner-esl", label: "Clothing vocabulary lesson pack", description: "A printable beginner clothes lesson." },
      { href: "/flashcards", label: "Build clothes flashcards", description: "Choose clothing and weather vocabulary for an interactive set." },
    ],
  },
  {
    slug: "body",
    title: "Body Parts Flashcards and ESL Activities",
    shortTitle: "Body Parts",
    description: "Teach body part vocabulary with visual flashcards, active classroom games, and printable ESL activities.",
    intro: "Body-part vocabulary works well with young learners because every new word can be touched, pointed to, or used in a movement game. Visual cards help classes practise listening instructions, simple descriptions, and health-related language.",
    vocabulary: ["head", "eyes", "ears", "nose", "mouth", "hands", "legs", "feet"],
    classroomIdea: "Use a ‘Touch your…’ listening game, then let learners lead the instructions for the class.",
    worksheetIdea: "Create a label-the-body or draw-and-colour worksheet using the selected cards.",
    teachingFocus: ["Use actions immediately after introducing each word: touch your nose, clap your hands, and stamp your feet. This checks understanding without needing translation.", "Body cards also provide a gentle route into simple health phrases and descriptions: ‘My leg hurts’ or ‘She has blue eyes’, depending on the level and age group."],
    classroomLanguage: ["Touch your ears.", "How many hands have you got?", "I have got two feet.", "My head hurts."],
    activityIdeas: [
      { title: "Body-part relay", description: "Show a card, then teams touch the named body part before the next learner runs to the board." },
      { title: "Draw and label", description: "Pairs draw a simple monster and label the body parts, adding funny features for extra speaking." },
      { title: "Doctor says", description: "Use a toy doctor or role play: one learner points to a card and the other gives a simple response." },
    ],
    resources: [
      { href: "/free-resources/body-parts-vocabulary-beginner-esl", label: "Body parts lesson pack", description: "A printable beginner body-vocabulary lesson." },
      { href: "/flashcards", label: "Build body-part flashcards", description: "Choose body and health vocabulary for an interactive set." },
    ],
  },
];

export function getTopic(slug: string) {
  return TOPICS.find((topic) => topic.slug === slug);
}
