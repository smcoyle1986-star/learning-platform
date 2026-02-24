"use client";

import { nouns, nounForms } from "@/lib/seedNouns";

export default function TestNouns() {
  return (
    <main className="p-10">
      <h1 className="text-2xl font-bold mb-4">Noun Inventory</h1>
      {nouns.map((noun: any) => (
        <div key={noun.id} className="mb-4 p-4 border rounded-lg">
          <p>Word: {noun.lemma}</p>
          <p>Countability: {noun.countability}</p>
          <p>
            Forms:{" "}
            {nounForms
              .filter((f: any) => f.vocabulary_id === noun.id)
              .map((f: any) => f.form)
              .join(", ")}
          </p>
        </div>
      ))}
    </main>
  );
}