export function normalizeUsername(raw: string) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/-+/g, "-")
    .replace(/^[_-]+|[_-]+$/g, "");
}

export function isValidUsername(username: string) {
  return /^[a-z0-9_-]{3,24}$/.test(username);
}

export function suggestUsernameFromEmail(email: string) {
  const prefix = email.split("@")[0] ?? "";
  return normalizeUsername(prefix).slice(0, 24) || "teacher";
}

export function buildUsernameAlternatives(username: string) {
  const base = normalizeUsername(username) || "teacher";
  const trimmed = base.slice(0, 24);
  const variants = [
    `${trimmed}_teacher`,
    `${trimmed}_123`,
    `teacher_${trimmed}`,
  ]
    .map((item) => normalizeUsername(item).slice(0, 24))
    .filter((item) => isValidUsername(item));

  return Array.from(new Set(variants));
}
