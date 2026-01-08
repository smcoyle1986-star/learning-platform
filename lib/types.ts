// lib/types.ts

export type Noun = {
  id: string;          // uuid
  lemma: string;       // base singular form
  countability: "count" | "uncount" | "both";
  difficulty: 1 | 2 | 3;
  themes: string[];
  image_id?: string;
};

export type NounForm = {
  id: string;
  vocabulary_id: string;
  form: string;       // dogs, children
  form_type: "singular" | "plural";
  plural_type?: "regular" | "es" | "ies" | "irregular";
};

export type NounDeterminer = {
  vocabulary_id: string;
  allows: ("a_an" | "the" | "some" | "many" | "much")[];
};

export type NounGrammarTag = {
  vocabulary_id: string;
  supports: ("there_is" | "there_are" | "have_has" | "will_have")[];
};
