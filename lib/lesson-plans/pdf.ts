import { existsSync } from "node:fs";

import { chromium } from "playwright";

import { LessonRecord } from "@/lib/lessons/types";
import { LessonLevel, LessonPlanDraft } from "@/lib/lesson-plans/types";

function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeFileName(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "lesson-plan"
  );
}

function capitalizeLevel(level: LessonLevel) {
  return level.charAt(0).toUpperCase() + level.slice(1);
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

function clampText(value: string, maxLength: number) {
  const collapsed = value.replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLength) return collapsed;
  return `${collapsed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function formatSectionText(value: string, maxLength = 180) {
  return escapeHtml(clampText(value || "No details added.", maxLength));
}

function formatChip(value: string, variant: "blue" | "green" = "blue") {
  return `<span class="chip ${variant === "green" ? "green" : ""}">${escapeHtml(value)}</span>`;
}

function buildLessonPlanPdfHtml(lesson: LessonRecord, draft: LessonPlanDraft) {
  const title = draft.title.trim() || `${lesson.name} Lesson Plan`;
  const level = capitalizeLevel(draft.level);
  const focus = draft.focus.trim() || lesson.name;
  const objective = draft.objective.trim() || "No objective added.";
  const materials = draft.materials.trim() || "No materials listed.";
  const warmUp = draft.warmUp.trim() || "No warm-up added.";
  const guidedPractice = draft.guidedPractice.trim() || "No guided practice added.";
  const independentPractice = draft.independentPractice.trim() || "No independent practice added.";
  const wrapUp = draft.wrapUp.trim() || "No wrap-up added.";
  const assessment = draft.assessment.trim() || "No assessment added.";
  const notes = draft.notes.trim() || "No teacher notes added.";

  const scheduleRows = draft.schedule
    .split("\n")
    .filter(Boolean)
    .map((entry) => {
      const [time, rest] = entry.split(" · ");
      const [activityTitle, detail = ""] = (rest ?? "").split(" — ");
      return { time, activityTitle, detail };
    })
    .slice(0, 5);

  const games = draft.recommendedGames.split(" · ").filter(Boolean);
  const worksheets = draft.recommendedWorksheets.split(" · ").filter(Boolean);

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page {
            size: Letter landscape;
            margin: 0.24in;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            color: #1f2937;
            font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background: #f7faf7;
          }

          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .sheet {
            width: 100%;
            height: calc(100vh - 0.02in);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            gap: 0.13in;
            padding: 0;
          }

          .header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 0.18in;
            padding: 0.05in 0.02in 0.01in;
          }

          .eyebrow {
            font-size: 0.095in;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            font-weight: 800;
            color: #6b7280;
          }

          .title {
            margin: 0.05in 0 0;
            font-size: 0.26in;
            line-height: 1.06;
            font-weight: 900;
            color: #17212f;
          }

          .subtitle {
            margin-top: 0.05in;
            font-size: 0.108in;
            color: #5b6471;
            line-height: 1.4;
          }

          .header-badge {
            flex: 0 0 auto;
            min-width: 1.15in;
            border-radius: 999px;
            border: 0.015in solid rgba(30, 64, 175, 0.12);
            background: linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(127, 163, 106, 0.08));
            padding: 0.11in 0.16in;
            text-align: center;
            font-size: 0.12in;
            font-weight: 900;
            letter-spacing: 0.18em;
            color: #1f2937;
          }

          .summary-row {
            display: grid;
            grid-template-columns: 1.2fr 0.9fr 0.9fr 0.8fr;
            gap: 0.09in;
          }

          .pill {
            border-radius: 0.15in;
            border: 0.012in solid rgba(31, 41, 55, 0.08);
            background: rgba(255, 255, 255, 0.92);
            padding: 0.08in 0.11in;
            min-height: 0.6in;
          }

          .pill-label {
            font-size: 0.07in;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #7a8493;
            font-weight: 800;
          }

          .pill-value {
            margin-top: 0.05in;
            font-size: 0.113in;
            line-height: 1.35;
            font-weight: 700;
            color: #17212f;
          }

          .main {
            flex: 1 1 auto;
            min-height: 0;
            display: grid;
            grid-template-columns: 1.1fr 0.9fr;
            gap: 0.11in;
          }

          .card {
            border-radius: 0.18in;
            border: 0.012in solid rgba(31, 41, 55, 0.08);
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 0.06in 0.18in rgba(15, 23, 42, 0.05);
            padding: 0.11in 0.12in;
            min-height: 0;
            overflow: hidden;
          }

          .card-title {
            margin: 0;
            font-size: 0.095in;
            font-weight: 900;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: #6b7280;
          }

          .schedule {
            display: flex;
            flex-direction: column;
            gap: 0.08in;
          }

          .schedule-row {
            border-radius: 0.12in;
            border: 0.01in solid rgba(127, 163, 106, 0.18);
            background: linear-gradient(135deg, rgba(127, 163, 106, 0.08), rgba(255, 255, 255, 0.98));
            padding: 0.08in 0.1in;
          }

          .schedule-time {
            font-size: 0.07in;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            font-weight: 900;
            color: #5a6a57;
          }

          .schedule-name {
            margin-top: 0.03in;
            font-size: 0.112in;
            font-weight: 800;
            color: #17212f;
          }

          .schedule-detail {
            margin-top: 0.025in;
            font-size: 0.094in;
            line-height: 1.35;
            color: #4b5563;
          }

          .right-column {
            display: grid;
            grid-template-rows: auto auto 1fr;
            gap: 0.09in;
            min-height: 0;
          }

          .snapshot-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.08in;
          }

          .mini {
            border-radius: 0.12in;
            border: 0.01in solid rgba(31, 41, 55, 0.06);
            background: rgba(247, 250, 247, 0.96);
            padding: 0.08in 0.09in;
            min-height: 0.66in;
          }

          .mini.large {
            min-height: 0.98in;
          }

          .mini-label {
            font-size: 0.065in;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            font-weight: 900;
            color: #7b8593;
          }

          .mini-value {
            margin-top: 0.045in;
            font-size: 0.095in;
            line-height: 1.3;
            color: #17212f;
            font-weight: 700;
          }

          .chips {
            display: flex;
            flex-wrap: wrap;
            gap: 0.05in;
            margin-top: 0.055in;
          }

          .chip {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 999px;
            border: 0.01in solid rgba(37, 99, 235, 0.14);
            background: rgba(37, 99, 235, 0.06);
            padding: 0.05in 0.09in;
            font-size: 0.078in;
            font-weight: 800;
            color: #203049;
            white-space: nowrap;
          }

          .chip.green {
            border-color: rgba(127, 163, 106, 0.18);
            background: rgba(127, 163, 106, 0.08);
          }

          .support-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 0.08in;
            min-height: 0;
          }

          .support-card {
            border-radius: 0.12in;
            border: 0.01in solid rgba(31, 41, 55, 0.06);
            background: rgba(255, 255, 255, 0.98);
            padding: 0.07in 0.08in;
            min-height: 0;
            overflow: hidden;
          }

          .support-title {
            font-size: 0.068in;
            text-transform: uppercase;
            letter-spacing: 0.18em;
            font-weight: 900;
            color: #7b8593;
          }

          .support-text {
            margin-top: 0.038in;
            font-size: 0.086in;
            line-height: 1.28;
            color: #344054;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .footer-note {
            margin-top: 0.03in;
            font-size: 0.078in;
            line-height: 1.25;
            color: #5b6471;
          }

          .objective-box {
            border-radius: 0.14in;
            border: 0.01in solid rgba(30, 64, 175, 0.08);
            background: linear-gradient(135deg, rgba(30, 64, 175, 0.04), rgba(255, 255, 255, 0.98));
            padding: 0.08in 0.09in;
          }

          .objective-text {
            margin-top: 0.05in;
            font-size: 0.092in;
            line-height: 1.32;
            color: #344054;
            display: -webkit-box;
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .materials-box {
            border-radius: 0.14in;
            border: 0.01in solid rgba(127, 163, 106, 0.1);
            background: linear-gradient(135deg, rgba(127, 163, 106, 0.05), rgba(255, 255, 255, 0.98));
            padding: 0.08in 0.09in;
          }

          .materials-text {
            margin-top: 0.05in;
            font-size: 0.09in;
            line-height: 1.32;
            color: #344054;
            display: -webkit-box;
            -webkit-line-clamp: 4;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .lesson-chip-row {
            display: flex;
            flex-wrap: wrap;
            gap: 0.05in;
            margin-top: 0.05in;
          }

          .lesson-chip {
            border-radius: 999px;
            border: 0.01in solid rgba(31, 41, 55, 0.08);
            background: rgba(247, 250, 247, 0.96);
            padding: 0.045in 0.08in;
            font-size: 0.076in;
            font-weight: 800;
            color: #344054;
          }
        </style>
      </head>
      <body>
        <main class="sheet">
          <header class="header">
            <div>
              <div class="eyebrow">Classendo lesson plan</div>
              <h1 class="title">${escapeHtml(title)}</h1>
              <div class="subtitle">
                ${escapeHtml(lesson.name)} · ${level} learners · ${lesson.cards.length} cards · One 50-minute session
              </div>
              <div class="lesson-chip-row">
                <span class="lesson-chip">${escapeHtml(focus)}</span>
                <span class="lesson-chip">${escapeHtml(games.slice(0, 2).join(" · ") || "Suggested games")}</span>
                <span class="lesson-chip">${escapeHtml(worksheets.slice(0, 2).join(" · ") || "Suggested worksheets")}</span>
              </div>
            </div>
            <div class="header-badge">50 MIN</div>
          </header>

          <section class="summary-row">
            <div class="pill">
              <div class="pill-label">Selected lesson</div>
              <div class="pill-value">${escapeHtml(lesson.name)}</div>
            </div>
            <div class="pill">
              <div class="pill-label">Level</div>
              <div class="pill-value">${escapeHtml(level)}</div>
            </div>
            <div class="pill">
              <div class="pill-label">Focus</div>
              <div class="pill-value">${escapeHtml(focus)}</div>
            </div>
            <div class="pill">
              <div class="pill-label">Cards</div>
              <div class="pill-value">${lesson.cards.length}</div>
            </div>
          </section>

          <section class="main">
            <article class="card schedule">
              <div class="card-title">50-minute flow</div>
              ${scheduleRows
                .map(
                  (row) => `
                    <div class="schedule-row">
                      <div class="schedule-time">${escapeHtml(row.time || "")}</div>
                      <div class="schedule-name">${escapeHtml(row.activityTitle || "")}</div>
                      <div class="schedule-detail">${escapeHtml(clampText(row.detail || "", 160))}</div>
                    </div>
                  `
                )
                .join("")}
            </article>

            <div class="right-column">
              <article class="card">
                <div class="card-title">Lesson snapshot</div>
                <div class="objective-box" style="margin-top: 0.08in;">
                  <div class="mini-label">Objective</div>
                  <div class="objective-text">${formatSectionText(objective, 220)}</div>
                </div>
                <div class="materials-box" style="margin-top: 0.08in;">
                  <div class="mini-label">Materials</div>
                  <div class="materials-text">${formatSectionText(materials, 260)}</div>
                </div>
              </article>

              <article class="card">
                <div class="card-title">Suggested games and worksheets</div>
                <div style="margin-top: 0.08in;" class="mini-label">Games</div>
                <div class="chips">
                  ${games.map((game) => formatChip(game)).join("")}
                </div>
                <div style="margin-top: 0.09in;" class="mini-label">Worksheets</div>
                <div class="chips">
                  ${worksheets.map((worksheet) => formatChip(worksheet, "green")).join("")}
                </div>
              </article>

              <article class="card">
                <div class="card-title">Teaching notes</div>
                <div class="support-grid" style="margin-top: 0.08in;">
                  <div class="support-card">
                    <div class="support-title">Warm-up</div>
                    <div class="support-text">${formatSectionText(warmUp, 140)}</div>
                  </div>
                  <div class="support-card">
                    <div class="support-title">Guided practice</div>
                    <div class="support-text">${formatSectionText(guidedPractice, 140)}</div>
                  </div>
                  <div class="support-card">
                    <div class="support-title">Independent practice</div>
                    <div class="support-text">${formatSectionText(independentPractice, 140)}</div>
                  </div>
                  <div class="support-card">
                    <div class="support-title">Wrap-up</div>
                    <div class="support-text">${formatSectionText(wrapUp, 140)}</div>
                  </div>
                  <div class="support-card">
                    <div class="support-title">Assessment</div>
                    <div class="support-text">${formatSectionText(assessment, 140)}</div>
                  </div>
                  <div class="support-card">
                    <div class="support-title">Notes</div>
                    <div class="support-text">${formatSectionText(notes, 140)}</div>
                  </div>
                </div>
                <div class="footer-note">
                  Classroom flow designed for a single printable page. Use the live lesson plan editor for longer teacher notes.
                </div>
              </article>
            </div>
          </section>
        </main>
      </body>
    </html>
  `;
}

async function renderHtmlToPdfBuffer(html: string) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: resolveBrowserExecutablePath(),
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
    });

    await page.setContent(html, { waitUntil: "load" });
    await page.emulateMedia({ media: "print" });
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.waitForTimeout(200);

    return await page.pdf({
      format: "Letter",
      landscape: true,
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
  } finally {
    await browser.close();
  }
}

export async function createLessonPlanPdfBuffer(lesson: LessonRecord, draft: LessonPlanDraft) {
  const html = buildLessonPlanPdfHtml(lesson, draft);
  return renderHtmlToPdfBuffer(html);
}

export function buildLessonPlanPdfFileName(title: string) {
  return `${sanitizeFileName(title)}.pdf`;
}
