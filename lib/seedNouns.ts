import { Noun, NounForm, NounDeterminer, NounGrammarTag } from "./types";

export const nouns: Noun[] = [
  { id: "1", lemma: "dog", countability: "count", difficulty: 1, themes: ["animals"] },
  { id: "2", lemma: "apple", countability: "count", difficulty: 1, themes: ["food"] },
  { id: "3", lemma: "water", countability: "uncount", difficulty: 1, themes: ["food"] },
];

export const nounForms: NounForm[] = [
  { id: "f1", vocabulary_id: "1", form: "dog", form_type: "singular" },
  { id: "f2", vocabulary_id: "1", form: "dogs", form_type: "plural", plural_type: "regular" },
  { id: "f3", vocabulary_id: "2", form: "apple", form_type: "singular" },
  { id: "f4", vocabulary_id: "2", form: "apples", form_type: "plural", plural_type: "regular" },
  { id: "f5", vocabulary_id: "3", form: "water", form_type: "singular" },
];

export const nounDeterminers: NounDeterminer[] = [
  { vocabulary_id: "1", allows: ["a_an", "the", "many"] },
  { vocabulary_id: "2", allows: ["a_an", "the", "many"] },
  { vocabulary_id: "3", allows: ["the", "some", "much"] },
];

export const nounGrammarTags: NounGrammarTag[] = [
  { vocabulary_id: "1", supports: ["there_is", "there_are", "have_has"] },
  { vocabulary_id: "2", supports: ["there_is", "there_are", "have_has"] },
  { vocabulary_id: "3", supports: ["there_is", "will_have"] },
];
