import { LessonCard } from "@/lib/lessons/types";

import { WorksheetDraft, formatWorksheetWord } from "./types";

export type BullseyeSlotRing = "outer" | "inner";

export type BullseyeSlot = {
  index: number;
  sector: number;
  ring: BullseyeSlotRing;
  card: LessonCard;
  points: number;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  centerX: number;
  centerY: number;
  contentSize: number;
};

export type BullseyeTeamBox = {
  team: number;
  x: number;
  y: number;
  align: "left" | "right";
};

export type BullseyeLayout = {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  outerRadius: number;
  middleRadius: number;
  bullseyeRadius: number;
  slots: BullseyeSlot[];
  bullseyeCard: LessonCard;
  bullseyePoints: number;
  teamBoxes: BullseyeTeamBox[];
  palette: string[];
};

const PAGE_WIDTH = 297;
const PAGE_HEIGHT = 210;
const SECTOR_COUNT = 12;
const SECTOR_DEGREES = 360 / SECTOR_COUNT;

function createSeededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function shuffleArray<T>(items: T[], seed: number) {
  const random = createSeededRandom(seed);
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function pickCards(cards: LessonCard[], count: number, seed: number) {
  const source = cards.length > 0 ? cards : [{ id: "placeholder", word: "Word", image: "" } as LessonCard];
  const shuffled = shuffleArray(source, seed);
  return Array.from({ length: count }).map((_, index) => shuffled[index % shuffled.length]);
}

function polarToCartesian(cx: number, cy: number, radius: number, angleDegrees: number) {
  const radians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

export function createBullseyeSectorPath(
  cx: number,
  cy: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number
) {
  const startOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
  const endOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
  const endInner = polarToCartesian(cx, cy, innerRadius, endAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)}`,
    `L ${startOuter.x.toFixed(2)} ${startOuter.y.toFixed(2)}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${endOuter.x.toFixed(2)} ${endOuter.y.toFixed(2)}`,
    `L ${endInner.x.toFixed(2)} ${endInner.y.toFixed(2)}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startInner.x.toFixed(2)} ${startInner.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

function buildTeamBoxes() {
  return [
    { team: 1, x: 6, y: 8, align: "left" as const },
    { team: 2, x: PAGE_WIDTH - 6, y: 8, align: "right" as const },
    { team: 3, x: 6, y: PAGE_HEIGHT - 22, align: "left" as const },
    { team: 4, x: PAGE_WIDTH - 6, y: PAGE_HEIGHT - 22, align: "right" as const },
  ];
}

export function generateBullseyeLayout(cards: LessonCard[], draft: WorksheetDraft): BullseyeLayout {
  const outerRadius = 92;
  const middleRadius = 66;
  const bullseyeRadius = 12;
  const centerX = PAGE_WIDTH / 2;
  const centerY = PAGE_HEIGHT / 2 + 1;
  const palette = [
    "#fde2e4",
    "#e2ece9",
    "#e8e1f7",
    "#fff1c7",
    "#d8f3dc",
    "#cde7ff",
    "#f7d6e0",
    "#f3e8ff",
    "#d6f5f1",
    "#ffd6a5",
    "#fce1f6",
    "#dbeafe",
  ];
  const shuffledCards = pickCards(cards, 25, draft.shuffleSeed);
  const slotCards = shuffledCards.slice(0, 24);
  const bullseyeCard = shuffledCards[24] ?? shuffledCards[0];
  const rng = createSeededRandom(draft.shuffleSeed + 19);

  const slots: BullseyeSlot[] = Array.from({ length: SECTOR_COUNT }).flatMap((_, sector) => {
    const startAngle = sector * SECTOR_DEGREES;
    const endAngle = startAngle + SECTOR_DEGREES;
    const sectorCenter = startAngle + SECTOR_DEGREES / 2;
    const outerContentRadius = (middleRadius + outerRadius) / 2;
    const innerContentRadius = (bullseyeRadius + middleRadius) / 2;
    const slotPointsOuter = 1 + Math.floor(rng() * 5);
    const slotPointsInner = 1 + Math.floor(rng() * 5);

    return [
      {
        index: sector * 2 + 1,
        sector,
        ring: "outer" as const,
        card: slotCards[sector * 2],
        points: slotPointsOuter,
        startAngle,
        endAngle,
        innerRadius: middleRadius,
        outerRadius,
        centerX: centerX + Math.cos(((sectorCenter - 90) * Math.PI) / 180) * outerContentRadius,
        centerY: centerY + Math.sin(((sectorCenter - 90) * Math.PI) / 180) * outerContentRadius,
        contentSize: 26,
      },
      {
        index: sector * 2 + 2,
        sector,
        ring: "inner" as const,
        card: slotCards[sector * 2 + 1],
        points: slotPointsInner,
        startAngle,
        endAngle,
        innerRadius: bullseyeRadius,
        outerRadius: middleRadius,
        centerX: centerX + Math.cos(((sectorCenter - 90) * Math.PI) / 180) * innerContentRadius,
        centerY: centerY + Math.sin(((sectorCenter - 90) * Math.PI) / 180) * innerContentRadius,
        contentSize: 22,
      },
    ];
  });

  return {
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    centerX,
    centerY,
    outerRadius,
    middleRadius,
    bullseyeRadius,
    slots,
    bullseyeCard,
    bullseyePoints: 8,
    teamBoxes: buildTeamBoxes(),
    palette,
  };
}

export type BullseyeImageResolver = (card: LessonCard) => string | Promise<string>;

function escapeXml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function buildBullseyeSvg(cards: LessonCard[], draft: WorksheetDraft, resolveImageSrc: BullseyeImageResolver) {
  const layout = generateBullseyeLayout(cards, draft);
  const version = draft.bullseyeVersion ?? "points";
  const imageMode = draft.bullseyeImageMode ?? "image";
  const inkSaver = Boolean(draft.bullseyeInkSaver);
  const imageMap = new Map<string, string>();
  const uniqueCards = [...layout.slots.map((slot) => slot.card), layout.bullseyeCard];

  await Promise.all(
    uniqueCards.map(async (card) => {
      if (imageMap.has(card.id)) return;
      const imageSrc = await resolveImageSrc(card);
      imageMap.set(card.id, imageSrc || "");
    })
  );

  const palette = inkSaver
    ? Array.from({ length: 12 }).map(() => "#f8fafc")
    : layout.palette;

  const slotMarkup = layout.slots
    .map((slot, slotIndex) => {
      const imageSrc = imageMap.get(slot.card.id) ?? "";
      const word = formatWorksheetWord(slot.card.word);
      const fill = palette[slot.sector % palette.length];
      const path = createBullseyeSectorPath(layout.centerX, layout.centerY, slot.innerRadius, slot.outerRadius, slot.startAngle, slot.endAngle);
      const sectorCenter = slot.startAngle + SECTOR_DEGREES / 2;
      const pointPos = polarToCartesian(
        layout.centerX,
        layout.centerY,
        slot.ring === "outer" ? slot.outerRadius - 8.5 : slot.outerRadius - 6.5,
        sectorCenter - 9
      );
      const pointMarkup =
        version === "points"
          ? `<text x="${pointPos.x.toFixed(2)}" y="${pointPos.y.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-size="4.3" font-weight="900" fill="#000000">${slot.points}</text>`
          : "";

      const imageSize = imageMode === "both" ? slot.contentSize * 0.54 : slot.contentSize;
      const imageX = slot.centerX - imageSize / 2;
      const imageY = slot.centerY - imageSize / 2 - (imageMode === "both" ? 3 : 0);
      const textY = slot.centerY + imageSize / 2 + (imageMode === "both" ? 3.2 : 4.5);
      const imageMarkup =
        imageMode === "text"
          ? `<text x="${slot.centerX.toFixed(2)}" y="${(slot.centerY + 2).toFixed(2)}" text-anchor="middle" font-size="${slot.ring === "outer" ? 5.3 : 4.8}" font-weight="800" fill="#0f172a">${escapeXml(word)}</text>`
          : imageSrc
            ? `<image href="${escapeXml(imageSrc)}" x="${imageX.toFixed(2)}" y="${imageY.toFixed(2)}" width="${imageSize.toFixed(2)}" height="${imageSize.toFixed(2)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#slotClip-${slotIndex})" />`
            : `<text x="${slot.centerX.toFixed(2)}" y="${(slot.centerY + 2).toFixed(2)}" text-anchor="middle" font-size="9" font-weight="800" fill="#1d4ed8">?</text>`;
      const labelMarkup =
        imageMode === "both"
          ? `<text x="${slot.centerX.toFixed(2)}" y="${textY.toFixed(2)}" text-anchor="middle" font-size="${slot.ring === "outer" ? 4.0 : 3.7}" font-weight="800" fill="#0f172a">${escapeXml(word)}</text>`
          : "";

      return `
        <defs>
          <clipPath id="slotClip-${slotIndex}">
            <path d="${createBullseyeSectorPath(layout.centerX, layout.centerY, slot.innerRadius, slot.outerRadius, slot.startAngle, slot.endAngle)}" />
          </clipPath>
        </defs>
        <path d="${path}" fill="${fill}" stroke="${inkSaver ? "#d1d5db" : "#ffffff"}" stroke-width="${inkSaver ? 0.6 : 0.9}" />
        ${pointMarkup}
        ${imageMarkup}
        ${labelMarkup}
      `;
    })
    .join("");

  const bullseyeImage = imageMap.get(layout.bullseyeCard.id) ?? "";
  const bullseyeMarkup =
    imageMode === "text"
      ? `<text x="${layout.centerX.toFixed(2)}" y="${(layout.centerY + 1).toFixed(2)}" text-anchor="middle" font-size="5.5" font-weight="800" fill="#0f172a">${escapeXml(formatWorksheetWord(layout.bullseyeCard.word))}</text>`
      : imageMode === "both" && bullseyeImage
        ? `<g>
            <image href="${escapeXml(bullseyeImage)}" x="${(layout.centerX - 11).toFixed(2)}" y="${(layout.centerY - 11).toFixed(2)}" width="22" height="22" preserveAspectRatio="xMidYMid slice" clip-path="url(#bullseyeClip)" />
            <text x="${layout.centerX.toFixed(2)}" y="${(layout.centerY + 14).toFixed(2)}" text-anchor="middle" font-size="4.7" font-weight="800" fill="#0f172a">${escapeXml(formatWorksheetWord(layout.bullseyeCard.word))}</text>
          </g>`
      : imageMode === "both"
        ? `<text x="${layout.centerX.toFixed(2)}" y="${(layout.centerY + 14).toFixed(2)}" text-anchor="middle" font-size="4.7" font-weight="800" fill="#0f172a">${escapeXml(formatWorksheetWord(layout.bullseyeCard.word))}</text>`
      : bullseyeImage
        ? `<image href="${escapeXml(bullseyeImage)}" x="${(layout.centerX - 11).toFixed(2)}" y="${(layout.centerY - 11).toFixed(2)}" width="22" height="22" preserveAspectRatio="xMidYMid slice" clip-path="url(#bullseyeClip)" />`
        : `<circle cx="${layout.centerX}" cy="${layout.centerY}" r="10" fill="#ffffff" stroke="#dbe4f0" />`;

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}mm" height="${layout.height}mm" viewBox="0 0 ${layout.width} ${layout.height}" preserveAspectRatio="xMidYMid meet">
      <rect x="0" y="0" width="${layout.width}" height="${layout.height}" fill="#ffffff" />
      <text x="10" y="8.5" text-anchor="start" font-size="9.2" font-weight="900" fill="#1d4ed8">${escapeXml(draft.title || "Bullseye")}</text>
      <text x="10" y="14.7" text-anchor="start" font-size="4.1" font-weight="700" letter-spacing="0.18em" fill="#64748b">CLASSENDO WORKSHEET</text>
      <text x="${layout.width - 10}" y="9" text-anchor="end" font-size="4.4" font-weight="500" fill="#475569">Name: ____________________</text>
      <circle cx="${layout.centerX}" cy="${layout.centerY}" r="${layout.outerRadius}" fill="${inkSaver ? "#ffffff" : "#f8fafc"}" stroke="${inkSaver ? "#cbd5e1" : "#ffffff"}" stroke-width="1.2" />
      ${slotMarkup}
      <circle cx="${layout.centerX}" cy="${layout.centerY}" r="${layout.bullseyeRadius}" fill="${inkSaver ? "#ffffff" : "#dbeafe"}" stroke="${inkSaver ? "#94a3b8" : "#1d4ed8"}" stroke-width="1.3" />
      <defs>
        <clipPath id="bullseyeClip">
          <circle cx="${layout.centerX}" cy="${layout.centerY}" r="${layout.bullseyeRadius - 1}" />
        </clipPath>
      </defs>
      ${bullseyeMarkup}
      <text x="${layout.width / 2}" y="${layout.height - 6}" text-anchor="middle" font-size="4" font-weight="800" letter-spacing="0.22em" fill="#64748b">CLASSENDO.COM</text>
    </svg>
  `;
}
