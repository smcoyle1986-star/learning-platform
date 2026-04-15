import { LessonRecord } from "@/lib/lessons/types";

export type LessonPlanSectionKey =
  | "focus"
  | "objective"
  | "materials"
  | "warmUp"
  | "guidedPractice"
  | "independentPractice"
  | "wrapUp"
  | "assessment"
  | "notes";

export type LessonPlanDraft = {
  selectedLessonId: string | null;
  title: string;
  focus: string;
  objective: string;
  materials: string;
  warmUp: string;
  guidedPractice: string;
  independentPractice: string;
  wrapUp: string;
  assessment: string;
  notes: string;
};

export const LESSON_PLAN_DRAFT_KEY = "classendo-lesson-plan-draft";

export const EMPTY_LESSON_PLAN_DRAFT: LessonPlanDraft = {
  selectedLessonId: null,
  title: "",
  focus: "",
  objective: "",
  materials: "",
  warmUp: "",
  guidedPractice: "",
  independentPractice: "",
  wrapUp: "",
  assessment: "",
  notes: "",
};

export function createDraftFromLesson(lesson: LessonRecord): LessonPlanDraft {
  const cardCount = lesson.cards.length;
  const title = `${lesson.name} Lesson Plan`;
  const sampleWords = lesson.cards
    .slice(0, 6)
    .map((card) => card.word.replaceAll("_", " "))
    .join(", ");

  return {
    selectedLessonId: lesson.id,
    title,
    focus: lesson.name,
    objective: `Students will practice and use ${lesson.name.toLowerCase()} vocabulary with increasing confidence.`,
    materials: `Classendo lesson set, flashcards, board work, and printable follow-up. ${cardCount} target cards included.${sampleWords ? ` Key words: ${sampleWords}.` : ""}`,
    warmUp: "Quick review with image prompts and whole-class repetition.",
    guidedPractice: "Model the target language, check meaning together, and guide students through short spoken responses.",
    independentPractice: "Students complete a short pair or individual task using the lesson vocabulary independently.",
    wrapUp: "Review the key target words and ask students to produce one final spoken sentence or response.",
    assessment: "Listen for accurate vocabulary use and check whether students can identify and produce the target language without prompts.",
    notes: "",
  };
}
