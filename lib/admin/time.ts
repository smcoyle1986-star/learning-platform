export const CLASSENDO_ANALYTICS_TIME_ZONE = "Asia/Seoul";

const DEFAULT_FORMAT: Intl.DateTimeFormatOptions = {
  dateStyle: "medium",
  timeStyle: "short",
};

export function formatKst(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions = DEFAULT_FORMAT,
) {
  const date = value instanceof Date ? value : new Date(value);
  const formatted = new Intl.DateTimeFormat("en", {
    ...options,
    timeZone: CLASSENDO_ANALYTICS_TIME_ZONE,
  }).format(date);

  return `${formatted} KST`;
}
