import type { WorksheetType } from "@/lib/worksheets/types";

import { PREMIUM_GAME_IDS, PREMIUM_WORKSHEET_TYPES } from "@/lib/billing/constants";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function getUtcDayIndex(day: number) {
  return day === 0 ? 6 : day - 1;
}

function getStartOfUtcWeek(date: Date) {
  const utcMidnight = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );
  const weekDay = getUtcDayIndex(date.getUTCDay());
  return utcMidnight - weekDay * MS_PER_DAY;
}

function getWeekIndex(date: Date) {
  const epochMonday = Date.UTC(2025, 0, 6);
  return Math.floor((getStartOfUtcWeek(date) - epochMonday) / (7 * MS_PER_DAY));
}

function getRotatingItem<T>(items: readonly T[], date: Date) {
  const weekIndex = getWeekIndex(date);
  const safeIndex = ((weekIndex % items.length) + items.length) % items.length;
  return items[safeIndex];
}

export function getFeaturedWeeklyGameId(date = new Date()) {
  return getRotatingItem(PREMIUM_GAME_IDS, date);
}

export function getFeaturedWeeklyWorksheetType(date = new Date()): WorksheetType {
  return getRotatingItem(PREMIUM_WORKSHEET_TYPES, date);
}
