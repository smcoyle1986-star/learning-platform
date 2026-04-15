export type LessonCard = {
  id: string;
  word: string;
  image?: string | null;
  back?: string | null;
  image_id?: string | null;
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
};

export type SaveLessonInput = {
  lessonId?: string | null;
  userId: string;
  name: string;
  isPublic: boolean;
  cards: LessonCard[];
};
