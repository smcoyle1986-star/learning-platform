// lib/seedNouns.ts
// Minimal seed data for test-nouns page so TypeScript can resolve the module.
// Replace or expand these arrays with your real data as needed.

export const nouns = [
  { id: "1", lemma: "cat", countability: "countable" },
  { id: "2", lemma: "dog", countability: "countable" },
  { id: "3", lemma: "water", countability: "uncountable" },
];

export const nounForms = [
  { vocabulary_id: "1", form: "cat" },
  { vocabulary_id: "1", form: "cats" },
  { vocabulary_id: "2", form: "dog" },
  { vocabulary_id: "2", form: "dogs" },
  { vocabulary_id: "3", form: "water" },
];