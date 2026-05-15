import { existsSync } from "node:fs";

import { chromium } from "playwright";

import { LessonCard } from "@/lib/lessons/types";
import { buildWorksheetPreviewHtml } from "@/lib/worksheets/export";
import { WorksheetDraft } from "@/lib/worksheets/types";

function escapeFileName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "worksheet"
  );
}

function resolveBrowserExecutablePath() {
  const bundled = chromium.executablePath();
  if (bundled && existsSync(bundled)) {
    return bundled;
  }

  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_PATH,
    process.env.CHROME_PATH,
    process.env.GOOGLE_CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

async function renderHtmlToPdfBuffer(html: string, landscape: boolean) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: resolveBrowserExecutablePath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({
      viewport: landscape
        ? { width: 1600, height: 1000 }
        : { width: 1200, height: 1700 },
    });

    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.waitForTimeout(200);

    return await page.pdf({
      format: "A4",
      landscape,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
  } finally {
    await browser.close();
  }
}

export async function createWorksheetPdfBuffer(
  cards: LessonCard[],
  draft: WorksheetDraft,
  options: { includeTeacherCopy?: boolean } = {}
) {
  const html = await buildWorksheetPreviewHtml(cards, draft, {
    includeTeacherCopy: options.includeTeacherCopy ?? false,
    previewMode: false,
  });

  return renderHtmlToPdfBuffer(html, draft.type === "bullseye");
}

export function buildWorksheetPdfFileName(title: string) {
  return `${escapeFileName(title)}.pdf`;
}
