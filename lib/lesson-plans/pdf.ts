import { LessonRecord } from "@/lib/lessons/types";
import { launchPdfBrowser } from "@/lib/pdf/browser";
import {
  DEFAULT_LESSON_PLAN_PREFERENCES,
  LessonLevel,
  LessonPlanDraft,
  LessonPlanStage,
} from "@/lib/lesson-plans/types";

function normalizePdfText(value: string) {
  return String(value)
    .replaceAll("\u2011", "-")
    .replaceAll("\u2013", "-")
    .replaceAll("\u2014", "-");
}

function escapeHtml(value: string) {
  return normalizePdfText(value)
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

function formatPreferenceLabel(value: string) {
  const spaced = value.replaceAll("-", " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function clampText(value: string, maxLength: number) {
  const collapsed = normalizePdfText(value).replace(/\s+/g, " ").trim();
  if (collapsed.length <= maxLength) return collapsed;
  return `${collapsed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`;
}

function formatChip(value: string, variant: "blue" | "green" | "gold" = "blue") {
  return `<span class="chip chip-${variant}">${escapeHtml(value)}</span>`;
}

function parseLegacyStages(schedule: string): LessonPlanStage[] {
  return schedule
    .split("\n")
    .filter(Boolean)
    .map((entry, index) => {
      const dividerIndex = entry.indexOf(" \u00b7 ");
      const detailIndex = entry.indexOf(" \u2014 ", dividerIndex + 3);
      const time = dividerIndex >= 0 ? entry.slice(0, dividerIndex) : "";
      const title =
        dividerIndex >= 0
          ? entry.slice(dividerIndex + 3, detailIndex >= 0 ? detailIndex : undefined)
          : entry;
      const detail = detailIndex >= 0 ? entry.slice(detailIndex + 3) : "";

      return {
        id: `legacy-${index}`,
        time,
        title,
        purpose: "",
        teacherAction: detail,
        studentAction: "",
        checkForUnderstanding: "",
      };
    });
}

function chunkStages(stages: LessonPlanStage[], size = 6) {
  const chunks: LessonPlanStage[][] = [];
  for (let index = 0; index < stages.length; index += size) {
    chunks.push(stages.slice(index, index + size));
  }
  return chunks;
}

function stageTimeBoundary(stage: LessonPlanStage, side: "start" | "end") {
  const matches = normalizePdfText(stage.time).match(/(\d+)\s*-\s*(\d+)/);
  if (!matches) return "";
  return side === "start" ? matches[1] : matches[2];
}

function buildLessonPlanPdfHtml(lesson: LessonRecord, draft: LessonPlanDraft) {
  const preferences = {
    ...DEFAULT_LESSON_PLAN_PREFERENCES,
    ...(draft.preferences ?? {}),
  };
  const title = draft.title.trim() || `${lesson.name} Lesson Plan`;
  const level = capitalizeLevel(draft.level);
  const focus = draft.focus.trim() || lesson.name;
  const stages =
    Array.isArray(draft.stages) && draft.stages.length > 0
      ? draft.stages
      : parseLegacyStages(draft.schedule);
  const breakIndex = stages.findIndex((stage) => stage.id === "midpoint-break");
  const breakStage = breakIndex >= 0 ? stages[breakIndex] : null;
  const teachingStages = stages.filter((stage) => stage.id !== "midpoint-break");
  const classroomModes = Array.from(
    new Set(
      (draft.recommendedTools ?? [])
        .filter((tool) => tool.kind === "classroom")
        .map((tool) => tool.label.replace(/^Classroom\s*\u00b7\s*/i, "")),
    ),
  );
  const games = draft.recommendedGames.split(" \u00b7 ").filter(Boolean);
  const worksheets = draft.recommendedWorksheets.split(" \u00b7 ").filter(Boolean);
  const firstSupport =
    teachingStages.find((stage) => stage.support)?.support ??
    "Use a model, visual prompt, or either/or choice before independent recall.";
  const firstChallenge =
    teachingStages.find((stage) => stage.challenge)?.challenge ??
    "Ask for a complete sentence, explanation, comparison, or additional example.";
  const assessment =
    draft.assessment.trim() ||
    teachingStages.at(-1)?.checkForUnderstanding ||
    "Check independent recall at the end of the lesson.";

  const stageGroups: Array<{
    title: string;
    subtitle: string;
    stages: LessonPlanStage[];
    breakNote?: string;
  }> = [];

  if (breakIndex >= 0) {
    const blockOne = stages.slice(0, breakIndex);
    const blockTwo = stages.slice(breakIndex + 1);
    chunkStages(blockOne).forEach((group, index) => {
      stageGroups.push({
        title: `Teaching block 1${index > 0 ? ` - continued` : ""}`,
        subtitle: `${stageTimeBoundary(group[0], "start") || "0"}-${stageTimeBoundary(group.at(-1) as LessonPlanStage, "end") || ""} minutes`,
        stages: group,
        breakNote:
          index === chunkStages(blockOne).length - 1 && breakStage
            ? `${breakStage.time} - ${breakStage.title}: ${breakStage.purpose}`
            : undefined,
      });
    });
    chunkStages(blockTwo).forEach((group, index) => {
      stageGroups.push({
        title: `Teaching block 2${index > 0 ? ` - continued` : ""}`,
        subtitle: `${stageTimeBoundary(group[0], "start") || ""}-${stageTimeBoundary(group.at(-1) as LessonPlanStage, "end") || preferences.durationMinutes} minutes`,
        stages: group,
      });
    });
  } else {
    chunkStages(teachingStages).forEach((group, index) => {
      stageGroups.push({
        title: index === 0 ? "Teaching sequence" : "Teaching sequence - continued",
        subtitle: `${preferences.durationMinutes}-minute lesson`,
        stages: group,
      });
    });
  }

  const totalPages = 1 + stageGroups.length;

  const renderPageHeader = (
    eyebrow: string,
    heading: string,
    subtitle: string,
    pageNumber: number,
  ) => `
    <header class="page-header">
      <div>
        <div class="eyebrow">${escapeHtml(eyebrow)}</div>
        <h1 class="page-title">${escapeHtml(heading)}</h1>
        <div class="page-subtitle">${escapeHtml(subtitle)}</div>
      </div>
      <div class="page-number">${pageNumber} / ${totalPages}</div>
    </header>
  `;

  const renderStageCard = (stage: LessonPlanStage) => `
    <article class="stage-card ${stage.tool?.kind === "classroom" ? "stage-classroom" : ""}">
      <div class="stage-top">
        <div>
          <div class="stage-time">${escapeHtml(stage.time)}</div>
          <h2 class="stage-title">${escapeHtml(stage.title)}</h2>
        </div>
        ${
          stage.tool
            ? `<span class="tool-pill tool-${escapeHtml(stage.tool.kind)}">${escapeHtml(stage.tool.label)}</span>`
            : ""
        }
      </div>
      ${stage.purpose ? `<p class="stage-purpose">${escapeHtml(stage.purpose)}</p>` : ""}
      <div class="action-grid">
        <div class="action-box">
          <div class="mini-label">Teacher</div>
          <p>${escapeHtml(stage.teacherAction || "Guide the activity and model the expected response.")}</p>
        </div>
        <div class="action-box">
          <div class="mini-label">Students</div>
          <p>${escapeHtml(stage.studentAction || "Complete the activity and respond using the target language.")}</p>
        </div>
      </div>
      <div class="check-box">
        <span>Check:</span>
        ${escapeHtml(stage.checkForUnderstanding || "Confirm understanding before continuing.")}
      </div>
    </article>
  `;

  const stagePages = stageGroups
    .map(
      (group, index) => `
        <section class="pdf-page stage-page">
          ${renderPageHeader(
            "Classendo teaching guide",
            group.title,
            `${lesson.name} | ${group.subtitle}`,
            index + 2,
          )}
          ${
            group.breakNote
              ? `<div class="break-banner"><span>10-minute midpoint break</span>${escapeHtml(group.breakNote)}</div>`
              : ""
          }
          <div class="stage-grid stage-count-${group.stages.length}">
            ${group.stages.map(renderStageCard).join("")}
          </div>
          <footer class="page-footer">
            <span>${escapeHtml(title)}</span>
            <span>Follow the checks before moving to the next stage.</span>
          </footer>
        </section>
      `,
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          @page {
            size: Letter landscape;
            margin: 0;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            color: #1f2937;
            font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .pdf-page {
            width: 11in;
            height: 8.5in;
            padding: 0.28in 0.3in 0.24in;
            overflow: hidden;
            background:
              radial-gradient(circle at top right, rgba(198, 217, 190, 0.24), transparent 30%),
              linear-gradient(180deg, #fbfdfb 0%, #f5f8f5 100%);
            page-break-after: always;
            display: flex;
            flex-direction: column;
          }

          .pdf-page:last-child {
            page-break-after: auto;
          }

          .page-header {
            min-height: 0.66in;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 0.2in;
            border-bottom: 1px solid rgba(82, 99, 74, 0.16);
            padding-bottom: 0.1in;
          }

          .eyebrow,
          .mini-label {
            font-size: 7.5px;
            font-weight: 900;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: #6d7d67;
          }

          .page-title {
            margin: 0.035in 0 0;
            font-size: 24px;
            line-height: 1.05;
            letter-spacing: -0.02em;
            color: #17212f;
          }

          .page-subtitle {
            margin-top: 0.045in;
            font-size: 9px;
            color: #64748b;
          }

          .page-number {
            min-width: 0.65in;
            border-radius: 999px;
            border: 1px solid rgba(82, 99, 74, 0.18);
            background: rgba(255, 255, 255, 0.9);
            padding: 0.07in 0.12in;
            text-align: center;
            font-size: 8px;
            font-weight: 900;
            letter-spacing: 0.16em;
            color: #52634a;
          }

          .overview-title {
            margin-top: 0.08in;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 0.25in;
          }

          .overview-title h1 {
            margin: 0;
            font-size: 28px;
            line-height: 1.02;
            letter-spacing: -0.025em;
            color: #17212f;
          }

          .duration-badge {
            border-radius: 999px;
            border: 1px solid #c7d6bf;
            background: #eff5ec;
            padding: 0.1in 0.2in;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.17em;
            color: #344334;
            white-space: nowrap;
          }

          .chip-row,
          .tool-row {
            display: flex;
            flex-wrap: wrap;
            gap: 0.055in;
          }

          .chip-row {
            margin-top: 0.08in;
          }

          .chip {
            border-radius: 999px;
            padding: 0.045in 0.08in;
            font-size: 7px;
            font-weight: 800;
            border: 1px solid rgba(31, 41, 55, 0.08);
            background: white;
          }

          .chip-blue {
            border-color: #c7d6f8;
            background: #eef4ff;
          }

          .chip-green {
            border-color: #c9d9c1;
            background: #f0f6ed;
          }

          .chip-gold {
            border-color: #e7d8aa;
            background: #fff9e8;
          }

          .summary-grid {
            margin-top: 0.1in;
            display: grid;
            grid-template-columns: 0.9fr 0.65fr 1.45fr 0.45fr;
            gap: 0.08in;
          }

          .summary-card,
          .panel,
          .stage-card {
            border: 1px solid rgba(31, 41, 55, 0.08);
            background: rgba(255, 255, 255, 0.94);
            box-shadow: 0 0.05in 0.14in rgba(15, 23, 42, 0.04);
          }

          .summary-card {
            min-height: 0.58in;
            border-radius: 0.14in;
            padding: 0.09in 0.11in;
          }

          .summary-value {
            margin-top: 0.045in;
            font-size: 10px;
            font-weight: 800;
            line-height: 1.25;
            color: #243124;
          }

          .overview-main {
            min-height: 0;
            flex: 1;
            margin-top: 0.1in;
            display: grid;
            grid-template-columns: 1.18fr 0.82fr;
            gap: 0.1in;
          }

          .panel {
            min-height: 0;
            border-radius: 0.17in;
            padding: 0.11in 0.12in;
            overflow: hidden;
          }

          .panel-title {
            margin: 0;
            font-size: 8px;
            font-weight: 900;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: #6d7d67;
          }

          .timeline {
            margin-top: 0.075in;
            display: grid;
            gap: 0.045in;
          }

          .timeline-row {
            display: grid;
            grid-template-columns: 0.72in 1.55in 1fr auto;
            align-items: center;
            gap: 0.08in;
            border-radius: 0.1in;
            border: 1px solid #dce8d7;
            background: #fbfdfb;
            padding: 0.055in 0.075in;
          }

          .timeline-time {
            font-size: 7px;
            font-weight: 900;
            letter-spacing: 0.1em;
            color: #52634a;
          }

          .timeline-name {
            font-size: 8.5px;
            font-weight: 850;
            color: #17212f;
          }

          .timeline-purpose {
            font-size: 7.5px;
            line-height: 1.25;
            color: #64748b;
          }

          .timeline-tool {
            max-width: 1.25in;
            border-radius: 999px;
            background: #edf4ea;
            padding: 0.035in 0.065in;
            font-size: 6.8px;
            font-weight: 800;
            color: #52634a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .overview-side {
            min-height: 0;
            display: grid;
            grid-template-rows: auto auto 1fr;
            gap: 0.08in;
          }

          .snapshot-box {
            margin-top: 0.065in;
            border-radius: 0.11in;
            padding: 0.075in 0.09in;
            background: #f7f9ff;
            border: 1px solid #dce4f5;
          }

          .snapshot-box + .snapshot-box {
            margin-top: 0.06in;
            background: #fbfdfb;
            border-color: #dce8d7;
          }

          .snapshot-text,
          .support-text {
            margin: 0.035in 0 0;
            font-size: 8px;
            line-height: 1.32;
            color: #344054;
          }

          .tool-section + .tool-section {
            margin-top: 0.07in;
          }

          .support-grid {
            margin-top: 0.065in;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.065in;
          }

          .support-box {
            border-radius: 0.11in;
            border: 1px solid rgba(31, 41, 55, 0.07);
            background: #fbfcfb;
            padding: 0.07in 0.08in;
          }

          .support-box-wide {
            grid-column: 1 / -1;
          }

          .stage-page {
            gap: 0.1in;
          }

          .break-banner {
            display: flex;
            align-items: center;
            gap: 0.12in;
            border-radius: 0.12in;
            border: 1px solid #e4d39e;
            background: #fff8df;
            padding: 0.07in 0.1in;
            font-size: 8px;
            line-height: 1.25;
            color: #66521d;
          }

          .break-banner span {
            border-radius: 999px;
            background: white;
            padding: 0.04in 0.07in;
            font-weight: 900;
            white-space: nowrap;
          }

          .stage-grid {
            min-height: 0;
            flex: 1;
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: repeat(3, minmax(0, 1fr));
            gap: 0.09in;
          }

          .stage-count-1,
          .stage-count-2 {
            grid-template-rows: 1fr;
          }

          .stage-count-3,
          .stage-count-4 {
            grid-template-rows: repeat(2, minmax(0, 1fr));
          }

          .stage-card {
            min-height: 0;
            border-radius: 0.15in;
            padding: 0.09in 0.1in;
            overflow: hidden;
            display: flex;
            flex-direction: column;
          }

          .stage-classroom {
            border-color: #c9d9c1;
            background: linear-gradient(135deg, #fbfdfb, #f4f8f2);
          }

          .stage-top {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 0.1in;
          }

          .stage-time {
            font-size: 7px;
            font-weight: 900;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            color: #6d7d67;
          }

          .stage-title {
            margin: 0.025in 0 0;
            font-size: 11px;
            line-height: 1.15;
            color: #17212f;
          }

          .tool-pill {
            max-width: 1.65in;
            border-radius: 999px;
            padding: 0.04in 0.075in;
            font-size: 7px;
            font-weight: 850;
            background: #eef4ff;
            color: #294a8a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .tool-classroom {
            background: #eaf3e6;
            color: #496343;
          }

          .tool-worksheet {
            background: #fff7df;
            color: #705816;
          }

          .stage-purpose {
            margin: 0.04in 0 0;
            font-size: 7.5px;
            line-height: 1.28;
            color: #64748b;
          }

          .action-grid {
            min-height: 0;
            flex: 1;
            margin-top: 0.055in;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.06in;
          }

          .action-box {
            border-radius: 0.09in;
            border: 1px solid rgba(31, 41, 55, 0.06);
            background: rgba(255, 255, 255, 0.82);
            padding: 0.055in 0.065in;
            overflow: hidden;
          }

          .action-box p {
            margin: 0.025in 0 0;
            font-size: 7.2px;
            line-height: 1.26;
            color: #344054;
          }

          .check-box {
            margin-top: 0.05in;
            border-radius: 0.085in;
            border: 1px dashed #aabca2;
            background: rgba(255, 255, 255, 0.72);
            padding: 0.045in 0.06in;
            font-size: 7.2px;
            line-height: 1.24;
            color: #4b5563;
          }

          .check-box span {
            font-weight: 900;
            color: #344334;
          }

          .page-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 0.2in;
            border-top: 1px solid rgba(82, 99, 74, 0.12);
            padding-top: 0.06in;
            font-size: 7px;
            color: #7b8794;
          }
        </style>
      </head>
      <body>
        <section class="pdf-page overview-page">
          <div class="eyebrow">Classendo lesson plan</div>
          <div class="overview-title">
            <div>
              <h1>${escapeHtml(title)}</h1>
              <div class="page-subtitle">
                ${escapeHtml(lesson.name)} | ${level} learners | ${lesson.cards.length} cards | ${escapeHtml(formatPreferenceLabel(preferences.purpose))}
              </div>
            </div>
            <div class="duration-badge">${preferences.durationMinutes} MIN</div>
          </div>

          <div class="chip-row">
            ${formatChip(formatPreferenceLabel(preferences.classFormat), "green")}
            ${formatChip(formatPreferenceLabel(preferences.ageGroup), "green")}
            ${formatChip(`${formatPreferenceLabel(preferences.skillFocus)} focus`, "blue")}
            ${formatChip(`${formatPreferenceLabel(preferences.supportLevel)} support`, "gold")}
            ${breakStage ? formatChip("10-minute midpoint break", "gold") : ""}
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <div class="mini-label">Selected lesson</div>
              <div class="summary-value">${escapeHtml(lesson.name)}</div>
            </div>
            <div class="summary-card">
              <div class="mini-label">Level</div>
              <div class="summary-value">${escapeHtml(level)}</div>
            </div>
            <div class="summary-card">
              <div class="mini-label">Focus</div>
              <div class="summary-value">${escapeHtml(focus)}</div>
            </div>
            <div class="summary-card">
              <div class="mini-label">Cards</div>
              <div class="summary-value">${lesson.cards.length}</div>
            </div>
          </div>

          <div class="overview-main">
            <article class="panel">
              <h2 class="panel-title">${preferences.durationMinutes}-minute lesson map</h2>
              <div class="timeline">
                ${stages
                  .map(
                    (stage) => `
                      <div class="timeline-row">
                        <div class="timeline-time">${escapeHtml(stage.time)}</div>
                        <div class="timeline-name">${escapeHtml(stage.title)}</div>
                        <div class="timeline-purpose">${escapeHtml(clampText(stage.purpose || stage.teacherAction, 115))}</div>
                        <div class="timeline-tool">${escapeHtml(stage.tool?.label ?? "Teaching")}</div>
                      </div>
                    `,
                  )
                  .join("")}
              </div>
            </article>

            <div class="overview-side">
              <article class="panel">
                <h2 class="panel-title">Lesson snapshot</h2>
                <div class="snapshot-box">
                  <div class="mini-label">Objective</div>
                  <p class="snapshot-text">${escapeHtml(draft.objective || "No objective added.")}</p>
                </div>
                <div class="snapshot-box">
                  <div class="mini-label">Materials</div>
                  <p class="snapshot-text">${escapeHtml(draft.materials || "No materials listed.")}</p>
                </div>
              </article>

              <article class="panel">
                <h2 class="panel-title">Classendo teaching tools</h2>
                <div class="tool-section">
                  <div class="mini-label">Classroom sequence</div>
                  <div class="tool-row">
                    ${(classroomModes.length ? classroomModes : ["Image Only", "Image + Text", "Text Only"])
                      .map((mode) => formatChip(mode, "green"))
                      .join("")}
                  </div>
                </div>
                ${
                  games.length
                    ? `<div class="tool-section"><div class="mini-label">Games</div><div class="tool-row">${games
                        .map((game) => formatChip(game, "blue"))
                        .join("")}</div></div>`
                    : ""
                }
                ${
                  worksheets.length
                    ? `<div class="tool-section"><div class="mini-label">Worksheets</div><div class="tool-row">${worksheets
                        .map((worksheet) => formatChip(worksheet, "gold"))
                        .join("")}</div></div>`
                    : ""
                }
              </article>

              <article class="panel">
                <h2 class="panel-title">Assessment and differentiation</h2>
                <div class="support-grid">
                  <div class="support-box support-box-wide">
                    <div class="mini-label">Success criterion</div>
                    <p class="support-text">${escapeHtml(assessment)}</p>
                  </div>
                  <div class="support-box">
                    <div class="mini-label">Support</div>
                    <p class="support-text">${escapeHtml(firstSupport)}</p>
                  </div>
                  <div class="support-box">
                    <div class="mini-label">Challenge</div>
                    <p class="support-text">${escapeHtml(firstChallenge)}</p>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <footer class="page-footer">
            <span>Classendo | Classroom-first planning</span>
            <span>Page 1 / ${totalPages}</span>
          </footer>
        </section>

        ${stagePages}
      </body>
    </html>
  `;
}

async function renderHtmlToPdfBuffer(html: string) {
  const browser = await launchPdfBrowser();

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

export async function createLessonPlanPdfBuffer(
  lesson: LessonRecord,
  draft: LessonPlanDraft,
) {
  const html = buildLessonPlanPdfHtml(lesson, draft);
  return renderHtmlToPdfBuffer(html);
}

export function buildLessonPlanPdfFileName(title: string) {
  return `${sanitizeFileName(title)}.pdf`;
}
