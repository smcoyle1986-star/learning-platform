export type TwelveCardLessonPack = {
  slug: string;
  title: string;
  topic: string;
  type: "noun" | "verb" | "adjective" | "preposition" | "mixed";
  words: string[];
  level: "A0-A1" | "A1";
  duration: string;
  studyWorksheets: { title: string; description: string }[];
  playWorksheets: { title: string; description: string }[];
  movementGame: { title: string; description: string };
  lessonSteps: string[];
  published: boolean;
  coverImage?: string;
  previewImages?: string[];
  pdfPath?: string;
  seo?: { title: string; description: string; intro: string; targetLanguage: string };
};

const draftPacks: TwelveCardLessonPack[] = [
  {
    slug: "daily-routines-12-card-lesson-pack-beginner-esl",
    title: "Daily Routines",
    topic: "Daily Routines",
    type: "verb",
    words: ["wake up", "get dressed", "brush your teeth", "eat breakfast", "go to school", "study", "play", "eat dinner", "do homework", "read", "watch TV", "sleep"],
    level: "A0-A1",
    duration: "35–45 minutes",
    studyWorksheets: [{ title: "Routine picture match", description: "Match each daily-routine picture to its action." }, { title: "Write and sequence", description: "Write the daily routine from each picture, then put routines in order." }],
    playWorksheets: [{ title: "Classendo four-board tic-tac-toe", description: "Use the official Classendo game page. Say the pictured action correctly before writing X or O." }, { title: "Classendo bullseye", description: "Use the official Classendo game page. Drop a token, say the target sentence, then take the printed score." }],
    movementGame: { title: "Human Routine Line", description: "Learners arrange themselves in daily order, then say their action to the class." },
    lessonSteps: ["Introduce the image-only flashcards.", "Practise with the image-and-word cards.", "Complete a study worksheet together or in pairs.", "Use a play worksheet for supported speaking practice.", "Finish with the movement game and a quick review."],
    published: true,
    coverImage: "/resources/daily-routines-12-card-lesson-pack-beginner-esl/daily-routines-12-card-lesson-pack-beginner-esl-cover.png",
    previewImages: [
      "/resources/daily-routines-12-card-lesson-pack-beginner-esl/daily-routines-12-card-lesson-pack-beginner-esl-cover.png",
      "/resources/daily-routines-12-card-lesson-pack-beginner-esl/daily-routines-12-card-lesson-pack-beginner-esl-study-preview.png",
      "/resources/daily-routines-12-card-lesson-pack-beginner-esl/daily-routines-12-card-lesson-pack-beginner-esl-play-preview.png",
    ],
    pdfPath: "/free-resources/daily-routines-12-card-lesson-pack-beginner-esl.pdf",
  },
  {
    slug: "food-drinks-cafe-12-card-lesson-pack-beginner-esl",
    title: "Food, Drinks & Café English",
    topic: "Food, Drinks & Café English",
    type: "noun",
    words: ["apple", "banana", "bread", "cheese", "pizza", "rice", "chicken", "water", "milk", "juice", "tea", "coffee"],
    level: "A0-A1",
    duration: "35–45 minutes",
    studyWorksheets: [{ title: "Café menu match", description: "Match food and drink pictures to the menu words." }, { title: "Food wordsearch", description: "Find and circle the target food and drink words." }],
    playWorksheets: [{ title: "Food bingo", description: "Listen for food and drink words, then cover the matching picture." }, { title: "Café bullseye", description: "Drop a token, say the target sentence, then take the printed score." }],
    movementGame: { title: "Café Corners", description: "Learners rotate between café corners to order food and drinks." },
    lessonSteps: ["Present the food and drink flashcards.", "Model simple café requests.", "Use the study worksheets to secure recognition and spelling.", "Play a speaking game with the picture cards.", "End with café role-play rotations."],
    published: true,
    coverImage: "/resources/food-drinks-cafe-12-card-lesson-pack-beginner-esl/food-drinks-cafe-12-card-lesson-pack-beginner-esl-cover.png",
    previewImages: [
      "/resources/food-drinks-cafe-12-card-lesson-pack-beginner-esl/food-drinks-cafe-12-card-lesson-pack-beginner-esl-cover.png",
      "/resources/food-drinks-cafe-12-card-lesson-pack-beginner-esl/food-drinks-cafe-12-card-lesson-pack-beginner-esl-study-preview.png",
      "/resources/food-drinks-cafe-12-card-lesson-pack-beginner-esl/food-drinks-cafe-12-card-lesson-pack-beginner-esl-play-preview.png",
    ],
    pdfPath: "/free-resources/food-drinks-cafe-12-card-lesson-pack-beginner-esl.pdf",
  },
  {
    slug: "classroom-english-actions-12-card-lesson-pack-beginner-esl",
    title: "Classroom English & Actions",
    topic: "Classroom English & Actions",
    type: "verb",
    words: ["listen", "look", "read", "write", "draw", "cut", "glue", "colour", "open", "close", "ask", "answer"],
    level: "A0-A1",
    duration: "30–40 minutes",
    studyWorksheets: [{ title: "Classroom action match-up", description: "Connect each classroom action to its picture." }, { title: "Image-only classroom crossword", description: "Write the correct action from each picture clue." }],
    playWorksheets: [{ title: "Teacher Says grid", description: "Listen, act, and cover the matching action." }, { title: "Classroom tic-tac-toe", description: "Say the action correctly before claiming a square." }],
    movementGame: { title: "Classroom Action Relay", description: "Teams run, find an action card, perform it, and say it." },
    lessonSteps: ["Teach the classroom action cards with gestures.", "Use image-and-word cards for choral practice.", "Complete the recognition worksheet.", "Play the speaking worksheet in pairs.", "Run the action relay for a final active review."],
    published: false,
  },
  {
    slug: "places-town-directions-12-card-lesson-pack-beginner-esl",
    title: "Places in Town & Directions",
    topic: "Places in Town & Directions",
    type: "mixed",
    words: ["school", "park", "hospital", "supermarket", "bank", "library", "station", "post office", "museum", "café", "left", "right"],
    level: "A1",
    duration: "40–50 minutes",
    studyWorksheets: [{ title: "Town map label-and-follow", description: "Label places on the map, then follow simple route instructions." }, { title: "Directions wordsearch", description: "Find the town-place and direction vocabulary." }],
    playWorksheets: [{ title: "Map challenge", description: "Follow a route, say the destination, and move your counter." }, { title: "Directions bullseye", description: "Say the target direction sentence to score." }],
    movementGame: { title: "Walk the Map", description: "Teams follow spoken directions around classroom location stations." },
    lessonSteps: ["Present the town-place cards.", "Add left and right with gestures.", "Practise routes on the map worksheet.", "Use the game worksheet for repeated route language.", "Turn the classroom into a walkable town map."],
    published: false,
  },
  {
    slug: "weather-seasons-clothes-12-card-lesson-pack-beginner-esl",
    title: "Weather, Seasons & Clothes",
    topic: "Weather, Seasons & Clothes",
    type: "mixed",
    words: ["sunny", "rainy", "windy", "snowy", "hot", "cold", "coat", "T-shirt", "boots", "hat", "umbrella", "sunglasses"],
    level: "A0-A1",
    duration: "35–45 minutes",
    studyWorksheets: [{ title: "Weather-and-clothes sort", description: "Match clothing to suitable weather." }, { title: "Visual weather crossword", description: "Write the correct weather or clothing word from each picture." }],
    playWorksheets: [{ title: "Weather spinner", description: "Spin, say the weather, and choose suitable clothes." }, { title: "Weather bingo", description: "Listen, identify, and cover the matching weather or clothing image." }],
    movementGame: { title: "Weather Forecast Walk", description: "Move to a weather corner and say what you wear there." },
    lessonSteps: ["Teach weather and clothing with visual contrasts.", "Sort what to wear for each weather condition.", "Complete the study worksheets.", "Use the game worksheets for spoken repetition.", "Finish with a moving weather forecast."],
    published: false,
  },
  {
    slug: "body-health-feelings-12-card-lesson-pack-beginner-esl",
    title: "Body, Health & Feelings",
    topic: "Body, Health & Feelings",
    type: "mixed",
    words: ["head", "eyes", "ears", "mouth", "hands", "feet", "tired", "hungry", "thirsty", "happy", "sad", "sick"],
    level: "A0-A1",
    duration: "35–45 minutes",
    studyWorksheets: [{ title: "Body label worksheet", description: "Label the body picture, then connect feeling words to faces." }, { title: "Feelings picture match", description: "Match the health and feeling pictures to words." }],
    playWorksheets: [{ title: "Doctor role-play board", description: "Say what is wrong or how you feel before moving." }, { title: "Feelings tic-tac-toe", description: "Say the pictured word correctly before claiming a square." }],
    movementGame: { title: "Find Someone Who…", description: "Mingle and ask classmates simple feeling questions." },
    lessonSteps: ["Introduce body vocabulary using pointing gestures.", "Add feelings and health words with facial expressions.", "Use the study pages for accuracy.", "Practise questions and answers through the games.", "Close with a supported classroom mingle."],
    published: false,
  },
  {
    slug: "jobs-community-helpers-12-card-lesson-pack-beginner-esl",
    title: "Jobs & Community Helpers",
    topic: "Jobs & Community Helpers",
    type: "noun",
    words: ["teacher", "doctor", "nurse", "firefighter", "police officer", "chef", "farmer", "driver", "artist", "vet", "builder", "dentist"],
    level: "A0-A1",
    duration: "35–45 minutes",
    studyWorksheets: [{ title: "Jobs and workplaces", description: "Match each community helper to a workplace picture." }, { title: "Jobs wordsearch", description: "Find the job names in the grid." }],
    playWorksheets: [{ title: "Who am I?", description: "Use a picture clue and a simple description to guess the job." }, { title: "Jobs bullseye", description: "Say the job word or sentence, then take the printed score." }],
    movementGame: { title: "Job Charades & Interviews", description: "Mime a job, then ask and answer a simple interview question." },
    lessonSteps: ["Present the job cards and key workplace language.", "Practise job names with image-and-word cards.", "Use the study worksheets for controlled recognition.", "Play the guessing and speaking worksheets.", "Finish with charades and short interviews."],
    published: false,
  },
  {
    slug: "home-rooms-furniture-12-card-lesson-pack-beginner-esl",
    title: "Home, Rooms & Furniture",
    topic: "Home, Rooms & Furniture",
    type: "noun",
    words: ["house", "kitchen", "bedroom", "bathroom", "living room", "table", "chair", "bed", "sofa", "lamp", "fridge", "door"],
    level: "A0-A1",
    duration: "35–45 minutes",
    studyWorksheets: [{ title: "Rooms and furniture sort", description: "Put each furniture item in the correct room." }, { title: "Home picture crossword", description: "Write the home word shown in each picture." }],
    playWorksheets: [{ title: "Home bingo", description: "Listen for home vocabulary and cover the matching picture." }, { title: "Home tic-tac-toe", description: "Say the word correctly before taking a square." }],
    movementGame: { title: "Furniture Hunt", description: "Find cards around the room and say where each item belongs." },
    lessonSteps: ["Teach rooms first, then add furniture.", "Use the large cards for pointing and sorting.", "Complete the study pages.", "Play the vocabulary games in pairs.", "Finish with a classroom furniture hunt."],
    published: false,
  },
  {
    slug: "transport-travel-holidays-12-card-lesson-pack-beginner-esl",
    title: "Transport, Travel & Holidays",
    topic: "Transport, Travel & Holidays",
    type: "noun",
    words: ["car", "bus", "train", "plane", "bike", "boat", "taxi", "suitcase", "ticket", "hotel", "beach", "map"],
    level: "A0-A1",
    duration: "35–45 minutes",
    studyWorksheets: [{ title: "Transport sort", description: "Sort transport by land, air, and water." }, { title: "Travel wordsearch", description: "Find travel and holiday words in the grid." }],
    playWorksheets: [{ title: "Travel route game", description: "Choose transport, say the word, and move along the route." }, { title: "Travel bullseye", description: "Say the target travel sentence to score." }],
    movementGame: { title: "Travel Stations", description: "Move between transport stations and say where you are going." },
    lessonSteps: ["Present transport and travel-item cards.", "Group transport by how it travels.", "Use the study pages to reinforce categories and spelling.", "Play the route and bullseye games.", "End with moving travel-station conversations."],
    published: false,
  },
  {
    slug: "appearance-personality-12-card-lesson-pack-beginner-esl",
    title: "Appearance & Personality",
    topic: "Appearance & Personality",
    type: "adjective",
    words: ["tall", "short", "young", "old", "long hair", "short hair", "friendly", "funny", "kind", "shy", "clever", "helpful"],
    level: "A1",
    duration: "40–50 minutes",
    studyWorksheets: [{ title: "Draw and describe", description: "Draw a character and choose words to describe them." }, { title: "Adjective picture match", description: "Match appearance and personality words to the correct picture." }],
    playWorksheets: [{ title: "Guess Who? descriptions", description: "Use simple descriptions to identify the character." }, { title: "Description tic-tac-toe", description: "Say the pictured adjective before claiming a square." }],
    movementGame: { title: "Find Your Character", description: "Mingle with description clues until you find your matching character." },
    lessonSteps: ["Present the appearance and personality cards.", "Model a simple two-adjective description.", "Use the study worksheets to build word recognition.", "Play the description games with partner support.", "Finish with the mingle and a class recap."],
    published: false,
  },
];

type PublishedSeed = [slug: string, title: string, topic: string, type: TwelveCardLessonPack["type"], words: string[], targetLanguage: string, movementGame: string, intro: string];

const publishedSeeds: PublishedSeed[] = [
  ["daily-routines-12-card-lesson-pack-beginner-esl", "Daily Routines", "daily routine verbs", "verb", ["wake up", "get dressed", "brush your teeth", "eat breakfast", "go to school", "study", "play", "eat dinner", "do homework", "read", "watch TV", "sleep"], "What do you do in the morning? I ___.", "Human Routine Line", "Teach familiar daily actions in a clear sequence, then help beginner learners describe their own routine with simple, useful English."],
  ["food-drinks-cafe-12-card-lesson-pack-beginner-esl", "Food, Drinks & Cafe English", "food, drinks and cafe English", "noun", ["apple", "banana", "bread", "cheese", "pizza", "rice", "chicken", "water", "milk", "juice", "tea", "coffee"], "Can I have ___, please?", "Cafe Corners", "Build food and drink vocabulary before giving learners supported practice with simple cafe requests and responses."],
  ["classroom-english-actions-12-card-lesson-pack-beginner-esl", "Classroom English & Actions", "classroom action verbs", "verb", ["listen", "look", "read", "write", "draw", "cut", "glue", "color", "open", "ask", "answer", "raise your hand"], "Please ___.", "Classroom Action Relay", "Make everyday classroom English meaningful through visual action cards, writing practice, speaking games and an active relay."],
  ["places-town-directions-12-card-lesson-pack-beginner-esl", "Places in Town & Directions", "places in town and directions", "mixed", ["school", "park", "hospital", "supermarket", "bank", "library", "zoo", "post office", "museum", "cafe", "turn left", "turn right"], "Where is the ___? Turn ___.", "Walk the Map", "Introduce useful town places and simple direction language with a visual, beginner-friendly map and movement activity."],
  ["weather-12-card-lesson-pack-beginner-esl", "Weather", "weather vocabulary", "noun", ["sunny", "stormy", "windy", "blizzard", "cloudy", "raining", "hot", "warm", "cold", "foggy", "lightning", "rainbow"], "How is the weather? It is ___.", "Weather Forecast Walk", "Give beginners the language to name common weather conditions and respond to a simple weather question."],
  ["clothes-12-card-lesson-pack-beginner-esl", "Clothes", "clothes vocabulary", "noun", ["t-shirt", "shirt", "dress", "skirt", "jeans", "shorts", "jacket", "coat", "hat", "socks", "shoes", "boots"], "I am wearing ___.", "Clothes Forecast Walk", "Use familiar clothing vocabulary to support simple descriptions, sorting and speaking about what learners wear."],
  ["body-health-12-card-lesson-pack-beginner-esl", "Body & Health", "body and health vocabulary", "noun", ["head", "eyes", "ears", "mouth", "hand", "feet", "headache", "toothache", "medicine", "tired", "hungry", "thirsty"], "My ___ hurts. I feel ___.", "Health Helper Relay", "Help learners name body parts and communicate simple health needs with clear visual support and controlled speaking."],
  ["feelings-12-card-lesson-pack-beginner-esl", "Feelings", "feelings vocabulary", "adjective", ["happy", "sad", "angry", "scared", "tired", "hungry", "thirsty", "excited", "bored", "worried", "surprised"], "How do you feel? I feel ___.", "Feelings Mingle", "Give beginner learners confident language for recognising, naming and talking about everyday feelings."],
  ["jobs-12-card-lesson-pack-beginner-esl", "Jobs", "jobs and community helpers", "noun", ["teacher", "doctor", "nurse", "firefighter", "police officer", "chef", "farmer", "mechanic", "artist", "vet", "builder", "dentist"], "What does a ___ do? A ___ ___.", "Job Interview Relay", "Present common jobs and community helpers, then guide learners into simple questions, answers and job role-play."],
  ["rooms-at-home-12-card-lesson-pack-beginner-esl", "Rooms at Home", "rooms at home vocabulary", "noun", ["home", "kitchen", "bedroom", "bathroom", "living room", "dining room", "garage", "balcony", "basement", "attic", "door", "window"], "Where is the ___? It is in the ___.", "Room Hunt", "Teach familiar rooms and home words while practising simple location sentences that beginners can use right away."],
  ["transport-12-card-lesson-pack-beginner-esl", "Transport", "transport vocabulary", "noun", ["car", "bus", "train", "airplane", "bike", "boat", "taxi", "truck", "scooter", "helicopter", "van", "subway"], "How do you go? I go by ___.", "Transport Stations", "Build practical transport vocabulary and give learners repeated speaking practice for talking about how they travel."],
  ["appearance-hair-looks-12-card-lesson-pack-beginner-esl", "Appearance: Hair & Looks", "appearance and hair vocabulary", "adjective", ["curly hair", "straight hair", "wavy hair", "long hair", "short hair", "medium-length hair", "pigtails", "ponytail", "bald", "handsome", "pretty", "cute"], "He or she has ___.", "Find Your Look", "Use visual appearance vocabulary to help learners describe people with simple, respectful beginner English."],
  ["family-12-card-lesson-pack-beginner-esl", "Family", "family vocabulary", "noun", ["mother", "father", "sister", "brother", "grandmother", "grandfather", "aunt", "uncle", "cousin", "baby", "child", "teenager"], "Who is this? This is my ___.", "Family Circle", "Introduce the family words learners need to identify relatives and share simple information about their own family."],
  ["farm-animals-12-card-lesson-pack-beginner-esl", "Farm Animals", "farm animal vocabulary", "noun", ["cow", "sheep", "goat", "horse", "duck", "donkey", "rabbit", "turkey", "calf", "lamb", "goose", "chick"], "What animal is it? It is a ___.", "Farm Animal Round-Up", "Teach animals that live and work with people through engaging picture cards, writing tasks and farm-themed speaking play."],
  ["wild-animals-12-card-lesson-pack-beginner-esl", "Wild Animals", "wild animal vocabulary", "noun", ["lion", "tiger", "elephant", "giraffe", "monkey", "zebra", "bear", "crocodile", "snake", "hippo", "panda", "wolf"], "What animal is it? It is a ___.", "Wild Animal Safari", "Bring a beginner wild-animal lesson to life with vivid visual vocabulary, games and an active safari review."],
  ["sea-animals-12-card-lesson-pack-beginner-esl", "Sea Animals", "sea animal vocabulary", "noun", ["fish", "shark", "whale", "dolphin", "octopus", "crab", "turtle", "seahorse", "jellyfish", "starfish", "seal", "lobster"], "What can you see? I can see a ___.", "Ocean Swim", "Teach familiar sea animals while giving beginners a useful question and answer pattern for talking about what they can see."],
  ["pets-12-card-lesson-pack-beginner-esl", "Pets", "pet animal vocabulary", "noun", ["dog", "cat", "rabbit", "fish", "bird", "turtle", "hamster", "parrot", "puppy", "kitten", "mouse", "bunny"], "Do you have a pet? Yes, I do. I have a ___.", "Pet Home Hunt", "Help learners name pets, answer a personal yes-or-no question and talk about the pet they want."],
  ["classroom-12-card-lesson-pack-beginner-esl", "Classroom", "classroom object vocabulary", "noun", ["pencil", "pen", "eraser", "ruler", "notebook", "paper", "scissors", "glue", "desk", "chair", "marker", "pencil case"], "What is this? It is a ___.", "Classroom Supply Hunt", "Give learners the essential classroom-object vocabulary they need for everyday English lessons and practical requests."],
  ["fruit-12-card-lesson-pack-beginner-esl", "Fruit", "fruit vocabulary", "noun", ["apple", "banana", "orange", "strawberry", "watermelon", "pineapple", "pear", "peach", "lemon", "mango", "cherry", "kiwi"], "What fruit do you like? I like ___.", "Fruit Basket Relay", "Introduce a colourful range of fruit words and support learners in saying which fruit they like."],
  ["vegetables-12-card-lesson-pack-beginner-esl", "Vegetables", "vegetable vocabulary", "noun", ["carrot", "potato", "tomato", "onion", "broccoli", "cucumber", "lettuce", "corn", "pepper", "mushroom", "cabbage", "pumpkin"], "Do you like ___? Yes, I do. / No, I don't.", "Vegetable Market Relay", "Build useful vegetable vocabulary and simple preference language through pictures, worksheets and a market-themed movement game."],
  ["things-at-home-12-card-lesson-pack-beginner-esl", "Things at Home", "things at home vocabulary", "noun", ["bed", "sofa", "chair", "lamp", "oven", "sink", "shower", "mirror", "wardrobe", "clock", "door", "window"], "Where is the ___? It is in the ___.", "Home Hunt", "Teach the everyday objects learners see at home and reinforce simple language for saying where things are."],
  ["opposites-12-card-lesson-pack-beginner-esl", "Opposites", "opposite adjectives", "adjective", ["big", "small", "hot", "cold", "fast", "slow", "old", "young", "clean", "dirty", "happy", "sad"], "Is it ___ or ___? It is ___.", "Opposites Dash", "Use clear visual contrasts to make basic opposite adjectives memorable, meaningful and easy to say."],
  ["months-of-the-year-12-card-lesson-pack-beginner-esl", "Months of the Year", "months of the year", "noun", ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"], "What month is it? It is ___.", "Month Line-Up", "Teach all twelve months in order and give learners structured practice asking and answering a simple calendar question."],
  ["time-oclock-12-card-lesson-pack-beginner-esl", "Time - O'Clock", "o'clock times", "noun", ["one o'clock", "two o'clock", "three o'clock", "four o'clock", "five o'clock", "six o'clock", "seven o'clock", "eight o'clock", "nine o'clock", "ten o'clock", "eleven o'clock", "twelve o'clock"], "What time is it? It's ___ o'clock.", "Clock Line-Up", "Use visual clock faces to teach the twelve o'clock times and support beginner questions, answers and ordered speaking."],
  ["sports-12-card-lesson-pack-beginner-esl", "Sports", "sports vocabulary", "noun", ["baseball", "basketball", "bowling", "golf", "soccer", "tennis", "badminton", "American football", "cricket", "darts", "ice hockey", "ice skating"], "What sport do you like? I like ___.", "Sports Team Relay", "Teach twelve real sports cards and help learners say their preferences through visual practice, Classendo games and a team relay."],
];

const PDF_STORAGE_BASE_URL =
  "https://tsccyjrniiamnwgrtvpw.supabase.co/storage/v1/object/public/free-resources/12-card-packs";

const publishedPacks: TwelveCardLessonPack[] = publishedSeeds.map(([slug, title, topic, type, words, targetLanguage, movementTitle, intro]) => ({
  slug, title, topic, type, words, level: "A0-A1", duration: "35-45 minutes", published: true,
  studyWorksheets: [{ title: "Picture match", description: `Match each ${topic} picture to the correct word.` }, { title: "Write and respond", description: `Write the ${topic} words, then complete and say the target language.` }],
  playWorksheets: [{ title: "Classendo four-board Tic-Tac-Toe", description: "Say the pictured card correctly before writing X or O." }, { title: "Classendo Bullseye", description: "Drop a token, say the target sentence, then take the printed score." }],
  movementGame: { title: movementTitle, description: `An active speaking review using the ${topic} cards and target language.` },
  lessonSteps: ["Present the image-only flashcards.", "Practise with the image-and-word cards.", "Complete the two study worksheets.", "Use the official Classendo play worksheets for supported speaking.", `Finish with ${movementTitle} and a spoken review.`],
  coverImage: `/resources/${slug}/${slug}-cover.png`,
  previewImages: [`/resources/${slug}/${slug}-cover.png`, `/resources/${slug}/${slug}-study-preview.png`, `/resources/${slug}/${slug}-play-preview.png`],
  pdfPath: `${PDF_STORAGE_BASE_URL}/${slug}.pdf`,
  seo: { title: `Free ${title} ESL Lesson Pack: 12 Flashcards & Worksheets`, description: `Download a free printable ${title} ESL lesson pack with 12 visual flashcards, writing worksheets, Classendo speaking games and a movement activity.`, intro, targetLanguage },
}));

export const TWELVE_CARD_LESSON_PACKS = publishedPacks;
export const PUBLISHED_TWELVE_CARD_LESSON_PACKS = publishedPacks;

export function getTwelveCardLessonPack(slug: string) {
  return PUBLISHED_TWELVE_CARD_LESSON_PACKS.find((pack) => pack.slug === slug);
}
