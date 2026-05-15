import { LessonRecord } from "@/lib/lessons/types";

export type LessonLevel = "beginner" | "middle" | "high";

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
  level: LessonLevel;
  variant: number;
  title: string;
  focus: string;
  objective: string;
  materials: string;
  schedule: string;
  recommendedGames: string;
  recommendedWorksheets: string;
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
  level: "beginner",
  variant: 0,
  title: "",
  focus: "",
  objective: "",
  materials: "",
  schedule: "",
  recommendedGames: "",
  recommendedWorksheets: "",
  warmUp: "",
  guidedPractice: "",
  independentPractice: "",
  wrapUp: "",
  assessment: "",
  notes: "",
};

export function createDraftFromLesson(lesson: LessonRecord): LessonPlanDraft {
  return {
    ...EMPTY_LESSON_PLAN_DRAFT,
    selectedLessonId: lesson.id,
    title: `${lesson.name} Lesson Plan`,
    focus: lesson.name,
  };
}
