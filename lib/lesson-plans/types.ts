import { LessonRecord } from "@/lib/lessons/types";

export type LessonLevel = "beginner" | "middle" | "high";
export type LessonDurationMinutes = 30 | 40 | 50 | 60 | 90 | 120;
export type LessonPurpose = "teach" | "practice" | "review";
export type LessonClassFormat = "individual" | "small-group" | "whole-class";
export type LessonAgeGroup = "early-years" | "primary" | "secondary" | "adult";
export type LessonSkillFocus =
  | "balanced"
  | "speaking"
  | "reading"
  | "writing"
  | "phonics";
export type LessonSupportLevel = "high" | "standard" | "challenge";

export type LessonPlanPreferences = {
  durationMinutes: LessonDurationMinutes;
  purpose: LessonPurpose;
  classFormat: LessonClassFormat;
  ageGroup: LessonAgeGroup;
  skillFocus: LessonSkillFocus;
  supportLevel: LessonSupportLevel;
  gameCount: 0 | 1 | 2;
  worksheetCount: 0 | 1 | 2;
};

export const DEFAULT_LESSON_PLAN_PREFERENCES: LessonPlanPreferences = {
  durationMinutes: 50,
  purpose: "teach",
  classFormat: "whole-class",
  ageGroup: "primary",
  skillFocus: "balanced",
  supportLevel: "standard",
  gameCount: 1,
  worksheetCount: 1,
};

export type LessonToolKind = "classroom" | "game" | "worksheet" | "offline";

export type LessonToolRecommendation = {
  kind: LessonToolKind;
  id: string;
  label: string;
  reason: string;
  durationMinutes?: number;
  settings?: Record<string, string | number | boolean>;
};

export type LessonPlanStage = {
  id: string;
  time: string;
  title: string;
  purpose: string;
  teacherAction: string;
  studentAction: string;
  checkForUnderstanding: string;
  tool?: LessonToolRecommendation;
  support?: string;
  challenge?: string;
};

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
  preferences: LessonPlanPreferences;
  title: string;
  focus: string;
  objective: string;
  materials: string;
  schedule: string;
  stages: LessonPlanStage[];
  recommendedTools: LessonToolRecommendation[];
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
  preferences: DEFAULT_LESSON_PLAN_PREFERENCES,
  title: "",
  focus: "",
  objective: "",
  materials: "",
  schedule: "",
  stages: [],
  recommendedTools: [],
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
