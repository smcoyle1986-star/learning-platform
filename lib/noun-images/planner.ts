import {
  NounCountability,
  NounImageOverride,
  NounVariantDefinition,
  NounVariantNumber,
} from "@/lib/noun-images/types";
import {
  getVariantDefinitions,
  resolveEffectiveCountability,
} from "@/lib/noun-images/variants";

const PLACE_NOUNS = new Set(["airport", "amusement park", "aquarium"]);
const TIME_NOUNS = new Set(["afternoon", "april"]);
const DATES_NOUNS = new Set([
  "april",
  "august",
  "birthday",
  "christmas",
  "december",
  "february",
  "friday",
  "halloween",
  "january",
  "july",
  "june",
  "march",
  "may",
  "monday",
  "november",
  "october",
  "saturday",
  "september",
  "sunday",
  "thursday",
  "tuesday",
  "wednesday",
]);
const FAMILY_NOUNS = new Set([
  "aunt",
  "baby",
  "brother",
  "cousin",
  "family friend",
  "father",
  "grandfather",
  "grandmother",
  "mother",
  "sister",
  "uncle",
]);
const JOBS_NOUNS = new Set([
  "architect",
  "artist",
  "astronaut",
  "athlete",
  "baker",
  "barber",
  "baseball player",
  "basketball player",
  "builder",
  "bus driver",
  "carpenter",
  "cashier",
  "chef",
  "cook",
  "dentist",
  "doctor",
  "engineer",
  "farmer",
  "firefighter",
  "hair dresser",
  "judge",
  "king",
  "lawyer",
  "mail carrier",
  "mechanic",
  "musician",
  "nurse",
  "office worker",
  "photographer",
  "pilot",
  "police officer",
  "professor",
  "programmer",
  "queen",
  "scientist",
  "singer",
  "soccer player",
  "soldier",
  "student",
  "taxi driver",
  "teacher",
  "vet",
  "waiter",
  "writer",
  "youtuber",
]);
const DRINK_NOUNS = new Set([
  "coffee",
  "hot chocolate",
  "iced coffee",
  "iced tea",
  "juice",
  "lemonade",
  "milk",
  "milkshake",
  "smoothie",
  "soda",
  "tea",
  "water",
]);
const PROFESSION_NOUNS = new Set(["adult", "architect"]);
const FRUIT_NOUNS = new Set([
  "apple",
  "avocado",
  "banana",
  "blackberry",
  "cherry",
  "coconut",
  "grapefruit",
  "grapes",
  "kiwi",
  "lemon",
  "mango",
  "melon",
  "orange",
  "peach",
  "pear",
  "pineapple",
  "plum",
  "strawberry",
  "watermelon",
]);
const VEGETABLE_NOUNS = new Set([
  "broccoli",
  "cabbage",
  "carrot",
  "chilli",
  "corn",
  "cucumber",
  "eggplant",
  "garlic",
  "lettuce",
  "mushroom",
  "onion",
  "pepper",
  "potato",
  "pumpkin",
  "spinach",
  "tomato",
  "turnip",
  "zucchini",
]);
const ANIMALS_BABY_NOUNS = new Set([
  "bear cub",
  "bunny",
  "calf",
  "chick",
  "duckling",
  "foal",
  "joey",
  "kid",
  "kitten",
  "lamb",
  "lion cub",
  "piglet",
  "puppy",
  "tadpole",
  "tiger cub",
]);
const ANIMALS_LAND_NOUNS = new Set([
  "bear",
  "bird",
  "cat",
  "chicken",
  "cow",
  "crocodile",
  "deer",
  "dog",
  "donkey",
  "duck",
  "eagle",
  "elephant",
  "fox",
  "frog",
  "giraffe",
  "goat",
  "goose",
  "gorilla",
  "hamster",
  "hedgehog",
  "hippo",
  "horse",
  "kangaroo",
  "koala",
  "lion",
  "monkey",
  "mouse",
  "owl",
  "panda",
  "parrot",
  "penguin",
  "rabbit",
  "rat",
  "rhino",
  "sheep",
  "snake",
  "squirrel",
  "swan",
  "tiger",
  "tortoise",
  "turkey",
  "wolf",
  "zebra",
]);
const ANIMALS_SEA_NOUNS = new Set([
  "clam",
  "crab",
  "dolphin",
  "fish",
  "jellyfish",
  "lobster",
  "octopus",
  "orca",
  "seahorse",
  "seal",
  "seashell",
  "shark",
  "shrimp",
  "squid",
  "starfish",
  "stingray",
  "turtle",
  "whale",
]);
const BODY_NOUNS = new Set([
  "arm",
  "body",
  "ears",
  "eyes",
  "face",
  "feet",
  "finger",
  "foot",
  "hair",
  "hand",
  "head",
  "leg",
  "mouth",
  "nose",
  "teeth",
  "toe",
  "tooth",
]);
const CLASSROOM_NOUNS = new Set([
  "chair",
  "colored pencils",
  "computer",
  "crayon",
  "desk",
  "eraser",
  "glue",
  "marker",
  "notebook",
  "paper",
  "paper clip",
  "pen",
  "pencil",
  "pencil case",
  "pencil sharpener",
  "projector",
  "ruler",
  "school bag",
  "scissors",
  "stapler",
  "textbook",
  "trash can",
  "white board",
  "workbook",
]);
const CLOTHES_NOUNS = new Set([
  "belt",
  "blazer",
  "boots",
  "cap",
  "coat",
  "dress",
  "face mask",
  "gillet",
  "glasses",
  "gloves",
  "hat",
  "hoodie",
  "jacket",
  "jeans",
  "pants",
  "scarf",
  "school uniform",
  "shirt",
  "shoes",
  "shorts",
  "skirt",
  "sneakers",
  "socks",
  "sunglasses",
  "sweater",
  "swimsuit",
  "t-shirt",
  "tie",
  "vest",
  "watch",
]);
const BODY_CHARACTER_REFERENCE_PATHS = [
  "/Users/Sean/Desktop/kai.png",
  "/Users/Sean/Desktop/leo.png",
  "/Users/Sean/Desktop/lily.png",
  "/Users/Sean/Desktop/maya.png",
  "/Users/Sean/Desktop/owen.png",
  "/Users/Sean/Desktop/zara.png",
];

function selectBodyCharacterReference(lemma: string, variantNumber: NounVariantNumber) {
  const seed = `${lemma}:${variantNumber}`;
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return BODY_CHARACTER_REFERENCE_PATHS[hash % BODY_CHARACTER_REFERENCE_PATHS.length];
}

function selectClassroomCharacterReference(lemma: string, variantNumber: NounVariantNumber) {
  const seed = `classroom:${lemma}:${variantNumber}`;
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return BODY_CHARACTER_REFERENCE_PATHS[hash % BODY_CHARACTER_REFERENCE_PATHS.length];
}

function selectFamilyCharacterReference(lemma: string, variantNumber: NounVariantNumber) {
  const seed = `family:${lemma}:${variantNumber}`;
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return BODY_CHARACTER_REFERENCE_PATHS[hash % BODY_CHARACTER_REFERENCE_PATHS.length];
}

function selectJobsCharacterReference(lemma: string, variantNumber: NounVariantNumber) {
  const seed = `jobs:${lemma}:${variantNumber}`;
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return BODY_CHARACTER_REFERENCE_PATHS[hash % BODY_CHARACTER_REFERENCE_PATHS.length];
}

export const nounImageOverrides: Record<string, NounImageOverride> = {
  aunt: {
    variants: [1, 2, 3],
    promptProfile: "family",
    variantPromptNotes: {
      1: "Show one aunt only as a friendly adult woman. Give her a clearly medium-brown skin tone, a unique hairstyle, and simple everyday clothes. Her full figure must fit comfortably in frame. She should look warm, approachable, and clearly like an aunt figure.",
    },
    useStyleReference: false,
  },
  baby: {
    variants: [1, 2, 3],
    promptProfile: "family",
    variantPromptNotes: {
      1: "Show one baby only as a cute, happy, clearly baby-aged child. Give the baby a clearly light tan skin tone, very small proportions, and soft baby features. The whole baby must fit comfortably in frame. Keep the baby unique and friendly.",
    },
    useStyleReference: false,
  },
  brother: {
    variants: [1, 2, 3],
    promptProfile: "family",
    variantPromptNotes: {
      1: "Show one brother only as a friendly boy child. Give him a clearly deep brown skin tone, a unique hairstyle, and simple child-friendly clothes. His full figure must fit comfortably in frame. He should look clearly like a brother and different from the other family characters.",
    },
    useStyleReference: false,
  },
  cousin: {
    variants: [1, 2, 3],
    promptProfile: "family",
    variantPromptNotes: {
      1: "Show one cousin only as a friendly child. Give the cousin a clearly light brown skin tone, a unique hairstyle, and simple casual clothes. The full figure must fit comfortably in frame. Keep the cousin gender-neutral or broadly relatable.",
    },
    useStyleReference: false,
  },
  "family friend": {
    variants: [1, 2, 3],
    promptProfile: "family",
    variantPromptNotes: {
      1: "Show one family friend only as a friendly adult person. Give them a clearly medium tan skin tone, a unique hairstyle, and casual everyday clothes. The entire full figure must be clearly visible from head to toe with extra empty space around the top and bottom so nothing is cropped. Keep this person slightly smaller in frame than the other family images. They should look warm and approachable.",
    },
    useStyleReference: false,
  },
  father: {
    variants: [1, 2, 3],
    promptProfile: "family",
    variantPromptNotes: {
      1: "Show one father only as a friendly adult man. Give him a clearly dark brown skin tone, a unique hairstyle, and simple everyday father-style clothing. His full figure must fit comfortably in frame. He should look clearly like a father figure.",
    },
    useStyleReference: false,
  },
  grandfather: {
    variants: [1, 2, 3],
    promptProfile: "family",
    variantPromptNotes: {
      1: "Show one grandfather only as a friendly older man. Give him a clearly light tan skin tone, gray or white hair, and simple older-person everyday clothes. His full figure must fit comfortably in frame. He should look clearly like a grandfather.",
    },
    useStyleReference: false,
  },
  grandmother: {
    variants: [1, 2, 3],
    promptProfile: "family",
    variantPromptNotes: {
      1: "Show one grandmother only as a friendly older woman. Give her a clearly medium-brown skin tone, gray or white hair, and simple older-person everyday clothes. Her full figure must fit comfortably in frame. She should look clearly like a grandmother.",
    },
    useStyleReference: false,
  },
  mother: {
    variants: [1, 2, 3],
    promptProfile: "family",
    variantPromptNotes: {
      1: "Show one mother only as a friendly adult woman. Give her a clearly olive or light brown skin tone, a unique hairstyle, and simple everyday mother-style clothing. Her full figure must fit comfortably in frame. She should look clearly like a mother figure.",
    },
    useStyleReference: false,
  },
  sister: {
    variants: [1, 2, 3],
    promptProfile: "family",
    variantPromptNotes: {
      1: "Show one sister only as a friendly girl child. Give her a clearly fair or light tan skin tone, a unique hairstyle, and simple child-friendly clothes. Her full figure must fit comfortably in frame. She should look clearly like a sister and different from the other family characters.",
    },
    useStyleReference: false,
  },
  uncle: {
    variants: [1, 2, 3],
    promptProfile: "family",
    variantPromptNotes: {
      1: "Show one uncle only as a friendly adult man. Give him a clearly deep tan skin tone, a unique hairstyle, and simple everyday clothes. His full figure must fit comfortably in frame. He should look clearly like an uncle figure.",
    },
    useStyleReference: false,
  },
  coffee: {
    variants: [1, 2, 3],
    promptProfile: "drink",
    variantPromptNotes: {
      1: "Show one simple takeaway coffee mug only. Make the cup shape very clear. Show light creamy coffee visible at the top in a pale tan or latte color, not a dark brown blob, not black coffee, and not muddy brown.",
      2: "Show one coffee pot only. The container silhouette must be very clear. The coffee must not spill or merge into the pot shape. If the coffee is visible, it must be a light creamy tan coffee color, not dark brown.",
      3: "Show four or five matching takeaway coffee cups only. Separate the cups enough to see each one clearly. Do not mix container types. Any visible coffee should be a light creamy tan or latte color, not dark brown.",
    },
  },
  "hot chocolate": {
    variants: [1, 2, 3],
    promptProfile: "drink",
    variantPromptNotes: {
      1: "Show one mug of hot chocolate only. The mug must be white and the mug shape must be very clear. Show warm light chocolate color at the top, not dark muddy brown, with soft creamy shading. No writing, no labels, and no extra objects.",
      2: "Show one large hot chocolate pot heating on a stove only. The hot chocolate must not spill or merge into the pot. Use a warm light chocolate tone, not dark brown. The pot must be metallic in color and sit on top of a red glowing induction stove. No writing, no labels, and no extra objects.",
      3: "Show four or five mugs of hot chocolate together on a tray only. Separate the mugs enough to read clearly. Use the same mug type in different bright colors with the same warm light hot chocolate style in each mug. No writing, no labels, and no extra objects.",
    },
  },
  "iced coffee": {
    variants: [1, 2, 3],
    promptProfile: "drink",
    variantPromptNotes: {
      1: "Show one clear cup of iced coffee only. Serve it in a transparent plastic cup with visible ice cubes. Use a light creamy coffee color, not dark muddy brown. No writing, no labels, and no extra objects.",
      2: "Show one large jug or pitcher of iced coffee only. Keep the container silhouette clear. Show visible iced coffee and ice cubes in a light creamy coffee tone, not dark brown. No writing, no labels, and no extra objects.",
      3: "Show four or five plastic cups of iced coffee together on a counter only. Separate the cups enough to read clearly. Use the same cup type and the same drink style, with visible ice cubes and a light creamy coffee color. No writing, no labels, and no extra objects.",
    },
  },
  "iced tea": {
    variants: [1, 2, 3],
    promptProfile: "drink",
    variantPromptNotes: {
      1: "Show one glass of iced tea only. The glass shape must be very clear and the glass must be clear transparent blue in color. Add a slice of lemon on the glass. Show visible ice cubes and a light amber tea color, not muddy brown. No writing, no labels, and no extra objects.",
      2: "Show one pitcher of iced tea only. Keep the container silhouette very clear. Show visible iced tea, ice cubes, and a slice of lemon. Use a light amber tea tone. The pitcher must be a light clear blue color. No writing, no labels, and no extra objects.",
      3: "Show four or five bottled iced teas only. Separate the bottles enough to read clearly. Use the same bottle type and the same drink style with a light amber tea color. The bottles must be clear with a yellow label across the front and no writing. No extra objects.",
    },
  },
  juice: {
    variants: [1, 2, 3],
    promptProfile: "drink",
    variantPromptNotes: {
      1: "Show one clear glass of orange juice only. Use a bright orange juice color and a very clear glass shape. No writing, no labels, and no extra objects.",
      2: "Show one jug or pitcher of orange juice only. Keep the container silhouette clear and use a bright orange juice color. No writing, no labels, and no extra objects.",
      3: "Show four or five different juice cartons together with straws attached. Separate the cartons enough to read clearly. Use the same carton shape with different bright fruit colors. Each carton should show a simple fruit picture on the front, such as orange, apple, grape, or strawberry, and absolutely no text, no letters, and no numbers. No extra objects.",
    },
  },
  lemonade: {
    variants: [1, 2, 3],
    promptProfile: "drink",
    variantPromptNotes: {
      1: "Show one clear glass of lemonade only. Use a light lemon-yellow drink color and a very clear glass shape. Add a slice of lemon on the glass. No writing, no labels, and no extra objects.",
      2: "Show one pitcher of lemonade only. Keep the container silhouette clear. Use a light lemon-yellow drink color and show visible lemon slices in the pitcher. No writing, no labels, and no extra objects.",
      3: "Show four or five lemonade glasses only, placed on a stand. All containers must be glasses only, with no bottles, no jars, no cups, and no mixed container types. Separate the glasses enough to read clearly. Use the same glass shape and the same light lemon-yellow drink style. No writing, no labels, and no extra objects.",
    },
  },
  milk: {
    variants: [1, 2, 3],
    promptProfile: "drink",
    variantPromptNotes: {
      1: "Show one clear glass of milk only. Use a bright white milk color and a very clear glass shape. No writing, no labels, and no extra objects.",
      2: "Show one large jug of milk only. Keep the container silhouette clear and use a bright white milk color. No writing, no labels, and no extra objects.",
      3: "Show four or five milk cartons only. Separate the cartons enough to read clearly and use the same carton type. No writing, no labels, and no extra objects.",
    },
  },
  milkshake: {
    variants: [1, 2, 3],
    promptProfile: "drink",
    variantPromptNotes: {
      1: "Show one milkshake in a tall glass only. Make the glass shape very clear and show a thick creamy drink with a bright pastel milkshake color. No writing, no labels, and no extra objects.",
      2: "Show one large blender jug or shake pitcher for sharing only. Keep the container silhouette clear and show a thick creamy milkshake inside with a bright pastel milkshake color. No writing, no labels, and no extra objects.",
      3: "Show four or five tall milkshake glasses only. Separate the glasses enough to read clearly and use the same glass type. Show different bright pastel milkshake colors for different flavours. No writing, no labels, and no extra objects.",
    },
  },
  smoothie: {
    variants: [1, 2, 3],
    promptProfile: "drink",
    variantPromptNotes: {
      1: "Show one smoothie in a tall glass only. Make the glass shape very clear and show a thick creamy smoothie with a bright fruit smoothie color. Add a simple mixed-fruit background behind the glass using fruits like strawberry, banana, mango, and berries. No writing, no labels, and no extra objects.",
      2: "Show one large blender jug of smoothie only. Keep the container silhouette clear and show a thick smoothie inside with a bright fruit smoothie color. Add a simple mixed-fruit background behind the jug using fruits like strawberry, banana, mango, and berries. No writing, no labels, and no extra objects.",
      3: "Show four or five smoothie cartons only. Separate the cartons enough to read clearly and use the same carton type. Show different bright fruit smoothie colors for different flavours. Put simple pictures of mixed fruit printed on the fronts of the cartons only. All fruit pictures must stay attached to the cartons and none of the fruit may float separately outside the cartons. Absolutely no text, no letters, and no numbers. No extra objects.",
    },
  },
  soda: {
    variants: [1, 2, 3],
    promptProfile: "drink",
    variantPromptNotes: {
      1: "Show one glass of soda or one simple soda can only.",
      2: "Show one large bottle of soda for sharing only.",
      3: "Show four or five soda cans only.",
    },
  },
  tea: {
    variants: [1, 2, 3],
    promptProfile: "drink",
    variantPromptNotes: {
      1: "Show one cup of tea only.",
      2: "Show one teapot of tea only.",
      3: "Show four or five tea cups only, all sitting on one tray. There must be no teapot, no kettle, no mugs, and no mixed container types. All cups must use the same teacup style. Show light amber tea visible in every cup. Separate the cups enough to read clearly. No writing, no labels, and no extra objects.",
    },
  },
  adult: {
    variants: [1, 2],
    promptProfile: "profession",
    useStyleReference: false,
    variantPromptNotes: {
      1: "Show one adult person only, clearly visible, friendly, full body or upper body, simple everyday clothing, no children.",
      2: "Show two adult people together, clearly visible, friendly, simple everyday clothing, no children.",
    },
  },
  afternoon: {
    variants: [1],
    promptProfile: "time",
    useStyleReference: false,
    promptNote:
      "Show a simple classroom-friendly afternoon scene or symbol, such as a bright afternoon sun with soft sky context or a clock and sun together, as one clear centered concept image.",
  },
  "amusement park": {
    variants: [1],
    promptProfile: "place",
    promptNote:
      "Show one clear amusement park entrance or one iconic park view as a single flashcard illustration.",
  },
  april: {
    variants: [1],
    promptProfile: "time",
    useStyleReference: false,
    promptNote:
      "Show a simple April calendar page with clear month context, centered and child-friendly.",
  },
  december: {
    variants: [1, 2],
    promptProfile: "dates",
    variantPromptNotes: {
      2: "Show the December winter holiday mini-scene as image only with snow and wrapped presents. Absolutely no numbers, digits, letters, labels, signs, calendar elements, or written text anywhere in the image.",
    },
  },
  february: {
    variants: [1, 2],
    promptProfile: "dates",
    variantPromptNotes: {
      2: "Show the February affectionate mini-scene as image only with hearts and a wrapped gift. Absolutely no numbers, digits, letters, labels, signs, calendar elements, or written text anywhere in the image.",
    },
  },
  friday: {
    variants: [1, 2],
    promptProfile: "dates",
    variantPromptNotes: {
      2: "Show the Friday school-finish mini-scene as image only. Absolutely no numbers, digits, letters, labels, signs, calendar elements, or written text anywhere in the image.",
    },
  },
  january: {
    variants: [1, 2],
    promptProfile: "dates",
    variantPromptNotes: {
      2: "Show the January winter mini-scene as image only with snow, bare trees, and winter clothing cues. Absolutely no numbers, digits, letters, labels, signs, calendar elements, or written text anywhere in the image.",
    },
  },
  june: {
    variants: [1, 2],
    promptProfile: "dates",
    variantPromptNotes: {
      2: "Show the June beginning-of-summer mini-scene as image only with warm sunlight and green trees. Absolutely no numbers, digits, letters, labels, signs, calendar elements, or written text anywhere in the image.",
    },
  },
  march: {
    variants: [1, 2],
    promptProfile: "dates",
    variantPromptNotes: {
      2: "Show the March early-spring mini-scene as image only with fresh grass and small flowers. Absolutely no numbers, digits, letters, labels, signs, calendar elements, or written text anywhere in the image.",
    },
  },
  may: {
    variants: [1, 2],
    promptProfile: "dates",
    variantPromptNotes: {
      2: "Show the May bright spring mini-scene as image only with blooming flowers and sunshine. Absolutely no numbers, digits, letters, labels, signs, calendar elements, or written text anywhere in the image.",
    },
  },
  monday: {
    variants: [1, 2],
    promptProfile: "dates",
    variantPromptNotes: {
      2: "Show the Monday school mini-scene as image only. Absolutely no numbers, digits, letters, labels, signs, calendar elements, or written text anywhere in the image.",
    },
  },
  september: {
    variants: [1, 2],
    promptProfile: "dates",
    variantPromptNotes: {
      2: "Show the September back-to-school mini-scene as image only with a school bag, books, and pencils. Absolutely no numbers, digits, letters, labels, signs, calendar elements, or written text anywhere in the image.",
    },
  },
  thursday: {
    variants: [1, 2],
    promptProfile: "dates",
    variantPromptNotes: {
      2: "Show the Thursday schoolwork mini-scene as image only. Absolutely no numbers, digits, letters, labels, signs, calendar elements, or written text anywhere in the image.",
    },
  },
  tuesday: {
    variants: [1, 2],
    promptProfile: "dates",
    variantPromptNotes: {
      2: "Show the Tuesday classroom learning mini-scene as image only. Absolutely no numbers, digits, letters, labels, signs, calendar elements, or written text anywhere in the image.",
    },
  },
  aquarium: {
    variants: [1],
    promptProfile: "place",
    promptNote:
      "Show the exterior of a public aquarium building, not a fish tank, centered and easy for children to recognize.",
  },
  arm: {
    variants: [1, 2, 3],
    promptProfile: "body",
    variantPromptNotes: {
      2: 'Show an upper-body view of one child character with both arms clearly visible and large in the frame, in a simple natural teaching pose that makes the arms easy to identify.',
      3: 'Show an upper-body view of one child character using both arms in one clear simple action, such as raising both arms up or stretching both arms outward, with the arms large and dominant in the frame.',
    },
  },
  body: {
    variants: [1, 2, 3],
    promptProfile: "body",
    variantPromptNotes: {
      1: "Show one full body child character in a simple neutral standing pose, with the complete body clearly visible from head to toe, friendly, balanced, and not creepy.",
      2: "Show one full body child character in a jumping star position, with arms and legs stretched wide, the whole body clearly visible, large, centered, and easy for children to understand.",
      3: "Show one full body child character using the whole body in a clear lively action pose, with the complete body easy to see and friendly.",
    },
    variantStyleReferencePaths: {
      1: "/Users/Sean/Desktop/owen.png",
      2: "/Users/Sean/Desktop/kai.png",
      3: "/Users/Sean/Desktop/leo.png",
    },
  },
  computer: {
    variants: [1, 2, 3],
    promptProfile: "classroom",
    variantPromptNotes: {
      2: "Show a grouped set of matching computers, with the same number of monitors and computer towers, clearly paired together, and absolutely no writing or text on the screens or hardware.",
    },
  },
  desk: {
    variants: [1, 2, 3],
    promptProfile: "classroom",
    variantPromptNotes: {
      1: "Show one clear classroom desk, not a stool or side table, with a flat writing surface and visible desk structure so it is obviously a desk.",
      2: "Show several matching classroom desks together as a plural set, arranged like a neat classroom layout with slight depth and perspective between the desks. The desks must feel grounded and organized, not floating. Use no books, no pencils, and no extra classroom supplies. Each item must clearly look like a desk, not a stool or side table.",
      3: "Show one child character clearly using a real classroom desk, with the desk large and easy to recognize as a writing desk with a flat top and visible desk structure.",
    },
  },
  clam: {
    variants: [1, 2],
    promptProfile: "animals_land",
    variantPromptNotes: {
      1: "Show one large simple clam shell only, centered, clean, and easy to recognize.",
      2: "Show a grouped set of clam shells together as one centered composition, with no animals, no creature faces, and no elephant-like shapes.",
    },
  },
  face: {
    variants: [1, 2, 3],
    promptProfile: "body",
    variantPromptNotes: {
      1: "Show one happy cute child face only, large and centered, using one of the Classendo character faces, with a warm friendly smile and no creepy expression.",
    },
    variantStyleReferencePaths: {
      1: "/Users/Sean/Desktop/lily.png",
      2: "/Users/Sean/Desktop/maya.png",
      3: "/Users/Sean/Desktop/zara.png",
    },
  },
  feet: {
    variants: [1, 2, 3],
    promptProfile: "body",
    variantPromptNotes: {
      1: "Show two feet only, one left foot and one right foot together, large, centered, friendly, and easy to recognize.",
      3: "Show a child character clearly pointing at two feet together, not one foot, with both feet large and easy to distinguish.",
    },
  },
  finger: {
    variants: [1, 2, 3],
    promptProfile: "body",
    variantPromptNotes: {
      1: "Show a whole hand in context with a closed fist and the index finger held up clearly, large and centered.",
      2: "Show Zara pointing at one whole open hand with all five fingers and the thumb spread out clearly, large, centered, and easy to distinguish.",
    },
    variantStyleReferencePaths: {
      2: "/Users/Sean/Desktop/zara.png",
    },
  },
  foot: {
    variants: [1, 2, 3],
    promptProfile: "body",
    variantPromptNotes: {
      2: "Show one child character with a friendly natural face, clearly indicating one foot, using the same pleasant face style as the master Classendo character references.",
    },
    variantStyleReferencePaths: {
      2: "/Users/Sean/Desktop/lily.png",
    },
  },
  hair: {
    variants: [1, 2, 3],
    promptProfile: "body",
    variantPromptNotes: {
      2: "Show one child character pointing at their hair with both hands from the sides, with no writing, no symbols, and the hair large and easy to distinguish.",
    },
  },
  water: {
    variants: [1, 2, 3],
    promptProfile: "drink",
    variantPromptNotes: {
      1: "Show one glass of water only.",
      2: "Show one large jug of water only.",
      3: "Show four or five bottles of water together as one clear centered grouped set, using simple sealed water bottles only.",
    },
  },
  youtuber: {
    variants: [1, 2],
    promptProfile: "jobs",
    variantPromptNotes: {
      2: "Show exactly three youtuber people creating content together. Keep all three people fully visible and clearly separated. Do not add any extra face, sticker face, printed face, character face, emoji face, or floating face shape anywhere on clothing, legs, props, or background.",
    },
  },
  paper: {
    variants: [1, 2, 3],
    promptProfile: "classroom",
    variantPromptNotes: {
      3: "Show a child character interacting with a clear stack of paper, not one single front-facing sheet. The stack of paper must be large, obvious, and easy to distinguish.",
    },
  },
  avocado: {
    variants: [1, 2, 3],
    promptProfile: "fruit",
    promptNote:
      "Show whole avocados only, not sliced or cut open, with a clean large silhouette and simple readable shape.",
  },
  architect: {
    variants: [1, 2],
    promptProfile: "jobs",
    variantPromptNotes: {
      1: "Show one architect person clearly, with rolled plans or blueprint paper, while keeping the whole person fully visible and comfortably inside the frame.",
      2: "Show two or three architect people together reviewing plans, all clearly visible and comfortably inside the frame.",
    },
  },
  airplane: {
    variants: [1, 2, 3],
    variantPromptNotes: {
      3: "Show many airplanes in a clean simple formation or lineup, clearly separated and readable, not crushed into a ball or tangled cluster.",
    },
  },
  blackberry: {
    variants: [1, 2, 3],
    promptProfile: "fruit",
    promptNote:
      "Keep blackberry shapes large and simple, not over-textured, not too tiny, and easy to read from across a classroom.",
  },
  cherry: {
    variants: [1, 2, 3],
    promptProfile: "fruit",
    variantPromptNotes: {
      1: "Show one pair of cherries connected by stems as one clear centered fruit subject.",
      2: "Show 2 to 3 pairs of cherries grouped naturally with stems visible.",
      3: "Show many cherries grouped closely with stems visible, arranged naturally and clearly.",
    },
  },
  coconut: {
    variants: [1, 2, 3],
    promptProfile: "fruit",
    promptNote:
      "Show whole coconuts only, not cracked open, not cut, with simple readable shape.",
  },
  grapefruit: {
    variants: [1, 2, 3],
    promptProfile: "fruit",
    promptNote:
      "Show whole grapefruit only, not sliced, not cut open.",
  },
  grapes: {
    variants: [1, 2, 3],
    promptProfile: "fruit",
    variantPromptNotes: {
      1: "Show one bunch of grapes as the single clear centered subject, not loose scattered grapes.",
      2: "Show two small bunches of grapes grouped naturally, not loose scattered grapes.",
      3: "Show many bunches or a fuller grouped grape arrangement, natural and readable, not scattered.",
    },
  },
  kiwi: {
    variants: [1, 2, 3],
    promptProfile: "fruit",
    promptNote:
      "Show whole kiwi fruit only, not sliced, not cut open.",
  },
  pineapple: {
    variants: [1, 2, 3],
    promptProfile: "fruit",
    promptNote:
      "Show a large whole pineapple with a clear crown and simplified surface detail, not sliced.",
  },
  "school bag": {
    variants: [1, 2, 3],
    promptProfile: "classroom",
    variantPromptNotes: {
      2: "Show several school bags together as a plural set, with no apples, no books, and no extra objects. Keep the school bags large and clearly readable.",
    },
  },
  seashell: {
    variants: [1, 2],
    promptProfile: "animals_land",
    variantPromptNotes: {
      1: "Show one large simple seashell only, centered, clean, and easy to recognize.",
      2: "Show a grouped set of seashells together as one centered composition, with no animals, no creature faces, and no elephant-like shapes.",
    },
  },
  "trash can": {
    variants: [1, 2, 3],
    promptProfile: "classroom",
    variantPromptNotes: {
      1: "Show one indoor classroom trash can only, simple and child-friendly, clearly an inside classroom bin and not an outdoor garbage can.",
      2: "Show more than one indoor classroom trash can together, clearly indoor bins and not outdoor garbage cans.",
      3: "Show one child character using an indoor classroom trash can, with the trash can clearly visible as an indoor classroom bin and not an outdoor garbage can.",
    },
  },
  teeth: {
    variants: [1, 2, 3],
    promptProfile: "body",
    variantPromptNotes: {
      1: "Show a large friendly set of clean teeth only as one clear educational subject, cute and not creepy.",
      2: "Show one child character clearly pointing to an open mouth with many visible teeth in a big healthy smile.",
      3: "Show one child character using or emphasizing the teeth clearly, such as brushing teeth or showing a wide toothy smile, with the teeth large and easy to distinguish.",
    },
    variantStyleReferencePaths: {
      2: "/Users/Sean/Desktop/owen.png",
      3: "/Users/Sean/Desktop/kai.png",
    },
  },
  toe: {
    variants: [1, 2, 3],
    promptProfile: "body",
    variantPromptNotes: {
      1: "Show one whole foot with just the big toe pointing upward naturally, with the full foot visible and easy to understand.",
      2: "Show one whole foot with all five toes visible while a child character points at the toes clearly, with the foot large and easy to distinguish.",
    },
  },
  tooth: {
    variants: [1, 2, 3],
    promptProfile: "body",
    variantPromptNotes: {
      2: "Show one child character pointing to an open mouth with a big toothy smile showing many teeth, not a single floating tooth.",
    },
  },
  turtle: {
    variants: [1, 2],
    promptProfile: "animals_land",
    variantPromptNotes: {
      1: "Show one sea turtle only, swimming, with clear flippers, ocean-animal body shape, and no tortoise feet.",
      2: "Show a small grouped set of sea turtles swimming together, with clear flippers and sea-turtle body shape, not tortoises.",
    },
  },
  watermelon: {
    variants: [1, 2, 3],
    promptProfile: "fruit",
    promptNote:
      "Show whole watermelon only, not sliced, not cut open, with a bold simple silhouette.",
  },
  workbook: {
    variants: [1, 2, 3],
    promptProfile: "classroom",
    variantPromptNotes: {
      3: "Show one child character using a workbook that clearly looks like a workbook, thicker and more structured than a notebook, with workbook-style pages or cover detail, and not like a simple notebook.",
    },
  },
  broccoli: {
    variants: [1, 2],
    promptProfile: "vegetable",
  },
  corn: {
    variants: [1, 2],
    promptProfile: "vegetable",
  },
  garlic: {
    variants: [1, 2],
    promptProfile: "vegetable",
  },
  lettuce: {
    variants: [1, 2],
    promptProfile: "vegetable",
  },
  spinach: {
    variants: [1, 2],
    promptProfile: "vegetable",
  },
};

function inferVariantNumbers(
  lemma: string,
  countability: Exclude<NounCountability, "both">
): NounVariantNumber[] {
  if (JOBS_NOUNS.has(lemma)) return [1, 2];
  if (DATES_NOUNS.has(lemma)) return [1, 2];
  if (CLOTHES_NOUNS.has(lemma)) return [1, 2];
  if (CLASSROOM_NOUNS.has(lemma)) return [1, 2, 3];
  if (BODY_NOUNS.has(lemma)) return [1, 2, 3];
  if (ANIMALS_SEA_NOUNS.has(lemma)) return [1, 2];
  if (ANIMALS_LAND_NOUNS.has(lemma)) return [1, 2];
  if (ANIMALS_BABY_NOUNS.has(lemma)) return [1, 2];
  if (VEGETABLE_NOUNS.has(lemma) && countability === "count") return [1, 2, 3];
  if (VEGETABLE_NOUNS.has(lemma) && countability === "uncount") return [1, 2];
  if (countability === "uncount") return [1, 2, 3];
  if (TIME_NOUNS.has(lemma) || PLACE_NOUNS.has(lemma)) return [1];
  if (PROFESSION_NOUNS.has(lemma)) return [1, 2];
  return [1, 2, 3];
}

export function planNounImageVariants(params: {
  lemma: string;
  countability: NounCountability;
}): NounVariantDefinition[] {
  const lemma = params.lemma.trim().toLowerCase();
  const effectiveCountability = resolveEffectiveCountability(params.countability);
  const allVariants = getVariantDefinitions(lemma, effectiveCountability);
  const override = nounImageOverrides[lemma];
  const allowed = new Set<NounVariantNumber>(
    override?.variants ?? inferVariantNumbers(lemma, effectiveCountability)
  );

  return allVariants
    .filter((variant) => allowed.has(variant.variantNumber))
    .map((variant) => {
      const promptProfile =
        override?.promptProfile
        ?? (DATES_NOUNS.has(lemma)
          ? "dates"
          : FAMILY_NOUNS.has(lemma)
          ? "family"
          : JOBS_NOUNS.has(lemma)
          ? "jobs"
          : DRINK_NOUNS.has(lemma)
          ? "drink"
          : FRUIT_NOUNS.has(lemma)
          ? "fruit"
          : VEGETABLE_NOUNS.has(lemma)
            ? "vegetable"
          : ANIMALS_BABY_NOUNS.has(lemma)
              ? "animals_baby"
              : CLOTHES_NOUNS.has(lemma)
                ? "clothes"
              : CLASSROOM_NOUNS.has(lemma)
                ? "classroom"
              : ANIMALS_SEA_NOUNS.has(lemma)
                ? "animals_land"
                : ANIMALS_LAND_NOUNS.has(lemma)
                  ? "animals_land"
                  : BODY_NOUNS.has(lemma)
                    ? "body"
                    : "default");

      return {
        ...variant,
        promptNote:
          override?.variantPromptNotes?.[variant.variantNumber] ?? override?.promptNote,
        promptProfile,
        modelOverride:
          promptProfile === "jobs" ? "gpt-image-1" : undefined,
        qualityOverride:
          promptProfile === "jobs"
            ? variant.variantNumber === 1
              ? "high"
              : "medium"
            : undefined,
        useStyleReference:
          promptProfile === "body"
            ? Boolean(
                override?.variantStyleReferencePaths?.[variant.variantNumber]
                ?? variant.variantNumber !== 1
              )
            : promptProfile === "family"
              ? variant.variantNumber === 1
            : promptProfile === "jobs"
              ? true
            : promptProfile === "classroom"
              ? variant.variantNumber === 3
            : override?.useStyleReference ?? true,
        styleReferencePath:
          promptProfile === "body"
            ? override?.variantStyleReferencePaths?.[variant.variantNumber]
              ?? (variant.variantNumber !== 1
                ? selectBodyCharacterReference(lemma, variant.variantNumber)
                : undefined)
            : promptProfile === "family" && variant.variantNumber === 1
              ? override?.variantStyleReferencePaths?.[variant.variantNumber]
                ?? selectFamilyCharacterReference(lemma, variant.variantNumber)
            : promptProfile === "jobs"
              ? override?.variantStyleReferencePaths?.[variant.variantNumber]
                ?? selectJobsCharacterReference(lemma, variant.variantNumber)
            : promptProfile === "classroom" && variant.variantNumber === 3
              ? override?.variantStyleReferencePaths?.[variant.variantNumber]
                ?? selectClassroomCharacterReference(lemma, variant.variantNumber)
            : undefined,
      };
    });
}
