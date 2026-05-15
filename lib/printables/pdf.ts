import { existsSync } from "node:fs";

import { chromium } from "playwright";

import { buildPrintableHtml } from "@/lib/printables/export";
import { PrintableBuildOptions } from "@/lib/printables/types";

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

async function renderHtmlToPdfBuffer(html: string) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: resolveBrowserExecutablePath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

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
