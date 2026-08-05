export type CommunityContentType = "noun" | "verb" | "adjective" | "preposition" | "phonics";

export type CommunityLessonSet = {
  id: string;
  name: string;
  user_id: string;
  created_at?: string;
  download_count?: number;
  tags?: string[];
  content_types?: CommunityContentType[];
};

export type CommunityCardPreview = {
  id: string;
  front: string;
  back?: string | null;
  creator_image_id?: string | null;
  position?: number | null;
};

export type CommunityToast = {
  message: string;
  action?: React.ReactNode;
} | null;
