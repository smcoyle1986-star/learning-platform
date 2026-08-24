import { LessonCard } from "@/lib/lessons/types";
import { launchPdfBrowser } from "@/lib/pdf/browser";
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

async function renderHtmlToPdfBuffer(html: string, landscape: boolean) {
  const browser = await launchPdfBrowser();

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
