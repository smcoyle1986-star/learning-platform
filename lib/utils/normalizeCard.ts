// // lib/utils/normalizeCard.ts
// // Normalizes many possible incoming card shapes to the canonical shape used across the app.
// // Canonical shape: { id: string, word: string, image?: string|null, type?: string, forms?: any, raw?: any }

// export function normalizeCard(raw: any, idx?: number) {
//   const id =
//     String(
//       raw?.id ??
//         raw?.uid ??
//         raw?.card_id ??
//         raw?.lesson_card_id ??
//         raw?.word ??
//         `${Date.now()}-${idx ?? 0}`
//     );
//   const word = String(
//     raw?.word ??
//       raw?.front ??
//       raw?.lemma ??
//       raw?.text ??
//       raw?.forms?.singular ??
//       raw?.forms?.base ??
//       ""
//   );
//   const image = raw?.image ?? raw?.image_url ?? raw?.img ?? raw?.back ?? null;
//   const type =
//     raw?.type ?? raw?.pos ?? raw?.kind ?? (raw?.forms ? "noun" : undefined) ?? "noun";
//   const forms = raw?.forms ?? null;

//   return { id, word, image, type, forms, raw };
// }

// export function normalizeCards(arr: any[]) {
//   if (!Array.isArray(arr)) return [];
//   return arr.map((r, i) => normalizeCard(r, i));
// }