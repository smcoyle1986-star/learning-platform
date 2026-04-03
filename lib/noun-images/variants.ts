import {
  NounCountability,
  NounVariantDefinition,
} from "@/lib/noun-images/types";

export function getVariantDefinitions(
  lemma: string,
  countability: NounCountability
): NounVariantDefinition[] {
  const safeLemma = lemma.trim().toLowerCase();
  const base = (variantNumber: 1 | 2 | 3) =>
    `${safeLemma}_${variantNumber}`;

  if (countability === "uncount") {
    return [
      {
        variantNumber: 1,
        variant: base(1),
        kind: "uncount_normal_amount",
        isDefault: true,
        isPremium: false,
        quantityLabel: "normal amount",
      },
      {
        variantNumber: 2,
        variant: base(2),
        kind: "uncount_small_amount",
        isDefault: false,
        isPremium: true,
        quantityLabel: "small amount",
      },
      {
        variantNumber: 3,
        variant: base(3),
        kind: "uncount_large_amount",
        isDefault: false,
        isPremium: true,
        quantityLabel: "large amount",
      },
    ];
  }

  return [
    {
      variantNumber: 1,
      variant: base(1),
      kind: "count_singular",
      isDefault: true,
      isPremium: false,
      quantityLabel: "single item",
    },
    {
      variantNumber: 2,
      variant: base(2),
      kind: "count_small_plural",
      isDefault: false,
      isPremium: true,
      quantityLabel: "small group",
    },
    {
      variantNumber: 3,
      variant: base(3),
      kind: "count_large_plural",
      isDefault: false,
      isPremium: true,
      quantityLabel: "large group",
    },
  ];
}

export function resolveEffectiveCountability(countability: NounCountability): Exclude<NounCountability, "both"> {
  return countability === "both" ? "count" : countability;
}
