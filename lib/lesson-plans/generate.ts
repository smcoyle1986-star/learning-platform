import { LessonRecord } from "@/lib/lessons/types";
import {
  DEFAULT_LESSON_PLAN_PREFERENCES,
  LessonLevel,
  LessonPlanDraft,
  LessonPlanPreferences,
  LessonPlanStage,
  LessonToolRecommendation,
} from "@/lib/lesson-plans/types";

type VocabularyFocus =
  | "noun"
  | "verb"
  | "adjective"
  | "phonics"
  | "preposition"
  | "mixed";

type LessonProfile = {
  focus: VocabularyFocus;
  cardCount: number;
  words: string[];
  sampleWords: string[];
  chunkSize: number;
  targetCount: number;
  hasImages: boolean;
  hasBackText: boolean;
};

type ToolOption = {
  id: string;
  label: string;
};

type PlanSuggestion = {
  games: ToolOption[];
  worksheets: ToolOption[];
};

const GAME_POOLS: Record<LessonLevel, ToolOption[]> = {
  beginner: [
    { id: "image-reveal", label: "Image Reveal" },
    { id: "yes-or-no", label: "Yes or No?" },
    { id: "four-corners", label: "Four Corners" },
    { id: "memory-flip", label: "Memory Flip" },
  ],
  middle: [
    { id: "spin-and-speak", label: "Spin and Speak" },
    { id: "kaboom", label: "KaBoom!" },
    { id: "memory-flip", label: "Memory Flip" },
    { id: "four-corners", label: "Four Corners" },
  ],
  high: [
    { id: "conquer", label: "Conquer" },
    { id: "connect-four", label: "Connect Four" },
    { id: "spin-and-speak", label: "Spin and Speak" },
    { id: "yes-or-no", label: "Yes or No?" },
  ],
};

const WORKSHEET_POOLS: Record<LessonLevel, ToolOption[]> = {
  beginner: [
    { id: "writing", label: "Writing" },
    { id: "matching", label: "Matching" },
    { id: "tic-tac-toe", label: "Tic-Tac-Toe" },
  ],
  middle: [
    { id: "wordsearch", label: "Wordsearch" },
    { id: "sentence-scramble", label: "Sentence Scramble" },
    { id: "questions", label: "Question Builder" },
  ],
  high: [
    { id: "questions", label: "Question Builder" },
    { id: "reading", label: "Reading" },
    { id: "sentence-scramble", label: "Sentence Scramble" },
    { id: "writing", label: "Writing" },
  ],
};

const FOCUS_LABELS: Record<VocabularyFocus, string> = {
  noun: "noun vocabulary",
  verb: "action language",
  adjective: "describing language",
  phonics: "phonics and sound–spelling patterns",
  preposition: "position and location language",
  mixed: "mixed vocabulary",
};

function cleanWord(word?: string) {
  return (word ?? "").replaceAll("_", " ").trim();
}

function hashString(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function rotatePick<T>(items: T[], seed: number, count: number) {
  if (items.length === 0) return [];
  const shift = seed % items.length;
  return [...items.slice(shift), ...items.slice(0, shift)].slice(0, count);
}

function normalizeCardType(type?: string): VocabularyFocus | null {
  const normalized = (type ?? "").trim().toLowerCase();
  if (normalized.includes("noun")) return "noun";
  if (normalized.includes("verb")) return "verb";
  if (normalized.includes("adjective")) return "adjective";
  if (normalized.includes("phonic")) return "phonics";
  if (normalized.includes("preposition")) return "preposition";
  return null;
}

function analyzeLesson(
  lesson: LessonRecord,
  level: LessonLevel,
  preferences: LessonPlanPreferences,
): LessonProfile {
  const words = lesson.cards.map((card) => cleanWord(card.word)).filter(Boolean);
  const counts = new Map<VocabularyFocus, number>();

  lesson.cards.forEach((card) => {
    const type = normalizeCardType(card.type);
    if (type) counts.set(type, (counts.get(type) ?? 0) + 1);
  });

  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const focus =
    dominant && dominant[1] >= Math.max(2, Math.ceil(lesson.cards.length * 0.6))
      ? dominant[0]
      : "mixed";
  const baseChunkSize = level === "beginner" ? 4 : 6;
  const supportChunkAdjustment =
    preferences.supportLevel === "high" ? -1 : preferences.supportLevel === "challenge" ? 1 : 0;
  const purposeChunkAdjustment = preferences.purpose === "review" ? 2 : 0;
  const chunkSize =
    lesson.cards.length <= 6
      ? Math.max(lesson.cards.length, 1)
      : Math.max(3, baseChunkSize + supportChunkAdjustment + purposeChunkAdjustment);
  const levelTarget = level === "beginner" ? 0.7 : level === "middle" ? 0.8 : 0.9;
  const supportTargetAdjustment =
    preferences.supportLevel === "high" ? -0.1 : preferences.supportLevel === "challenge" ? 0.05 : 0;
  const purposeTargetAdjustment = preferences.purpose === "review" ? 0.05 : 0;
  const accuracyTarget = Math.min(1, Math.max(0.5, levelTarget + supportTargetAdjustment + purposeTargetAdjustment));

  return {
    focus,
    cardCount: lesson.cards.length,
    words,
    sampleWords: words.slice(0, 5),
    chunkSize,
    targetCount: Math.max(1, Math.ceil(lesson.cards.length * accuracyTarget)),
    hasImages: lesson.cards.some((card) => Boolean(card.image)),
    hasBackText: lesson.cards.some((card) => Boolean(card.back?.trim())),
  };
}

function prioritizeTools(
  tools: ToolOption[],
  preferredIds: string[],
) {
  return [...tools].sort((left, right) => {
    const leftRank = preferredIds.indexOf(left.id);
    const rightRank = preferredIds.indexOf(right.id);
    const normalizedLeft = leftRank === -1 ? Number.MAX_SAFE_INTEGER : leftRank;
    const normalizedRight = rightRank === -1 ? Number.MAX_SAFE_INTEGER : rightRank;
    return normalizedLeft - normalizedRight;
  });
}

function getSuggestions(
  level: LessonLevel,
  seed: number,
  preferences: LessonPlanPreferences,
): PlanSuggestion {
  const gamePriorities =
    preferences.skillFocus === "speaking"
      ? ["spin-and-speak", "yes-or-no", "four-corners"]
      : preferences.skillFocus === "reading" || preferences.skillFocus === "writing"
        ? ["memory-flip", "image-reveal", "connect-four"]
        : preferences.skillFocus === "phonics"
          ? ["image-reveal", "memory-flip", "yes-or-no"]
          : [];
  const worksheetPriorities =
    preferences.skillFocus === "writing"
      ? ["writing", "sentence-scramble", "questions"]
      : preferences.skillFocus === "reading"
        ? ["reading", "wordsearch", "questions"]
        : preferences.skillFocus === "phonics"
          ? ["writing", "matching", "wordsearch"]
          : preferences.skillFocus === "speaking"
            ? ["questions", "tic-tac-toe", "matching"]
            : [];
  const games = prioritizeTools(GAME_POOLS[level], gamePriorities);
  const worksheets = prioritizeTools(WORKSHEET_POOLS[level], worksheetPriorities);

  return {
    games: rotatePick(
      games,
      gamePriorities.length > 0 ? 0 : seed,
      Math.max(preferences.gameCount, 1),
    ),
    worksheets: rotatePick(
      worksheets,
      worksheetPriorities.length > 0 ? 0 : seed + 1,
      Math.max(preferences.worksheetCount, 1),
    ),
  };
}

function getLanguageGuidance(profile: LessonProfile) {
  switch (profile.focus) {
    case "noun":
      return {
        model: "Model each word with the correct article, then contrast singular and plural forms where the cards allow it.",
        prompt: 'Ask “What is it?” and prompt “It is a/an …” before revealing the text.',
        support: "Accept pointing or a one-word answer first, then recast it as a complete phrase.",
        challenge: "Ask students to classify the nouns or use two target words in one sentence.",
      };
    case "verb":
      return {
        model: "Model the action, say the base verb clearly, and connect it to a short action sentence.",
        prompt: 'Ask “What is happening?” and prompt “He/She is …ing.”',
        support: "Let students mime the action before they say the word.",
        challenge: "Ask students to change the subject or tense in the model sentence.",
      };
    case "adjective":
      return {
        model: "Model the meaning through a visual contrast and place each adjective in a short descriptive sentence.",
        prompt: 'Ask “What is it like?” and prompt “It is …”',
        support: "Offer two contrasting adjective choices while students point to the matching image.",
        challenge: "Ask for an opposite, a comparison, or a reason for the description.",
      };
    case "preposition":
      return {
        model: "Demonstrate each position physically and pair it with a clear location sentence.",
        prompt: 'Ask “Where is it?” and prompt “It is … the …”',
        support: "Use classroom objects and let students copy the position before speaking.",
        challenge: "Ask students to give a partner a two-step location instruction.",
      };
    case "phonics":
      return {
        model: "Model the target sound, have students watch the mouth position, then blend the sound into each word.",
        prompt: "Ask students to identify, repeat, segment, and blend the target sound before showing the word.",
        support: "Stretch the target sound and tap one beat for each phoneme or syllable.",
        challenge: "Ask students to sort the words or suggest another word with the same spelling pattern.",
      };
    default:
      return {
        model: "Model meaning, pronunciation, and one useful sentence for each card before asking students to respond.",
        prompt: "Use a short meaning question followed by a sentence prompt that matches each card.",
        support: "Allow pointing, either/or choices, and choral repetition before individual answers.",
        challenge: "Ask students to connect two cards in a meaningful sentence or explanation.",
      };
  }
}

function classroomTool(
  id: string,
  label: string,
  displayMode: "image" | "image+text" | "text",
  reason: string,
  durationMinutes: number,
): LessonToolRecommendation {
  return {
    kind: "classroom",
    id,
    label,
    reason,
    durationMinutes,
    settings: {
      displayMode,
      shuffle: displayMode !== "image+text",
      fullscreen: true,
    },
  };
}

function gameReason(level: LessonLevel, profile: LessonProfile) {
  if (level === "beginner") {
    return `Gives repeated image-to-word retrieval without asking learners to produce all ${profile.cardCount} items independently at once.`;
  }
  if (level === "middle") {
    return "Adds paced speaking and recognition practice after the language has been explicitly taught.";
  }
  return "Requires faster retrieval, explanation, and strategic language use after guided practice.";
}

function worksheetReason(level: LessonLevel, profile: LessonProfile) {
  const focus = FOCUS_LABELS[profile.focus];
  if (level === "beginner") {
    return `Provides supported recognition and writing practice for the ${focus}.`;
  }
  if (level === "middle") {
    return `Moves the ${focus} from whole-class recall into an individual reading or writing check.`;
  }
  return `Provides independent application of the ${focus} with less teacher support.`;
}

type WeightedStage = Omit<LessonPlanStage, "time"> & { weight: number };

function getInteractionPattern(preferences: LessonPlanPreferences) {
  if (preferences.classFormat === "individual") {
    return "The learner answers first, explains the choice, and then checks the reveal with the teacher.";
  }
  if (preferences.classFormat === "small-group") {
    return "Students rehearse with a partner, compare answers in the group, and nominate one speaker.";
  }
  return "Use a whole-class response first, then partners, then selected individual answers.";
}

function getAgeGuidance(preferences: LessonPlanPreferences) {
  if (preferences.ageGroup === "early-years") {
    return "Keep instructions to one step, use movement and gesture, and change responder frequently.";
  }
  if (preferences.ageGroup === "primary") {
    return "Use short model sentences, visible turn-taking, and quick changes between listening and speaking.";
  }
  if (preferences.ageGroup === "secondary") {
    return "Ask for complete responses, reasons, and peer correction without making the pace feel childish.";
  }
  return "Use natural examples, purposeful questions, and adult-relevant contexts rather than choral drilling alone.";
}

function getSkillInstruction(preferences: LessonPlanPreferences) {
  switch (preferences.skillFocus) {
    case "speaking":
      return "Require a spoken target word or sentence before revealing the answer.";
    case "reading":
      return "Give students quiet reading time before they say or match the answer.";
    case "writing":
      return "Have students write the response before the card or answer is revealed.";
    case "phonics":
      return "Ask students to identify, segment, or blend the target sound before revealing the full word.";
    default:
      return "Balance listening, speaking, reading, and a short written response.";
  }
}

function getPurposeInstruction(preferences: LessonPlanPreferences) {
  if (preferences.purpose === "practice") {
    return "Briefly refresh meaning and move quickly into repeated supported use.";
  }
  if (preferences.purpose === "review") {
    return "Elicit first, reteach only the cards students miss, and prioritise shuffled retrieval.";
  }
  return "Explicitly model meaning, pronunciation, and a useful response before removing support.";
}

function getSupportInstruction(preferences: LessonPlanPreferences) {
  if (preferences.supportLevel === "high") {
    return "Use either/or choices, choral rehearsal, gestures, and a visible model before individual answers.";
  }
  if (preferences.supportLevel === "challenge") {
    return "Remove visual prompts quickly and require a complete sentence, explanation, or additional example.";
  }
  return "Give one model, one supported attempt, and then an independent response.";
}

function allocateMinutes(totalMinutes: number, stages: WeightedStage[]) {
  const totalWeight = stages.reduce((sum, stage) => sum + stage.weight, 0);
  const raw = stages.map((stage) => (stage.weight / totalWeight) * totalMinutes);
  const minutes = raw.map((value) => Math.floor(value));
  let remainder = totalMinutes - minutes.reduce((sum, value) => sum + value, 0);
  const rankedFractions = raw
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((left, right) => right.fraction - left.fraction);

  for (let index = 0; remainder > 0; index += 1) {
    minutes[rankedFractions[index % rankedFractions.length].index] += 1;
    remainder -= 1;
  }

  return minutes;
}

function applyTimes(
  stages: WeightedStage[],
  totalMinutes: number,
  startMinute = 0,
): LessonPlanStage[] {
  const minutes = allocateMinutes(totalMinutes, stages);
  let cursor = startMinute;
  return stages.map((stage, index) => {
    const end = cursor + minutes[index];
    const timedStage: LessonPlanStage = {
      ...stage,
      time: `${cursor}–${end} min`,
    };
    delete (timedStage as LessonPlanStage & { weight?: number }).weight;
    cursor = end;
    if (timedStage.tool) {
      timedStage.tool = {
        ...timedStage.tool,
        durationMinutes: minutes[index],
      };
    }
    return timedStage;
  });
}

function buildGameStage(
  option: ToolOption,
  index: number,
  level: LessonLevel,
  profile: LessonProfile,
  preferences: LessonPlanPreferences,
  guidance: ReturnType<typeof getLanguageGuidance>,
): WeightedStage {
  return {
    id: `game-practice-${index + 1}`,
    title: `Focused game · ${option.label}`,
    purpose:
      index === 0
        ? "Increase accurate repetitions while keeping students attentive and involved."
        : "Recycle the same language through a different response pattern.",
    teacherAction: `Open ${option.label} with the current lesson tray. ${getSkillInstruction(preferences)} Apply the same success rule on every turn.`,
    studentAction: `${getInteractionPattern(preferences)} Students correct an answer after feedback before play continues.`,
    checkForUnderstanding: "Track whether errors and response time improve during the activity.",
    tool: {
      kind: "game",
      id: option.id,
      label: option.label,
      reason: gameReason(level, profile),
      settings: {
        useCurrentLessonTray: true,
        requireSpokenAnswer: preferences.skillFocus !== "writing",
        classFormat: preferences.classFormat,
      },
    },
    support: `${guidance.support} ${getSupportInstruction(preferences)}`,
    challenge: guidance.challenge,
    weight: 1.6,
  };
}

function buildWorksheetStage(
  option: ToolOption,
  index: number,
  level: LessonLevel,
  profile: LessonProfile,
  preferences: LessonPlanPreferences,
  guidance: ReturnType<typeof getLanguageGuidance>,
): WeightedStage {
  return {
    id: `worksheet-application-${index + 1}`,
    title: `${index === 0 ? "Independent application" : "Extension task"} · ${option.label}`,
    purpose:
      index === 0
        ? "Check individual recognition, reading, or writing after oral practice."
        : "Extend or consolidate the first independent task.",
    teacherAction: `Open ${option.label} with the current lesson cards. Model the first item, then reduce support while checking the cards missed earlier.`,
    studentAction:
      preferences.classFormat === "individual"
        ? "Complete the task independently and explain one answer to the teacher."
        : "Complete the task independently, then compare one answer with a partner.",
    checkForUnderstanding: `Look for at least ${profile.targetCount} accurate responses out of ${profile.cardCount}, adjusting for the number of worksheet items.`,
    tool: {
      kind: "worksheet",
      id: option.id,
      label: option.label,
      reason: worksheetReason(level, profile),
      settings: {
        difficulty:
          preferences.supportLevel === "high"
            ? "easy"
            : preferences.supportLevel === "challenge"
              ? "hard"
              : level === "beginner"
                ? "easy"
                : level === "middle"
                  ? "medium"
                  : "hard",
        useCurrentLessonTray: true,
        skillFocus: preferences.skillFocus,
      },
    },
    support: `${guidance.support} ${getSupportInstruction(preferences)}`,
    challenge: guidance.challenge,
    weight: 1.8,
  };
}

function buildStages(
  level: LessonLevel,
  profile: LessonProfile,
  suggestions: PlanSuggestion,
  preferences: LessonPlanPreferences,
): LessonPlanStage[] {
  const guidance = getLanguageGuidance(profile);
  const sample = profile.sampleWords.join(", ") || "the selected lesson cards";
  const diagnosticMode = profile.hasImages ? "image" : "text";
  const retrievalMode =
    preferences.skillFocus === "reading" ||
    preferences.skillFocus === "writing" ||
    preferences.skillFocus === "phonics" ||
    level !== "beginner"
      ? "text"
      : profile.hasImages
        ? "image"
        : "text";
  const sharedSupport = `${guidance.support} ${getSupportInstruction(preferences)}`;
  const interaction = getInteractionPattern(preferences);
  const ageGuidance = getAgeGuidance(preferences);

  const diagnose: WeightedStage = {
    id: "diagnose",
    title: preferences.purpose === "review" ? "Rapid review check" : "Retrieve before teaching",
    purpose: "Activate prior knowledge and identify which cards need the most support.",
    teacherAction: `Open Classroom in ${diagnosticMode === "image" ? "Image Only" : "Text Only"} mode, shuffle the lesson, and show ${sample}. Pause before supplying an answer.`,
    studentAction: `Name, point to, read, or make a sensible guess for each card. ${interaction}`,
    checkForUnderstanding:
      "Note which cards fewer than half of the class can identify; prioritise those in the next stage.",
    tool: classroomTool(
      "classroom-diagnostic",
      `Classroom · ${diagnosticMode === "image" ? "Image Only" : "Text Only"}`,
      diagnosticMode,
      "Hides one side of each flashcard so the teacher can check genuine recall.",
      0,
    ),
    support: sharedSupport,
    challenge: guidance.challenge,
    weight: preferences.purpose === "review" ? 1.3 : 1,
  };

  const teach: WeightedStage = {
    id: "teach",
    title:
      preferences.purpose === "teach"
        ? "Teach with Classroom"
        : preferences.purpose === "practice"
          ? "Refresh with Classroom"
          : "Reteach missed cards",
    purpose: `${preferences.purpose === "teach" ? "Explicitly teach" : "Strengthen"} the ${FOCUS_LABELS[profile.focus]} in manageable groups.`,
    teacherAction: `Switch to Image + Text and work with about ${profile.chunkSize} cards at a time. ${getPurposeInstruction(preferences)} ${guidance.model} ${guidance.prompt}`,
    studentAction: `Listen or retrieve, rehearse the model response, and give an individual answer before the next group of cards. ${ageGuidance}`,
    checkForUnderstanding: `Continue when most students can respond to at least ${Math.min(profile.chunkSize, profile.cardCount)} cards with the selected support.`,
    tool: classroomTool(
      "classroom-teach",
      "Classroom · Image + Text",
      "image+text",
      "Keeps the image, written form, teacher modelling, and annotation in one shared teaching view.",
      0,
    ),
    support: sharedSupport,
    challenge: guidance.challenge,
    weight: preferences.purpose === "teach" ? 2.4 : preferences.purpose === "practice" ? 1.8 : 1.3,
  };

  const guided: WeightedStage = {
    id: "guided-retrieval",
    title: "Hide, recall and reveal",
    purpose: "Move from supported recognition to retrieval before independent activities.",
    teacherAction: `Use Classroom in ${retrievalMode === "image" ? "Image Only" : "Text Only"} mode. Shuffle the cards and reveal each answer only after a response. ${getSkillInstruction(preferences)}`,
    studentAction: interaction,
    checkForUnderstanding: `Students should retrieve at least ${Math.max(1, Math.ceil(profile.targetCount * 0.75))} of ${profile.cardCount} cards with a prompt.`,
    tool: classroomTool(
      "classroom-retrieval",
      `Classroom · ${retrievalMode === "image" ? "Image Only" : "Text Only"}`,
      retrievalMode,
      "Builds recall with the same lesson cards before independent application.",
      0,
    ),
    support: sharedSupport,
    challenge: guidance.challenge,
    weight: preferences.purpose === "teach" ? 1.7 : 2.1,
  };

  const exit: WeightedStage = {
    id: "exit-check",
    title: "Classroom exit check",
    purpose: "Measure what students can retrieve without relying on card order.",
    teacherAction:
      "Return to Classroom, shuffle the cards, and test a balanced sample including the cards missed during the opening.",
    studentAction:
      "Give an individual word, phrase, sentence, written response, or sound response before the answer is revealed.",
    checkForUnderstanding: `Lesson success: students independently retrieve at least ${profile.targetCount} of the ${profile.cardCount} lesson cards.`,
    tool: classroomTool(
      "classroom-exit",
      "Classroom · Text Only",
      "text",
      "Provides a fast final check using the exact content taught during the lesson.",
      0,
    ),
    support:
      "Offer one visual or first-sound prompt, but record that the response required support.",
    challenge: guidance.challenge,
    weight: 1,
  };

  const games = suggestions.games
    .slice(0, preferences.gameCount)
    .map((option, index) =>
      buildGameStage(option, index, level, profile, preferences, guidance),
    );
  const worksheets = suggestions.worksheets
    .slice(0, preferences.worksheetCount)
    .map((option, index) =>
      buildWorksheetStage(option, index, level, profile, preferences, guidance),
    );

  const classroomApplication: WeightedStage = {
    id: "classroom-application",
    title: "Classroom application challenge",
    purpose: "Apply the lesson without adding a game or printable worksheet.",
    teacherAction: `Use shuffled Text Only cards and ask students to create a response that matches the ${preferences.skillFocus === "balanced" ? "lesson focus" : preferences.skillFocus}.`,
    studentAction: `${interaction} Students improve one response after feedback.`,
    checkForUnderstanding: `Collect an accurate response for at least ${profile.targetCount} of the ${profile.cardCount} cards across the class or learner.`,
    tool: classroomTool(
      "classroom-application",
      "Classroom · Text Only",
      "text",
      "Keeps the full lesson inside Classroom when games or worksheets are not selected.",
      0,
    ),
    support: sharedSupport,
    challenge: guidance.challenge,
    weight: 1.6,
  };

  if (preferences.durationMinutes < 90) {
    const activityStages = [
      ...games,
      ...worksheets,
      ...(games.length === 0 && worksheets.length === 0 ? [classroomApplication] : []),
    ];
    return applyTimes(
      [diagnose, teach, guided, ...activityStages, exit],
      preferences.durationMinutes,
    );
  }

  const breakMinutes = 10;
  const blockMinutes = (preferences.durationMinutes - breakMinutes) / 2;
  const firstBlockActivities =
    games.length > 0 ? [games[0]] : [classroomApplication];
  const firstBlock = applyTimes(
    [diagnose, teach, guided, ...firstBlockActivities],
    blockMinutes,
  );
  const breakStart = blockMinutes;
  const breakStage: LessonPlanStage = {
    id: "midpoint-break",
    time: `${breakStart}–${breakStart + breakMinutes} min`,
    title: "Midpoint break",
    purpose: "Separate the two teaching blocks and give students time to reset.",
    teacherAction:
      "Pause the activity and leave the Classendo lesson tray loaded for the second block.",
    studentAction: "Take a break and return ready for a short retrieval restart.",
    checkForUnderstanding: "Restart only when students are settled and ready to respond.",
    tool: {
      kind: "offline",
      id: "midpoint-break",
      label: `${breakMinutes}-minute break`,
      reason: "Creates two clear teaching blocks within the longer lesson.",
      durationMinutes: breakMinutes,
    },
  };
  const reactivate: WeightedStage = {
    id: "reactivate",
    title: "Reactivate after the break",
    purpose: "Reconnect students with the language before beginning the second block.",
    teacherAction:
      "Open Classroom in Image Only mode, shuffle, and run a fast no-hands retrieval round.",
    studentAction: interaction,
    checkForUnderstanding:
      "Reteach only the cards that are still missed before moving into application.",
    tool: classroomTool(
      "classroom-reactivate",
      "Classroom · Image Only",
      "image",
      "Restarts the second block with familiar visual retrieval.",
      0,
    ),
    support: sharedSupport,
    challenge: guidance.challenge,
    weight: 1,
  };
  const secondBlockActivities = [
    ...games.slice(1),
    ...worksheets,
    ...(games.slice(1).length === 0 && worksheets.length === 0
      ? [classroomApplication]
      : []),
  ];
  const production: WeightedStage = {
    ...classroomApplication,
    id: "extended-production",
    title: "Personalised production",
    purpose:
      "Use the target content in a less controlled response before the final check.",
    teacherAction:
      "Let students choose or shuffle target cards, then prompt a personalised sentence, question, explanation, or example for each selection.",
    studentAction: `${interaction} Students listen to one another and improve one response after feedback.`,
    weight: 1.4,
  };
  const secondBlock = applyTimes(
    [reactivate, ...secondBlockActivities, production, exit],
    blockMinutes,
    blockMinutes + breakMinutes,
  );

  return [...firstBlock, breakStage, ...secondBlock];
}

function stageSummary(stage: LessonPlanStage) {
  return `${stage.time} · ${stage.title} — ${stage.teacherAction} Students: ${stage.studentAction} Check: ${stage.checkForUnderstanding}`;
}

function buildObjective(level: LessonLevel, lesson: LessonRecord, profile: LessonProfile) {
  const lessonName = cleanWord(lesson.name).toLowerCase();
  const production =
    level === "beginner"
      ? "recognise and say"
      : level === "middle"
        ? "identify and use"
        : "accurately apply";
  return `By the end of the lesson, students will ${production} at least ${profile.targetCount} of ${profile.cardCount} ${lessonName} cards during a shuffled Classroom check.`;
}

function buildMaterials(
  lesson: LessonRecord,
  profile: LessonProfile,
  suggestions: PlanSuggestion,
  preferences: LessonPlanPreferences,
) {
  const optionalBackText = profile.hasBackText
    ? " Use the existing card-back text for extension questions."
    : "";
  const selectedActivities = [
    ...suggestions.games.slice(0, preferences.gameCount).map((game) => game.label),
    ...suggestions.worksheets
      .slice(0, preferences.worksheetCount)
      .map((worksheet) => worksheet.label),
  ];
  const activityText = selectedActivities.length
    ? `; ${selectedActivities.join("; ")}`
    : "";
  return `Classendo lesson tray with ${profile.cardCount} cards; Classroom mode on a shared display${activityText}; whiteboard or student writing tools.${optionalBackText}`;
}

export function buildLessonPlanDraft(
  lesson: LessonRecord,
  level: LessonLevel,
  variant: number,
  requestedPreferences: LessonPlanPreferences = DEFAULT_LESSON_PLAN_PREFERENCES,
): LessonPlanDraft {
  const preferences = {
    ...DEFAULT_LESSON_PLAN_PREFERENCES,
    ...requestedPreferences,
  };
  const seed = hashString(
    `${lesson.id}:${level}:${variant}:${JSON.stringify(preferences)}:${lesson.cards.map((card) => card.id).join("|")}`,
  );
  const profile = analyzeLesson(lesson, level, preferences);
  const suggestions = getSuggestions(level, seed, preferences);
  const stages = buildStages(level, profile, suggestions, preferences);
  const teachingGuidance = getLanguageGuidance(profile);
  const recommendedTools = stages
    .map((stage) => stage.tool)
    .filter((tool): tool is LessonToolRecommendation => Boolean(tool));

  return {
    selectedLessonId: lesson.id,
    level,
    variant,
    preferences,
    title: `${lesson.name} Lesson Plan`,
    focus: `${lesson.name} · ${FOCUS_LABELS[profile.focus]} · ${preferences.skillFocus} focus · ${preferences.durationMinutes} minutes`,
    objective: buildObjective(level, lesson, profile),
    materials: buildMaterials(lesson, profile, suggestions, preferences),
    schedule: stages.map(stageSummary).join("\n"),
    stages,
    recommendedTools,
    recommendedGames: suggestions.games
      .slice(0, preferences.gameCount)
      .map((game) => game.label)
      .join(" · "),
    recommendedWorksheets: suggestions.worksheets
      .slice(0, preferences.worksheetCount)
      .map((worksheet) => worksheet.label)
      .join(" · "),
    warmUp: `${stages[0].teacherAction} ${stages[0].checkForUnderstanding}`,
    guidedPractice: `${stages[1].teacherAction}\n\n${stages[2].teacherAction}`,
    independentPractice: (() => {
      const independentStage =
        stages.find((stage) => stage.tool?.kind === "worksheet") ??
        stages.find((stage) => stage.id === "classroom-application") ??
        stages.find((stage) => stage.id === "extended-production");
      return independentStage
        ? `${independentStage.teacherAction} ${independentStage.checkForUnderstanding}`
        : "Use the guided retrieval results to choose a short independent response task.";
    })(),
    wrapUp: `${stages.at(-1)?.teacherAction ?? ""} ${stages.at(-1)?.checkForUnderstanding ?? ""}`.trim(),
    assessment:
      stages.at(-1)?.checkForUnderstanding ??
      `Check independent recall of ${profile.targetCount} lesson cards.`,
    notes: `Teach ${profile.chunkSize} cards at a time. ${getAgeGuidance(preferences)} ${getInteractionPattern(preferences)} ${teachingGuidance.support} Challenge: ${teachingGuidance.challenge} Classroom remains the main presentation, retrieval, and assessment tool.`,
  };
}
