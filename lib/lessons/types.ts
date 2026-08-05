export const LESSON_CONTENT_TYPES = ["noun", "verb", "adjective", "preposition", "phonics"] as const;
export type LessonContentType = (typeof LESSON_CONTENT_TYPES)[number];

export type LessonCard = {
  id: string;
  word: string;
  image?: string | null;
  back?: string | null;
  image_id?: string | null;
  creator_image_id?: string | null;
  position?: number;
  type?: string;
};

export type LessonRecord = {
  id: string;
  name: string;
  cards: LessonCard[];
  createdAt?: number | string;
  lastUsed?: number | null;
  useCount?: number;
  isPublic?: boolean;
  basicActive?: boolean;
  containsPremiumImages?: boolean;
  basicVersionAvailable?: boolean;
  basicConversionAvailable?: boolean;
  isLocked?: boolean;
  lockReasons?: Array<"set_limit" | "premium_images">;
};

export type SaveLessonInput = {
  lessonId?: string | null;
  userId: string;
  name: string;
  isPublic: boolean;
  cards: LessonCard[];
};
