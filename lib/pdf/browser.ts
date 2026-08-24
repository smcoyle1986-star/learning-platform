import { existsSync } from "node:fs";

import serverlessChromium from "@sparticuz/chromium";
import { chromium } from "playwright";

function findLocalChromiumExecutable() {
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

  return candidates.find((candidate) => existsSync(candidate));
}

export async function launchPdfBrowser() {
  const localExecutablePath = findLocalChromiumExecutable();
  if (localExecutablePath) {
    return chromium.launch({
      headless: true,
      executablePath: localExecutablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  if (process.platform === "linux") {
    return chromium.launch({
      headless: true,
      executablePath: await serverlessChromium.executablePath(),
      args: serverlessChromium.args,
    });
  }

  return chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}
