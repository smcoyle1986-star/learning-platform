import { chromium, type Locator, type Page } from "playwright";

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const publicPrefix = "https://tsccyjrniiamnwgrtvpw.supabase.co/storage/v1/object/public/vocab-images/";

type ImageSnapshot = {
  alt: string;
  currentSrc: string;
  srcSet: string;
  naturalWidth: number;
  naturalHeight: number;
};

async function imageSnapshot(page: Page, alt: string, nth = -1, scope?: Locator) {
  const locator = (scope ?? page).locator(`img[alt="${alt}"]`);
  await locator.first().waitFor({ state: "visible" });
  const count = await locator.count();
  const image = locator.nth(nth < 0 ? count - 1 : nth);
  await image.scrollIntoViewIfNeeded();
  await page.waitForFunction(
    (element) => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0,
    await image.elementHandle(),
  );
  return image.evaluate((element): ImageSnapshot => {
    const image = element as HTMLImageElement;
    return {
      alt: image.alt,
      currentSrc: image.currentSrc,
      srcSet: image.srcset,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
    };
  });
}

function isStaticVariant(url: string, suffix: string) {
  return url.startsWith(publicPrefix) && url.includes(`/derived/v1/${suffix}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  const imageResponses: Array<{ url: string; status: number }> = [];
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("supabase.co/storage/v1/")) imageResponses.push({ url, status: response.status() });
  });

  // Starter previews use compact derivatives.
  await page.goto(`${baseUrl}/flashcards`, { waitUntil: "networkidle" });
  const starterApple = await imageSnapshot(page, "apple", 0);

  // Loading a large topic uses the grid derivative, not the Classroom one.
  await page.getByRole("button", { name: "noun" }).click();
  await page.getByRole("button", { name: "food & drinks" }).click();
  await page.getByTestId("flashcard-results-grid").locator('img[alt="apple"]').waitFor({ state: "visible" });
  const gridApple = await imageSnapshot(page, "apple", 0, page.getByTestId("flashcard-results-grid"));

  // The tray retains the small derivative after selecting a starter lesson.
  await page.goto(`${baseUrl}/flashcards`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Use this 6-card lesson" }).first().click();
  await page.getByRole("button", { name: /Present 6 cards in Classroom/ }).waitFor();
  const trayApple = await imageSnapshot(page, "apple", 0, page.getByTestId("lesson-tray"));

  // Classroom and the Animals demo use the large derivative.
  await page.getByRole("button", { name: /Present 6 cards in Classroom/ }).click();
  await page.waitForURL("**/flashcards/classroom**");
  const classroomApple = await imageSnapshot(page, "apple");

  await page.goto(`${baseUrl}/demo/animals/classroom`, { waitUntil: "networkidle" });
  const demoDog = await imageSnapshot(page, "dog");

  // Cat deliberately has no generated static derivative. It must recover to
  // the master PNG after the missing static URL fails, without a transform URL.
  await page.goto(`${baseUrl}/flashcards`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "noun" }).click();
  await page.getByRole("button", { name: "animals" }).click();
  const cat = await imageSnapshot(page, "cat");

  // Repeat the delivery decisions at a phone DPR, where the grid remains
  // sharp without unnecessarily requesting a Classroom-sized source.
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const mobile = await mobileContext.newPage();
  await mobile.goto(`${baseUrl}/flashcards`, { waitUntil: "networkidle" });
  await mobile.getByRole("button", { name: "noun" }).click();
  await mobile.getByRole("button", { name: "food & drinks" }).click();
  const mobileGridApple = await imageSnapshot(mobile, "apple", 0, mobile.getByTestId("flashcard-results-grid"));
  await mobile.goto(`${baseUrl}/flashcards`, { waitUntil: "networkidle" });
  await mobile.getByRole("button", { name: "Use this 6-card lesson" }).first().click();
  const mobileTrayApple = await imageSnapshot(mobile, "apple", 0, mobile.getByTestId("lesson-tray"));
  await mobile.getByRole("button", { name: /Present 6 cards in Classroom/ }).click();
  await mobile.waitForURL("**/flashcards/classroom**");
  const mobileClassroomApple = await imageSnapshot(mobile, "apple");
  await mobileContext.close();

  const transformResponses = imageResponses.filter(({ url }) => url.includes("/render/image/"));
  const catStatic = imageResponses.find(({ url }) => url.includes("derived/v1/nouns/cat/cat_1-480.webp"));
  const catOriginal = imageResponses.find(({ url }) => url.endsWith("/nouns/cat/cat_1.png"));
  const result = {
    starterApple,
    gridApple,
    trayApple,
    classroomApple,
    demoDog,
    mobile: { gridApple: mobileGridApple, trayApple: mobileTrayApple, classroomApple: mobileClassroomApple },
    missingDerivative: { cat, staticAttempt: catStatic, originalFallback: catOriginal },
    transformResponses,
    passed: {
      starter160: isStaticVariant(starterApple.currentSrc, "nouns/apple/apple_1-160.webp"),
      grid480: isStaticVariant(gridApple.currentSrc, "nouns/apple/apple_1-480.webp"),
      tray160: isStaticVariant(trayApple.currentSrc, "nouns/apple/apple_1-160.webp"),
      classroom1024: isStaticVariant(classroomApple.currentSrc, "nouns/apple/apple_1-1024.webp"),
      demo1024: isStaticVariant(demoDog.currentSrc, "nouns/dog/dog_1-1024.webp"),
      mobileGrid480: isStaticVariant(mobileGridApple.currentSrc, "nouns/apple/apple_1-480.webp"),
      mobileTray160: isStaticVariant(mobileTrayApple.currentSrc, "nouns/apple/apple_1-160.webp"),
      mobileClassroom1024: isStaticVariant(mobileClassroomApple.currentSrc, "nouns/apple/apple_1-1024.webp"),
      missingDerivativeRecovered: cat.currentSrc.endsWith("/nouns/cat/cat_1.png") && catOriginal?.status === 200,
      noTransforms: transformResponses.length === 0,
    },
  };
  console.log(JSON.stringify(result, null, 2));
  await browser.close();

  if (!Object.values(result.passed).every(Boolean)) process.exitCode = 1;
}

void main();
