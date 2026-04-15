export type NounCountability = "count" | "uncount" | "both";

export type NounVariantNumber = 1 | 2 | 3;

export type NounVariantKind =
  | "count_singular"
  | "count_small_plural"
  | "count_large_plural"
  | "uncount_normal_amount"
  | "uncount_small_amount"
  | "uncount_large_amount";

export type NounVariantDefinition = {
  variantNumber: NounVariantNumber;
  variant: string;
  kind: NounVariantKind;
  isDefault: boolean;
  isPremium: boolean;
  quantityLabel: string;
  promptNote?: string;
  promptProfile?:
    | "default"
    | "place"
    | "time"
    | "dates"
    | "numbers"
    | "holidays"
    | "people"
    | "drink"
    | "places"
    | "nature"
    | "family"
    | "jobs"
    | "profession"
    | "fruit"
    | "vegetable"
    | "animals_baby"
    | "animals_land"
    | "body"
    | "classroom"
    | "clothes"
    | "utensils";
  modelOverride?: string;
  qualityOverride?: string;
  useStyleReference?: boolean;
  styleReferencePath?: string;
  allowBackground?: boolean;
  allowPeople?: boolean;
  backgroundStyle?: "transparent" | "white";
  skipNormalization?: boolean;
};

export type NounGenerationInput = {
  nounId?: string;
  lemma: string;
  countability: NounCountability;
  category?: string;
  overwriteExisting?: boolean;
  variantNumbers?: NounVariantNumber[];
  uploadToSupabase?: boolean;
};

export type GeneratedNounImage = {
  nounId?: string;
  lemma: string;
  countability: NounCountability;
  category: string;
  variant: string;
  variantNumber: NounVariantNumber;
  imagePath: string;
  publicUrl: string;
  localPath?: string;
  isDefault: boolean;
  isPremium: boolean;
  prompt: string;
  width: number;
  height: number;
};

export type NounImageOverride = {
  variants: NounVariantNumber[];
  promptNote?: string;
  variantPromptNotes?: Partial<Record<NounVariantNumber, string>>;
  variantStyleReferencePaths?: Partial<Record<NounVariantNumber, string>>;
  promptProfile?:
    | "default"
    | "place"
    | "time"
    | "dates"
    | "numbers"
    | "holidays"
    | "people"
    | "drink"
    | "places"
    | "nature"
    | "family"
    | "jobs"
    | "profession"
    | "fruit"
    | "vegetable"
    | "animals_baby"
    | "animals_land"
    | "body"
    | "classroom"
    | "clothes"
    | "utensils";
  useStyleReference?: boolean;
  allowBackground?: boolean;
  allowPeople?: boolean;
  backgroundStyle?: "transparent" | "white";
  skipNormalization?: boolean;
};
