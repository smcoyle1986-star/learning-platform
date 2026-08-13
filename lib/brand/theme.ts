export type BrandTheme = {
  circle: string;
  circleBorder: string;
  fade: string;
};

export const BRAND_THEME_BY_KEY: Record<string, BrandTheme> = {
  landing: {
    circle: "rgba(250, 211, 126, 0.72)",
    circleBorder: "rgba(250, 211, 126, 0.95)",
    fade: "rgba(250, 211, 126, 0.22)",
  },
  flashcards: {
    circle: "rgba(127, 163, 106, 0.72)",
    circleBorder: "rgba(127, 163, 106, 0.95)",
    fade: "rgba(127, 163, 106, 0.20)",
  },
  dashboard: {
    circle: "rgba(250, 211, 126, 0.72)",
    circleBorder: "rgba(250, 211, 126, 0.95)",
    fade: "rgba(250, 211, 126, 0.20)",
  },
  community: {
    circle: "rgba(182, 161, 235, 0.72)",
    circleBorder: "rgba(182, 161, 235, 0.95)",
    fade: "rgba(182, 161, 235, 0.20)",
  },
  creator: {
    circle: "rgba(244, 183, 166, 0.72)",
    circleBorder: "rgba(244, 183, 166, 0.95)",
    fade: "rgba(244, 183, 166, 0.20)",
  },
  games: {
    circle: "rgba(108, 144, 255, 0.72)",
    circleBorder: "rgba(108, 144, 255, 0.95)",
    fade: "rgba(108, 144, 255, 0.20)",
  },
  printables: {
    circle: "rgba(249, 168, 37, 0.72)",
    circleBorder: "rgba(249, 168, 37, 0.95)",
    fade: "rgba(249, 168, 37, 0.18)",
  },
  worksheets: {
    circle: "rgba(127, 206, 185, 0.72)",
    circleBorder: "rgba(127, 206, 185, 0.95)",
    fade: "rgba(127, 206, 185, 0.18)",
  },
  lessons: {
    circle: "rgba(255, 149, 166, 0.72)",
    circleBorder: "rgba(255, 149, 166, 0.95)",
    fade: "rgba(255, 149, 166, 0.18)",
  },
  editor: {
    circle: "rgba(165, 180, 252, 0.72)",
    circleBorder: "rgba(165, 180, 252, 0.95)",
    fade: "rgba(165, 180, 252, 0.18)",
  },
  freeResources: {
    circle: "rgba(216, 180, 254, 0.72)",
    circleBorder: "rgba(216, 180, 254, 0.95)",
    fade: "rgba(216, 180, 254, 0.20)",
  },
  login: {
    circle: "rgba(160, 174, 192, 0.70)",
    circleBorder: "rgba(160, 174, 192, 0.90)",
    fade: "rgba(160, 174, 192, 0.12)",
  },
  signup: {
    circle: "rgba(127, 163, 106, 0.72)",
    circleBorder: "rgba(127, 163, 106, 0.95)",
    fade: "rgba(127, 163, 106, 0.20)",
  },
  profile: {
    circle: "rgba(127, 163, 106, 0.72)",
    circleBorder: "rgba(127, 163, 106, 0.95)",
    fade: "rgba(127, 163, 106, 0.20)",
  },
};

export function resolveBrandTheme(pathname: string | null | undefined): BrandTheme {
  const path = pathname || "/";
  const normalized = path.startsWith("/preview/") ? `/${path.split("/").filter(Boolean)[1] ?? ""}` : path;

  if (normalized === "/" || normalized.startsWith("/landing")) return BRAND_THEME_BY_KEY.landing;
  if (normalized.startsWith("/flashcards")) return BRAND_THEME_BY_KEY.flashcards;
  if (normalized.startsWith("/dashboard")) return BRAND_THEME_BY_KEY.dashboard;
  if (normalized.startsWith("/teacher/community")) return BRAND_THEME_BY_KEY.community;
  if (normalized.startsWith("/creator")) return BRAND_THEME_BY_KEY.creator;
  if (normalized.startsWith("/games")) return BRAND_THEME_BY_KEY.games;
  if (normalized.startsWith("/printables")) return BRAND_THEME_BY_KEY.printables;
  if (normalized.startsWith("/worksheets")) return BRAND_THEME_BY_KEY.worksheets;
  if (normalized.startsWith("/lessons")) return BRAND_THEME_BY_KEY.lessons;
  if (normalized.startsWith("/teacher/editor")) return BRAND_THEME_BY_KEY.editor;
  if (normalized.startsWith("/free-resources")) return BRAND_THEME_BY_KEY.freeResources;
  if (normalized.startsWith("/login")) return BRAND_THEME_BY_KEY.login;
  if (normalized.startsWith("/signup")) return BRAND_THEME_BY_KEY.signup;
  if (normalized.startsWith("/profile")) return BRAND_THEME_BY_KEY.profile;

  return BRAND_THEME_BY_KEY.landing;
}
