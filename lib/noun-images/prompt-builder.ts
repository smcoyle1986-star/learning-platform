import {
  NounCountability,
  NounVariantDefinition,
} from "@/lib/noun-images/types";

const STYLE_BLOCK = [
  "children's educational flashcard illustration",
  "soft pastel colors",
  "rounded shapes",
  "clean thin line art",
  "gentle shading",
  "chibi-friendly style",
  "simple forms",
  "no texture noise",
  "no realism",
  "bright and friendly",
  "high clarity for young learners",
  "glossy cartoon icon style",
  "full color",
];

const COMPOSITION_BLOCK = [
  "single clear subject focus",
  "large and centered",
  "balanced spacing",
  "no clutter",
  "no perspective scene",
  "no complex background",
];

const LIGHTING_BLOCK = [
  "soft even lighting",
  "no shadows",
  "no dramatic contrast",
];

const TRANSPARENCY_BLOCK = [
  "TRUE alpha transparency ONLY (RGBA image)",
  "background must be COMPLETELY transparent",
  "NO white",
  "NO gray",
  "NO checkerboard",
  "NO fake transparency",
  "clean edges with NO halo",
];

const NEGATIVE_BLOCK = [
  "NO background",
  "NO environment scene",
  "NO room",
  "NO floor plane",
  "NO shadows",
  "NO gradient",
  "NO glow",
  "NO vignette",
  "NO text",
  "NO watermark",
  "NO extra objects not listed",
  "NO floating unrealistic arrangement",
  "NO messy composition",
];

function buildCountablePrompt(lemma: string, variant: NounVariantDefinition) {
  switch (variant.kind) {
    case "count_singular":
      return [
        `Create ONE single illustration of: "${lemma}"`,
        "Show ONE normal, everyday example of the object.",
        "The object should be large and centered.",
        "The object should be shown in a natural resting position.",
        "Do NOT add extra objects.",
      ];
    case "count_small_plural":
      return [
        `Create ONE single illustration of: "${lemma}"`,
        "Show a SMALL NUMBER of the object (2 to 3 items).",
        "The objects should be placed together naturally.",
        "The objects should be slightly overlapping or grouped.",
        "Do NOT spread objects far apart.",
      ];
    case "count_large_plural":
      return [
        `Create ONE single illustration of: "${lemma}"`,
        "Show MANY of the objects.",
        "The objects should be grouped together closely.",
        "The objects should be touching, stacked, or interacting naturally.",
        "The objects must form a clear cluster, NOT scattered.",
        "Objects must feel like they belong together in real life.",
      ];
    default:
      return [];
  }
}

function buildUncountablePrompt(lemma: string, variant: NounVariantDefinition) {
  switch (variant.kind) {
    case "uncount_normal_amount":
      return [
        `Create ONE single illustration of: "${lemma}"`,
        "Show a NORMAL everyday amount.",
        "The object should be contained in a natural real-world container.",
        "The container must be simple and centered.",
      ];
    case "uncount_small_amount":
      return [
        `Create ONE single illustration of: "${lemma}"`,
        "Show a SMALL amount.",
        "The object should be placed in a small container.",
        "Keep it visually clearly smaller than normal.",
      ];
    case "uncount_large_amount":
      return [
        `Create ONE single illustration of: "${lemma}"`,
        "Show a LARGE amount.",
        "The object should be contained in a large container or pile.",
        "The amount must clearly look larger than normal.",
      ];
    default:
      return [];
  }
}

function buildProfilePrompt(variant: NounVariantDefinition) {
  switch (variant.promptProfile) {
    case "dates":
      return [
        "show a dates educational flashcard illustration in the Classendo style",
        "the date concept must be very large and centered",
        "keep the image simple, polished, friendly, and easy to recognize from across a classroom",
        "use bright cheerful full color with smooth gentle shading",
        "for calendar images, make the calendar clear and readable without lots of tiny text",
      ];
    case "drink":
      return [
        "show a drink educational flashcard illustration in the Classendo style",
        "the drink serving or drink container must be very large and centered",
        "keep the drink simple, polished, friendly, and easy to recognize from across a classroom",
        "use bright cheerful full color with smooth gentle shading",
        "show the drink in the kind of cup, glass, mug, jug, bottle, can, carton, or container it is usually served in",
        "there must be no writing, no labels, no logos, and no visible text on any drink container",
      ];
    case "family":
      return [
        "show a family-member educational flashcard illustration in the Classendo style",
        "the person must be centered and fully visible with generous space around the whole figure",
        "show the full person clearly from head to toe",
        "do not crop off the head, hair, hands, feet, or sides of the person",
        "keep the whole figure slightly smaller in frame than before so nothing is cut off",
        "keep the person simple, polished, friendly, and easy to recognize from across a classroom",
        "use bright cheerful full color with smooth gentle shading",
        "make this person clearly unique and visually distinct from the other family characters",
        "the person must clearly match the family role named in the lemma",
        "use large expressive Classendo-style eyes similar to the good sister_1 image",
        "eyes must have clear irises, highlights, eyelids, and personality",
        "do not use tiny black dot eyes, bead-like eyes, blank eyes, or strange uncanny eyes",
        "keep the face warm, soft, and friendly with appealing proportions",
        "match the eye style, face rendering quality, and polished character finish of the uploaded master character references",
      ];
    case "jobs":
      return [
        "show a jobs educational flashcard illustration in the Classendo style",
        "the person must always be the main subject",
        "show the full person clearly from head to toe with generous space around the whole figure",
        "do not crop off the head, hair, hands, feet, or sides of the person",
        "keep the person large, central, and complete, but not so oversized that any part is cut off",
        "use large expressive Classendo-style eyes with clear irises, highlights, eyelids, and personality",
        "do not use tiny black dot eyes, bead-like eyes, blank eyes, or strange uncanny eyes",
        "match the eye style, face rendering quality, and polished character finish of the uploaded master character references",
        "make the job clear from clothing, tools, and action while keeping the person dominant",
        "vary skin tones, hairstyles, and outfits across different lemmas while keeping a consistent Classendo style",
        "use bright cheerful full color with smooth gentle shading",
      ];
    case "body":
      return [
        "show a body-part educational flashcard illustration in the Classendo style",
        "subject must be very large and centered",
        "keep the subject simple, polished, friendly, and easy to recognize from across a classroom",
        "use bright cheerful full color with smooth gentle shading",
        "for body-part closeups, keep them cute and nice, not creepy, scary, or gross",
        "for full body scenes, keep the character clear, centered, and classroom-friendly",
      ];
    case "classroom":
      return [
        "show a classroom object educational flashcard illustration in the Classendo style",
        "the classroom item must be very large and centered",
        "keep the classroom object simple, polished, friendly, and easy to recognize from across a classroom",
        "use bright cheerful full color with smooth gentle shading",
        "for character scenes, keep the child character secondary and keep the classroom item dominant and easy to distinguish",
      ];
    case "clothes":
      return [
        "show a clothes educational flashcard illustration in the Classendo style",
        "the clothing item must be very large and centered",
        "keep the clothing item simple, polished, friendly, and easy to recognize from across a classroom",
        "use bright cheerful full color with smooth gentle shading",
        "for grouped clothes, arrange them like a tidy shop display or wardrobe display while keeping the clothing items dominant",
      ];
    case "animals_land":
      return [
        "show a cute friendly adult land animal flashcard illustration in the Classendo style",
        "animal must be very large and centered",
        "animal should fill most of the canvas with minimal empty space",
        "keep the animal silhouette bold, simple, and clearly readable from across a classroom",
        "use bright cheerful full color with smooth gentle shading",
        "keep the image polished, friendly, and cute while still clearly showing an adult animal",
        "for grouped animals, keep them together naturally like a herd or animal grouping, not like a family portrait",
      ];
    case "animals_baby":
      return [
        "show a cute baby animal flashcard illustration in the Classendo style",
        "baby animal must be very large and centered",
        "baby animal should fill most of the canvas with minimal empty space",
        "keep the baby animal silhouette bold, simple, and clearly readable from across a classroom",
        "use bright cheerful full color with smooth gentle shading",
        "keep the image polished, friendly, and cute without becoming babyish or messy",
        "for grouped baby animals, keep them together naturally and clearly readable as one centered composition",
      ];
    case "vegetable":
      return [
        "show a glossy cartoon vegetable flashcard icon",
        "vegetable must be very large and centered",
        "vegetable should fill most of the canvas with minimal empty space",
        "keep the vegetable silhouette bold, simple, and clearly readable from across a classroom",
        "use bright cheerful full color with smooth gentle shading",
        "keep the image polished, not babyish",
        "no tiny vegetable subject",
      ];
    case "fruit":
      return [
        "show a glossy cartoon fruit flashcard icon",
        "fruit must be very large and centered",
        "fruit should fill most of the canvas with minimal empty space",
        "keep the fruit silhouette simple, bold, and easy to recognize from across a classroom",
        "use bright cheerful full color with smooth gentle shading",
        "keep the image polished, not babyish, and not overly childlike",
        "do not make the fruit tiny",
        "for grouped fruit, keep the arrangement natural, organized, and clearly readable",
      ];
    case "profession":
      return [
        "show a person doing the job",
        "the person must be the main subject",
        "profession must be clear from clothing, tools, or pose",
        "keep the composition simple and classroom-friendly",
      ];
    case "place":
      return [
        "show the whole place or building clearly",
        "do not show a small object found inside the place instead of the place itself",
        "keep the place simplified and easy for children to recognize",
      ];
    case "time":
      return [
        "show the time concept clearly with simple symbolic context",
        "keep it as one centered educational concept image",
        "avoid unrelated literal object substitutions",
      ];
    default:
      return [];
  }
}

const DATE_MONTHS = new Set([
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
]);

const DATE_WEEKDAYS = new Set([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

const DATE_HOLIDAYS = new Set(["birthday", "christmas", "halloween"]);

const MONTH_DAY_COUNTS: Record<string, number> = {
  january: 31,
  february: 28,
  march: 31,
  april: 30,
  may: 31,
  june: 30,
  july: 31,
  august: 31,
  september: 30,
  october: 31,
  november: 30,
  december: 31,
};

const DATE_MONTH_SCENES: Record<string, string> = {
  january:
    "A child-friendly winter outdoor mini-scene with snow on the ground, bare trees, and a warm coat and scarf, showing a clear cold winter feeling.",
  february:
    "A warm affectionate mini-scene with hearts, a wrapped gift, and a cozy celebration feeling.",
  march:
    "An early spring mini-scene with fresh grass, small flowers beginning to bloom, and a light breezy feeling.",
  april:
    "A spring rain mini-scene with an umbrella, raindrops, and puddles on the ground.",
  may:
    "A bright spring mini-scene with blooming flowers, green plants, and warm sunshine.",
  june:
    "A beginning-of-summer mini-scene with warm sunlight, green trees, and clear pleasant weather.",
  july:
    "A hot summer mini-scene with a beach ball, sun hat, and bright sunshine.",
  august:
    "A late-summer holiday mini-scene with a suitcase, bright sun, and travel feeling.",
  september:
    "A back-to-school mini-scene with a school bag, books, and pencils in a clear school context.",
  october:
    "An autumn mini-scene with orange leaves, a pumpkin, and crisp fall feeling.",
  november:
    "A late-autumn mini-scene with falling leaves, a sweater, and cool-weather feeling.",
  december:
    "A winter holiday mini-scene with snow and wrapped presents.",
};

const DATE_WEEKDAY_SCENES: Record<string, string> = {
  monday:
    "A child going to school with a school bag in a simple morning school mini-scene.",
  tuesday:
    "A child reading or learning in a simple classroom mini-scene.",
  wednesday:
    "A child studying at a desk in a simple midweek school mini-scene.",
  thursday:
    "A child doing schoolwork or group learning in a simple classroom mini-scene.",
  friday:
    "A happy end-of-school-week mini-scene with a child leaving school with a school bag.",
  saturday:
    "A weekend fun mini-scene with a child playing outside or doing a fun activity.",
  sunday:
    "A calm home mini-scene with a child relaxing quietly.",
};

function getBodyCropGuidance(lemma: string) {
  const faceParts = new Set(["ears", "eyes", "face", "hair", "mouth", "nose", "teeth", "tooth"]);
  const upperBodyParts = new Set(["arm", "finger", "hand", "head"]);
  const lowerBodyParts = new Set(["feet", "foot", "leg", "toe"]);

  if (faceParts.has(lemma)) {
    return "show the head and upper body only, with the target body part large and easy to distinguish";
  }

  if (upperBodyParts.has(lemma)) {
    return "show upper body or half body only, with the target body part large and easy to distinguish";
  }

  if (lowerBodyParts.has(lemma)) {
    return "show enough of the body to clearly display the lower body part, with the target body part large and easy to distinguish";
  }

  return "show only as much of the body as needed, with the target body part large and easy to distinguish";
}

function buildBodyPrompt(lemma: string, variant: NounVariantDefinition) {
  if (lemma === "body") {
    if (variant.variantNumber === 1) {
      return [
        'Create ONE single illustration of: "body"',
        "Show one whole child body, fully clothed, standing naturally.",
        "The complete body should be visible from head to toe.",
        "Make it large, centered, friendly, and clearly educational.",
      ];
    }

    if (variant.variantNumber === 2) {
      return [
        'Create ONE single illustration of: "body"',
        "Show one whole child body, fully clothed, doing a cheerful classroom exercise pose.",
        "The complete body should be visible from head to toe.",
        "Show the arms raised high and the legs apart like a star jump exercise pose.",
        "Keep it clearly educational, friendly, and non-creepy.",
      ];
    }

    return [
      'Create ONE single illustration of: "body"',
      "Show one whole child body, fully clothed, in a lively educational movement pose.",
      "The complete body should be visible from head to toe.",
      "Keep it friendly, clear, and classroom-appropriate.",
    ];
  }

  const cropGuidance = getBodyCropGuidance(lemma);

  if (variant.variantNumber === 1) {
    return [
      `Create ONE single illustration of: "${lemma}"`,
      "Show only the body part by itself, floating on transparent background.",
      "Do NOT attach the body part to a full body or full face.",
      "Make it very large, centered, cute, friendly, and not creepy.",
    ];
  }

  if (variant.variantNumber === 2) {
    return [
      `Create ONE single illustration of: "${lemma}"`,
      "Show one child character in a simple identification pose.",
      `The character should gesture toward the "${lemma}" naturally, without any arrows or writing.`,
      cropGuidance,
      "Make the target body part the most visually clear part of the image.",
    ];
  }

  return [
    `Create ONE single illustration of: "${lemma}"`,
    "Show one child character using or emphasizing the body part in an exaggerated but natural action pose.",
    `The "${lemma}" should be used, touched, pointed at, or emphasized clearly by the character.`,
    cropGuidance,
    "Make the target body part the most visually clear part of the image.",
  ];
}

function buildLandAnimalPrompt(lemma: string, variant: NounVariantDefinition) {
  if (variant.variantNumber === 1) {
    return [
      `Create ONE single illustration of: "${lemma}"`,
      "Show ONE adult example of the animal only.",
      "The animal should be very large and centered.",
      "Make the animal cute and friendly but clearly an adult.",
      "Do NOT add other animals.",
    ];
  }

  return [
    `Create ONE single illustration of: "${lemma}"`,
    "Show a grouping of the animals, not just one animal.",
    "If males and females of the animal look different, include both.",
    "Include a baby version of the animal too if that is appropriate and visually clear.",
    "This should look like a herd, flock, or natural grouping, NOT a family portrait.",
    "Keep the animals grouped together as one centered composition.",
  ];
}

function buildBabyAnimalPrompt(lemma: string, variant: NounVariantDefinition) {
  if (variant.variantNumber === 1) {
    return [
      `Create ONE single illustration of: "${lemma}"`,
      "Show ONE baby animal only.",
      "The baby animal should be very large and centered.",
      "Show the baby animal as a cute standalone subject.",
      "Do NOT add adult animals or any other animals.",
    ];
  }

  return [
    `Create ONE single illustration of: "${lemma}"`,
    "Show more than one baby animal.",
    "The baby animals can interact naturally if that is common for the animal.",
    "If not, show them together closely as one centered grouped composition.",
    "Do NOT add adult animals or any other animals.",
  ];
}

function buildVegetablePrompt(lemma: string, countability: NounCountability, variant: NounVariantDefinition) {
  if (countability === "uncount") {
    if (variant.variantNumber === 1) {
      return [
        `Create ONE single illustration of: "${lemma}"`,
        "Show ONE normal whole example of the vegetable.",
        "The vegetable should be large and centered.",
        "Show the vegetable as it is usually seen whole before cooking or preparation.",
        "Do NOT add extra objects.",
      ];
    }

    return [
      `Create ONE single illustration of: "${lemma}"`,
      "Show an amount of the vegetable cut up and ready to be used.",
      "The prepared vegetable pieces should be grouped neatly as one centered subject.",
      "Keep the cut pieces large, readable, and classroom-friendly.",
      "Do NOT add extra ingredients or tools.",
    ];
  }

  if (variant.variantNumber === 1) {
    return [
      `Create ONE single illustration of: "${lemma}"`,
      "Show ONE normal whole example of the vegetable.",
      "The vegetable should be very large and centered.",
      "Show the vegetable in a natural resting position.",
      "Do NOT add extra objects.",
    ];
  }

  if (variant.variantNumber === 2) {
    return [
      `Create ONE single illustration of: "${lemma}"`,
      "Show more than two whole examples of the vegetable.",
      "The vegetables should be grouped together naturally as one centered composition.",
      "Keep them large, clear, and easy to read from across a classroom.",
      "Do NOT scatter them far apart.",
    ];
  }

  return [
    `Create ONE single illustration of: "${lemma}"`,
    "Show the vegetable sliced up the way it would be used in cooking or food preparation.",
    "The sliced pieces should be neat, large, centered, and clearly readable.",
    "Show a simple prepared arrangement only, without extra ingredients, tools, or kitchen scene.",
    "Do NOT make the pieces tiny or messy.",
  ];
}

function buildClassroomPrompt(lemma: string, variant: NounVariantDefinition) {
  if (variant.variantNumber === 1) {
    return [
      `Create ONE single illustration of: "${lemma}"`,
      "Show ONE single classroom item only.",
      "The classroom item should be very large and centered.",
      "Show the item clearly in a natural simple resting position.",
      "Do NOT add extra objects.",
    ];
  }

  if (variant.variantNumber === 2) {
    return [
      `Create ONE single illustration of: "${lemma}"`,
      "Show a plural example of the classroom item, with more than one item together.",
      "The items should be grouped naturally and clearly as one centered composition.",
      "Keep the classroom items large, readable, and easy to distinguish from across a classroom.",
      "Do NOT scatter them far apart.",
    ];
  }

  return [
    `Create ONE single illustration of: "${lemma}"`,
    "Show one child character actively using or interacting with the classroom item in a clear natural way.",
    "The classroom item must remain large, clearly visible, and easy to distinguish from across a classroom.",
    "The child must actually use, hold, touch, point to, write with, sit at, carry, or look at the item, not just stand next to it.",
    "Use the exact same child character design as the reference image, with the same face, hair, clothes, proportions, and overall Classendo character style.",
    "Keep the child character secondary and make the classroom item the most important visual subject.",
    "Use a simple classroom-friendly pose with no extra clutter, no writing, and no text.",
  ];
}

function buildClothesPrompt(lemma: string, variant: NounVariantDefinition) {
  if (variant.variantNumber === 1) {
    return [
      `Create ONE single illustration of: "${lemma}"`,
      "Show ONE single clothing item only.",
      "The clothing item should be very large and centered.",
      "Show the item clearly by itself with no people and no extra objects.",
      "Do NOT add any other accessories or props.",
    ];
  }

  return [
    `Create ONE single illustration of: "${lemma}"`,
    "Show a plural grouped display of the clothing item with more than one item.",
    "Arrange the clothing items like a tidy shop display or wardrobe display.",
    "Keep the clothing items large, neat, and easy to distinguish.",
    "Do NOT show people, mannequins, or unrelated extra objects.",
  ];
}

function buildDrinkPrompt(lemma: string, variant: NounVariantDefinition) {
  if (variant.variantNumber === 1) {
    return [
      `Create ONE single illustration of: "${lemma}"`,
      "Show one normal single serving of the drink.",
      "Show the drink in a glass, cup, mug, or other container it is usually served in.",
      "Keep the serving very large, centered, and easy to recognize.",
      "Do NOT add people or extra unrelated objects.",
    ];
  }

  if (variant.variantNumber === 2) {
    return [
      `Create ONE single illustration of: "${lemma}"`,
      "Show a large amount of the drink for sharing.",
      "Serve it in a jug, pitcher, pot, carafe, or other larger container that is normal for the drink.",
      "Keep the large serving centered, grounded, and easy to recognize.",
      "Do NOT add extra food, people, or unrelated objects.",
    ];
  }

  return [
    `Create ONE single illustration of: "${lemma}"`,
    "Show several retail or takeaway drink containers together, such as bottles, cans, cartons, or glass bottles, depending on how the drink is usually sold or served.",
    "Show about four or five matching containers together as one clear grouped composition.",
    "Keep the containers large, neat, and easy to distinguish from across a classroom.",
    "Do NOT add people or unrelated extra objects.",
  ];
}

function buildFamilyPrompt(lemma: string, variant: NounVariantDefinition) {
  if (variant.variantNumber === 1) {
    return [
      `Create ONE single illustration of: "${lemma}"`,
      "Show one person only.",
      "The person should be centered, fully visible from head to toe, and easy to see with generous empty space around them.",
      "Use a simple natural standing pose with no extra people and no extra objects.",
      "Make the family role visually clear through age, facial features, proportions, and clothing.",
      "Use the master character reference only as a style anchor for the eyes, face, polish, and character quality, while still making this family member a unique person.",
    ];
  }

  return [
    `Create ONE single illustration of: "${lemma}"`,
    "Show a family-themed illustration that matches the existing manually created variant.",
  ];
}

const JOB_SINGULAR_SCENES: Record<string, string[]> = {
  architect: ["Show one architect person holding rolled plans or blueprint paper."],
  artist: ["Show one artist person painting with a brush and easel."],
  astronaut: ["Show one astronaut person in a space suit."],
  athlete: ["Show one athlete person in a sporty training pose."],
  baker: ["Show one baker person with bread or baked goods."],
  barber: ["Show one barber person with scissors and a comb."],
  "baseball player": ["Show one baseball player person with a bat and baseball uniform."],
  "basketball player": ["Show one basketball player person with a basketball."],
  builder: ["Show one builder person with a helmet and tool belt."],
  "bus driver": ["Show one bus driver person clearly driving or holding a bus steering wheel."],
  carpenter: ["Show one carpenter person with wood and a hammer."],
  cashier: ["Show one cashier person at a register."],
  chef: ["Show one chef person in a chef hat with a pan or prepared dish."],
  cook: ["Show one cook person with an apron and cooking utensil."],
  dentist: ["Show one dentist person with a mask and dental mirror."],
  doctor: ["Show one doctor person with a stethoscope."],
  engineer: ["Show one engineer person with a hard hat or technical plans."],
  farmer: ["Show one farmer person with a hat and farm tool."],
  firefighter: ["Show one firefighter person in fire gear."],
  "hair dresser": ["Show one hair dresser person with a brush and scissors."],
  judge: ["Show one judge person with a robe and gavel."],
  king: ["Show one king person in royal clothes with a crown."],
  lawyer: ["Show one lawyer person in a suit with a case file or legal papers."],
  "mail carrier": ["Show one mail carrier person with a mail bag and letters."],
  mechanic: ["Show one mechanic person with a wrench."],
  musician: ["Show one musician person with a musical instrument."],
  nurse: ["Show one nurse person in scrubs."],
  "office worker": ["Show one office worker person with a laptop or papers."],
  photographer: ["Show one photographer person with a camera."],
  pilot: ["Show one pilot person in a pilot uniform."],
  "police officer": ["Show one police officer person in a police uniform."],
  professor: ["Show one professor person with a book or pointer."],
  programmer: ["Show one programmer person with a laptop."],
  queen: ["Show one queen person in royal clothes with a crown."],
  scientist: ["Show one scientist person with a lab coat and flask."],
  singer: ["Show one singer person with a microphone."],
  "soccer player": ["Show one soccer player person with a soccer ball."],
  soldier: ["Show one soldier person in military uniform."],
  student: ["Show one student person with a school bag or book."],
  "taxi driver": ["Show one taxi driver person clearly driving or holding a taxi steering wheel."],
  teacher: ["Show one teacher person with a book or pointer."],
  vet: ["Show one vet person in a lab coat with pet-care tools."],
  waiter: ["Show one waiter person carrying a tray."],
  writer: ["Show one writer person with a notebook or laptop."],
  youtuber: ["Show one youtuber person with a camera and ring-light style setup."],
};

const JOB_PLURAL_SCENES: Record<string, string[]> = {
  architect: ["Show two or three architect people together reviewing plans."],
  artist: ["Show two or three artist people painting together."],
  astronaut: ["Show two or three astronaut people together in matching space suits."],
  athlete: ["Show two or three athlete people training together."],
  baker: ["Show two or three baker people baking together."],
  barber: ["Show two or three barber people working together in a barber setting pose."],
  "baseball player": ["Show two or three baseball player people together in baseball uniforms."],
  "basketball player": ["Show two or three basketball player people together."],
  builder: ["Show two or three builder people working together."],
  "bus driver": ["Show two or three bus driver people together in driver uniforms."],
  carpenter: ["Show two or three carpenter people building together."],
  cashier: ["Show two or three cashier people working side by side."],
  chef: ["Show two or three chef people cooking together."],
  cook: ["Show two or three cook people preparing food together."],
  dentist: ["Show two or three dentist people together in dental uniforms."],
  doctor: ["Show two or three doctor people together in a clinic-style pose."],
  engineer: ["Show two or three engineer people reviewing plans together."],
  farmer: ["Show two or three farmer people together with crops or farm tools."],
  firefighter: ["Show two or three firefighter people together in fire gear."],
  "hair dresser": ["Show two or three hair dresser people styling hair together."],
  judge: ["Show two or three judge people together in a formal judge pose."],
  king: ["Show two or three king people together, each clearly royal."],
  lawyer: ["Show two or three lawyer people discussing documents together."],
  "mail carrier": ["Show two or three mail carrier people delivering mail together."],
  mechanic: ["Show two or three mechanic people repairing together."],
  musician: ["Show two or three musician people playing together."],
  nurse: ["Show two or three nurse people together in a clinic-style pose."],
  "office worker": ["Show two or three office worker people collaborating together."],
  photographer: ["Show two or three photographer people taking photos together."],
  pilot: ["Show two or three pilot people together like a flight crew."],
  "police officer": ["Show two or three police officer people together."],
  professor: ["Show two or three professor people discussing or teaching together."],
  programmer: ["Show two or three programmer people working together."],
  queen: ["Show two or three queen people together, each clearly royal."],
  scientist: ["Show two or three scientist people experimenting together."],
  singer: ["Show two or three singer people performing together."],
  "soccer player": ["Show two or three soccer player people together with a soccer ball."],
  soldier: ["Show two or three soldier people together in matching military uniforms."],
  student: ["Show two or three student people learning together."],
  "taxi driver": ["Show two or three taxi driver people together in driver uniforms."],
  teacher: ["Show two or three teacher people together in a classroom-teaching pose."],
  vet: ["Show two or three vet people together caring for animals."],
  waiter: ["Show two or three waiter people serving together."],
  writer: ["Show two or three writer people working together."],
  youtuber: ["Show two or three youtuber people creating content together."],
};

function buildJobsPrompt(lemma: string, variant: NounVariantDefinition) {
  const singularLines = JOB_SINGULAR_SCENES[lemma] ?? [
    `Show one person clearly doing the job "${lemma}".`,
  ];
  const pluralLines = JOB_PLURAL_SCENES[lemma] ?? [
    `Show two or three people clearly doing the job "${lemma}" together.`,
  ];

  if (variant.variantNumber === 1) {
    return [
      `Create ONE single illustration of: "${lemma}"`,
      ...singularLines,
      "Show the whole person fully from head to toe.",
      "Keep the person centered with generous breathing room on every side so nothing is cropped.",
      "Make the person large, complete, and easy to recognize.",
      "Use the uploaded master character reference only as a style anchor for the eyes, face, polish, and character quality while still making this a unique person.",
    ];
  }

  return [
    `Create ONE single illustration of: "${lemma}"`,
    ...pluralLines,
    "Show all people fully and clearly from head to toe.",
    "Keep all figures centered as one grouped composition with generous space around the outer edges so no one is cropped.",
    "Make the people large and easy to recognize, but do not make them so big that they are cut off.",
    "Use the uploaded master character reference only as a style anchor for the eyes, face, polish, and character quality while still making these unique people.",
  ];
}

function buildDatesPrompt(lemma: string, variant: NounVariantDefinition) {
  const lowerLemma = lemma.trim().toLowerCase();

  if (DATE_HOLIDAYS.has(lowerLemma)) {
    if (variant.variantNumber === 1) {
      return [
        `Create ONE single illustration of: "${lemma}"`,
        "Show one large calendar page with the special date clearly marked, circled, or highlighted with a bold X.",
        "The calendar must be the dominant subject and easy for children to understand.",
        "Keep the date marking clear, simple, and visually strong.",
      ];
    }

    return [
      `Create ONE single illustration of: "${lemma}"`,
      "Show one simple symbolic celebration image for the holiday or event.",
      "Use a few clear iconic elements linked to the event as one centered composition.",
      "Keep the concept large, simple, and classroom-friendly.",
    ];
  }

  if (DATE_MONTHS.has(lowerLemma)) {
    if (variant.variantNumber === 1) {
      const dayCount = MONTH_DAY_COUNTS[lowerLemma];
      return [
        `Create ONE single illustration of: "${lemma}"`,
        `Show one large monthly calendar page clearly representing the month "${lemma}".`,
        `The calendar must show the correct number of days for ${lemma}: exactly ${dayCount} days.`,
        `Do not show any extra dates beyond ${dayCount}.`,
        "The month name must be large, clear, and dominant at the top.",
        "The calendar grid should be simple, bold, and easy to understand from across a classroom.",
        "The date boxes should be clear enough to count visually.",
        "Do not add decorative clutter or unrelated seasonal scenes.",
      ];
    }

    return [
      `Create ONE single illustration of: "${lemma}"`,
      DATE_MONTH_SCENES[lowerLemma],
      "Show a small visible background scene with grounded objects and no floating elements.",
      "The main seasonal concept should be large and obvious.",
      "Let the outer background edges softly fade into true PNG transparency.",
      "Do not include any calendar, planner, grid, date box, number, text, label, or month name.",
      "Use image only, not graphic symbols or written date elements.",
    ];
  }

  if (DATE_WEEKDAYS.has(lowerLemma)) {
    if (variant.variantNumber === 1) {
      return [
        `Create ONE single illustration of: "${lemma}"`,
        `Show one large weekly calendar or planner with all seven days visible in order from Monday through Sunday, clearly representing "${lemma}".`,
        `Make "${lemma}" the focus day by highlighting, circling, or shading it much more strongly than the other weekday names.`,
        "The weekly calendar should be the dominant centered subject.",
        "Keep all seven weekday names visible and in the correct order, but make the target day stand out clearly.",
        "Do not turn it into a scene or add routine activities yet.",
      ];
    }

    return [
      `Create ONE single illustration of: "${lemma}"`,
      DATE_WEEKDAY_SCENES[lowerLemma],
      "Show a small visible background scene with grounded objects and no floating elements.",
      "The routine concept should be clear, simple, and classroom-friendly.",
      "Let the outer background edges softly fade into true PNG transparency.",
      "Do not include any calendar, planner, grid, date box, number, text, label, or day name.",
      "Use image only, not graphic symbols or written date elements.",
    ];
  }

  if (variant.variantNumber === 1) {
    return [
      `Create ONE single illustration of: "${lemma}"`,
      "Show one large date-related calendar concept image.",
      "Keep the calendar centered, simple, and easy to understand.",
    ];
  }

  return [
    `Create ONE single illustration of: "${lemma}"`,
    "Show one simple symbolic concept image linked to the date.",
    "Keep the concept clear, centered, and educational.",
  ];
}

export function buildNounImagePrompt(params: {
  lemma: string;
  countability: NounCountability;
  variant: NounVariantDefinition;
}) {
  const { lemma, countability, variant } = params;

  const quantityBlock =
    variant.promptProfile === "body"
      ? buildBodyPrompt(lemma, variant)
      : variant.promptProfile === "dates"
      ? buildDatesPrompt(lemma, variant)
      : variant.promptProfile === "family"
      ? buildFamilyPrompt(lemma, variant)
      : variant.promptProfile === "jobs"
      ? buildJobsPrompt(lemma, variant)
      : variant.promptProfile === "drink"
      ? buildDrinkPrompt(lemma, variant)
      : variant.promptProfile === "clothes"
      ? buildClothesPrompt(lemma, variant)
      : variant.promptProfile === "classroom"
      ? buildClassroomPrompt(lemma, variant)
      : variant.promptProfile === "animals_land"
      ? buildLandAnimalPrompt(lemma, variant)
      : variant.promptProfile === "animals_baby"
      ? buildBabyAnimalPrompt(lemma, variant)
      : variant.promptProfile === "vegetable"
      ? buildVegetablePrompt(lemma, countability, variant)
      : countability === "uncount"
        ? buildUncountablePrompt(lemma, variant)
        : buildCountablePrompt(lemma, variant);
  const profileBlock = buildProfilePrompt(variant);
  const forbidPeople =
    variant.promptProfile !== "profession"
    && variant.promptProfile !== "jobs"
    && !(variant.promptProfile === "classroom" && variant.variantNumber === 3);

  const prompt = [
    ...quantityBlock,
    ...profileBlock,
    ...(variant.promptNote ? [variant.promptNote] : []),
    ...STYLE_BLOCK,
    `composition: ${COMPOSITION_BLOCK.join(", ")}`,
    `lighting: ${LIGHTING_BLOCK.join(", ")}`,
    ...(variant.promptProfile === "dates" && variant.variantNumber === 2
      ? [
          "TRUE alpha transparency ONLY (RGBA image)",
          "outer edges of the background should softly fade into transparency",
          "main scene elements should remain visible and grounded",
          "clean edges with NO halo",
          "NO white",
          "NO gray",
          "NO checkerboard",
          "NO fake transparency",
        ]
      : TRANSPARENCY_BLOCK),
    ...(variant.promptProfile === "dates" && variant.variantNumber === 2
      ? [
          "NO text",
          "NO watermark",
          "NO hard rectangular backdrop",
          "NO floating unrealistic arrangement",
          "NO messy composition",
        ]
      : NEGATIVE_BLOCK),
    "consistent style across all images",
    "same illustration style every time",
    "no variation in art style",
    "subject must remain centered and dominant",
    ...(forbidPeople ? ["no people", "no character", "no face", "no mascot"] : []),
    "no black and white",
    "no monochrome",
    "no pencil sketch",
    "no ink sketch",
    "no etching",
    "no engraving",
    ...(variant.promptProfile === "fruit"
      ? [
          "no tiny fruit",
          "no overly childlike proportions",
          "no sliced fruit unless explicitly requested",
          "no cut fruit unless explicitly requested",
          "no exploded view",
        ]
      : variant.promptProfile === "body"
        ? [
            "no creepy body part",
            "no horror",
            "no blood",
            "no gore",
            "no realistic anatomy photo",
            "no medical diagram",
            "no severed body part",
            "no zombie look",
            "no scary expression",
            "no arrow",
            "no label",
            "no writing",
            "no text",
            "no underwear",
            "no swimsuit",
            "no exposed torso",
            "no exposed body",
          ]
      : variant.promptProfile === "classroom"
        ? [
            "no tiny classroom item",
            "no messy desk scene",
            "no crowded classroom scene",
            "no writing",
            "no letters",
            "no numbers",
            "no worksheet text",
            "no blackboard writing",
            "no whiteboard writing",
            "no extra classroom objects unless explicitly requested",
          ]
      : variant.promptProfile === "dates"
        ? [
            "no tiny calendar",
            "no tiny text",
            "no dense writing",
            "no crowded planner details",
            "no realistic photograph calendar",
            "no busy holiday scene",
            ...(variant.variantNumber === 2
              ? [
                  "no calendar",
                  "no weekly planner",
                  "no monthly calendar",
                  "no schedule grid",
                  "no date boxes",
                  "no numbers",
                  "no digits",
                  "no letters",
                  "no floating icons",
                  "no isolated floating objects",
                  "no hard rectangular background",
                  "no busy full scene",
                ]
              : [
                  "no full environment scene",
                  "no people unless absolutely necessary for the concept",
                ]),
          ]
      : variant.promptProfile === "drink"
        ? [
            "no people",
            "no person",
            "no child",
            "no character",
            "no face",
            "no extra food",
            "no plate",
            "no tiny drink",
            "no spilled liquid",
            "no writing",
            "no labels",
            "no logos",
            "no cafe scene",
            "no restaurant background",
          ]
      : variant.promptProfile === "family"
        ? [
            "no extra people",
            "no second person",
            "no group",
            "no family group",
            "no baby unless the lemma is baby",
            "no extra props",
            "no text",
            "no labels",
            "no writing",
          ]
      : variant.promptProfile === "jobs"
        ? [
            "no cropped head",
            "no cropped feet",
            "no cut off hands",
            "no black dot eyes",
            "no bead eyes",
            "no blank eyes",
            "no uncanny eyes",
            "no object-only job image",
            "no tool-only image",
            "no extra unrelated people",
            "no text",
            "no labels",
            "no writing",
          ]
      : variant.promptProfile === "clothes"
        ? [
            "no people",
            "no person",
            "no child",
            "no character",
            "no mannequin",
            "no body wearing the clothes",
            "no extra accessories not listed",
            "no messy shop scene",
            "no cluttered wardrobe scene",
            "no text",
            "no labels",
            "no logos",
            "no writing",
          ]
      : variant.promptProfile === "animals_land"
        ? [
            "no family portrait composition",
            "no human handler",
            "no saddle",
            "no pet owner",
            "no cage",
            "no barn",
            "no farm background",
            "no wildlife background",
            "no tiny animal",
            "no scary expression",
          ]
      : variant.promptProfile === "vegetable"
        ? [
            "no tiny vegetable",
            "no overly childlike proportions",
            "no extra ingredients",
            "no cutting board",
            "no knife",
            "no kitchen scene",
            "no bowl unless explicitly needed",
          ]
      : variant.promptProfile === "animals_baby"
        ? [
            "no adult animal",
            "no mother animal",
            "no father animal",
            "no other animal species",
            "no pet owner",
            "no cage",
            "no barn",
            "no grass scene",
            "no farm background",
            "no wildlife background",
            "no tiny animal",
            "no scary expression",
          ]
      : ["no sliced fruit", "no cut fruit", "no exploded view"]),
  ].join(", ");

  const negativePrompt = [
    "photorealistic",
    "realistic photo",
    "semi-realistic",
    "real fruit texture",
    "3d render",
    "black and white",
    "monochrome",
    "grayscale",
    "pencil sketch",
    "ink sketch",
    "line drawing only",
    "etching",
    "engraving",
    "woodcut",
    "watercolor",
    "painterly",
    "muted colors",
    "dark colors",
    ...(variant.promptProfile === "fruit"
      ? ["tiny fruit", "babyish style", "overly cute toddler style"]
      : variant.promptProfile === "body"
        ? [
            "horror",
            "gore",
            "blood",
            "medical diagram",
            "anatomy diagram",
            "realistic anatomy",
            "severed body part",
            "creepy",
            "scary",
          ]
      : variant.promptProfile === "classroom"
        ? [
            "tiny classroom item",
            "messy classroom",
            "crowded classroom",
            "worksheet text",
            "board writing",
            "extra school supplies",
          ]
      : variant.promptProfile === "dates"
        ? [
            "tiny calendar",
            "dense text",
            "small unreadable numbers",
            "busy planner",
            "realistic photo calendar",
            "crowded holiday scene",
            ...(variant.variantNumber === 2
              ? [
                  "calendar",
                  "planner",
                  "calendar grid",
                  "date boxes",
                  "numbers",
                  "digits",
                  "letters",
                  "text overlay",
                  "floating objects",
                  "floating icons",
                  "hard rectangular background",
                  "opaque background block",
                ]
              : ["full room scene"]),
          ]
      : variant.promptProfile === "drink"
        ? [
            "people",
            "person",
            "child",
            "character",
            "face",
            "food",
            "plate",
            "tiny drink",
            "spilled drink",
            "labels",
            "logos",
            "text",
            "cafe scene",
            "restaurant background",
          ]
      : variant.promptProfile === "family"
        ? [
            "extra people",
            "group portrait",
            "family group",
            "crowd",
            "labels",
            "text",
            "writing",
            "extra props",
          ]
      : variant.promptProfile === "jobs"
        ? [
            "cropped head",
            "cropped feet",
            "cut off hands",
            "black dot eyes",
            "bead eyes",
            "blank eyes",
            "uncanny eyes",
            "tool only",
            "object only",
            "extra unrelated people",
            "labels",
            "text",
            "writing",
          ]
      : variant.promptProfile === "clothes"
        ? [
            "people",
            "person",
            "child",
            "character",
            "mannequin",
            "wearing the clothes",
            "fashion model",
            "messy shop",
            "cluttered wardrobe",
            "labels",
            "logos",
            "text",
          ]
      : variant.promptProfile === "animals_land"
        ? [
            "human",
            "pet owner",
            "zookeeper",
            "saddle",
            "barn scene",
            "farm scene",
            "forest scene",
            "family portrait",
            "tiny animal",
            "scary animal",
          ]
      : variant.promptProfile === "vegetable"
        ? [
            "tiny vegetable",
            "babyish style",
            "overly cute toddler style",
            "cutting board",
            "knife",
            "kitchen counter",
            "extra ingredients",
          ]
        : variant.promptProfile === "animals_baby"
          ? [
              "adult animal",
              "parent animal",
              "other animal species",
              "barn scene",
              "farm scene",
              "grass field",
              "forest scene",
              "tiny animal",
              "scary animal",
            ]
      : []),
    "complex background",
    "room",
    "landscape",
    "floor",
    "table",
    "surface",
    "shadow plane",
    "cast shadow",
    "glow",
    "halo",
    "gradient background",
    "checkerboard",
    "watermark",
    "text",
    "logo",
    "busy composition",
    "cropped subject",
    "subject cut off",
    "multiple unrelated objects",
    "floating objects",
    "scattered objects",
    "scattered arrangement",
    "sliced fruit",
    "cut fruit",
    "cross section",
    "exploded view",
    "abstract arrangement",
    ...(forbidPeople
      ? [
          "people",
          "person",
          "child",
          "character",
          "mascot",
          "face",
          "eyes",
          "arms",
          "legs",
        ]
      : []),
    "frame",
    "border",
  ].join(", ");

  return { prompt, negativePrompt };
}
