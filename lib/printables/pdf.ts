import { launchPdfBrowser } from "@/lib/pdf/browser";
import { buildPrintableHtml } from "@/lib/printables/export";
import { PrintableBuildOptions } from "@/lib/printables/types";

async function renderHtmlToPdfBuffer(html: string) {
  const browser = await launchPdfBrowser();

  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1200 } });
    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.waitForTimeout(200);

    return await page.pdf({
      format: "letter",
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
  } finally {
    await browser.close();
  }
}

export async function createPrintablePdfBuffer(opts: PrintableBuildOptions) {
  const html = buildPrintableHtml(opts);
  return renderHtmlToPdfBuffer(html);
}
