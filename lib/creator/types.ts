export const CREATOR_CARD_TYPES = [
  "noun",
  "verb",
  "adjective",
  "preposition",
  "phonics",
] as const;

export type CreatorCardType = (typeof CREATOR_CARD_TYPES)[number];

export type CreatorImageRecord = {
  id: string;
  user_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  status: "uploading" | "ready" | "rejected";
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type CreatorFlashcardRecord = {
  id: string;
  user_id: string;
  creator_image_id: string;
  front: string;
  card_type: CreatorCardType;
  created_at: string;
  updated_at: string;
};

export type CreatorImageDto = {
  id: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  status: CreatorImageRecord["status"];
  createdAt: string;
  updatedAt: string;
  imageUrl: string;
};

export type CreatorFlashcardDto = {
  id: string;
  creatorImageId: string;
  front: string;
  cardType: CreatorCardType;
  createdAt: string;
  updatedAt: string;
  image: CreatorImageDto;
};
