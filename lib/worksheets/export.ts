import { LessonCard } from "@/lib/lessons/types";
import { buildBullseyeSvg, createBullseyeSectorPath, generateBullseyeLayout } from "@/lib/worksheets/bullseye";
import { generateCrosswordLayout } from "@/lib/worksheets/crossword";
import { WorksheetDraft, formatWorksheetWord } from "@/lib/worksheets/types";

type WorksheetDocumentOptions = {
  showAnswers?: boolean;
  includeTeacherCopy?: boolean;
  previewMode?: boolean;
};

type CrosswordHtmlOptions = {
  showAnswers: boolean;
};

function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeWord(word: string) {
  return String(word ?? "").toUpperCase().replace(/[^A-Z]/g, "");
}

function resolveBoardImageSrc(card: LessonCard) {
  const raw = String(card.image ?? card.back ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("http")) return raw;
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) return raw;
  return `${baseUrl}/storage/v1/object/public/vocab-images/${raw.replace(/^\/+/, "")}`;
}

function buildBullseyeGameHtml(cards: LessonCard[], draft: WorksheetDraft) {
  const layout = generateBullseyeLayout(cards, draft);
  const accentTitle = draft.title || "Bullseye";
  const version = draft.bullseyeVersion ?? "points";
  const imageMode = draft.bullseyeImageMode ?? "image";
  const inkSaver = Boolean(draft.bullseyeInkSaver);

  const boardPalette = inkSaver
    ? ["#f8fafc", "#f8fafc", "#f8fafc", "#f8fafc", "#f8fafc", "#f8fafc", "#f8fafc", "#f8fafc", "#f8fafc", "#f8fafc", "#f8fafc", "#f8fafc"]
    : layout.palette;

  const slotMarkup = layout.slots
    .map((slot, slotIndex) => {
      const card = slot.card;
      const imageSrc = resolveBoardImageSrc(card);
      const word = formatWorksheetWord(card.word);
      const fill = boardPalette[slot.sector % boardPalette.length];
      const stroke = inkSaver ? "#cbd5e1" : "#ffffff";
      const path = createBullseyeSectorPath(
        layout.centerX,
        layout.centerY,
        slot.innerRadius,
        slot.outerRadius,
        slot.startAngle,
        slot.endAngle
      );
      const pointsMarkup =
        version === "points"
          ? `<text x="${(slot.centerX + slot.contentSize / 2 - 1).toFixed(2)}" y="${(slot.centerY - slot.contentSize / 2 + 5).toFixed(2)}" text-anchor="end" font-size="5.8" font-weight="900" fill="#000000">${slot.points}</text>`
          : "";
      const imageSize = imageMode === "both" ? slot.contentSize * 0.72 : slot.contentSize;
      const imageX = slot.centerX - imageSize / 2;
      const imageY = slot.centerY - imageSize / 2 - (imageMode === "both" ? 2 : 0);
      const textY = slot.centerY + imageSize / 2 + (imageMode === "both" ? 2.5 : 4);
      const imageMarkup =
        imageMode === "text"
          ? `<text x="${slot.centerX.toFixed(2)}" y="${(slot.centerY + 2).toFixed(2)}" text-anchor="middle" font-size="${slot.ring === "outer" ? 6.6 : 5.8}" font-weight="800" fill="#0f172a">${escapeHtml(word)}</text>`
          : imageSrc
            ? `<image href="${escapeHtml(imageSrc)}" x="${imageX.toFixed(2)}" y="${imageY.toFixed(2)}" width="${imageSize}" height="${imageSize}" preserveAspectRatio="xMidYMid slice" clip-path="url(#slotClip-${slotIndex})" />`
            : `<text x="${slot.centerX.toFixed(2)}" y="${(slot.centerY + 3).toFixed(2)}" text-anchor="middle" font-size="10" font-weight="800" fill="#1d4ed8">?</text>`;
      const labelMarkup =
        imageMode === "both"
          ? `<text x="${slot.centerX.toFixed(2)}" y="${textY.toFixed(2)}" text-anchor="middle" font-size="${slot.ring === "outer" ? 5.1 : 4.6}" font-weight="800" fill="#0f172a">${escapeHtml(word)}</text>`
          : "";
      return `
        <defs>
          <clipPath id="slotClip-${slotIndex}">
            <path d="${createBullseyeSectorPath(layout.centerX, layout.centerY, slot.innerRadius, slot.outerRadius, slot.startAngle, slot.endAngle)}" />
          </clipPath>
        </defs>
        <path d="${path}" fill="${fill}" stroke="${stroke}" stroke-width="${inkSaver ? 0.6 : 0.9}" />
        ${pointsMarkup}
        ${imageMarkup}
        ${labelMarkup}
      `;
    })
    .join("");

  const bullseyeImage = resolveBoardImageSrc(layout.bullseyeCard);
  const bullseyeMarkup =
    imageMode === "text"
      ? `<text x="${layout.centerX.toFixed(2)}" y="${(layout.centerY + 2).toFixed(2)}" text-anchor="middle" font-size="6.6" font-weight="800" fill="#0f172a">${escapeHtml(formatWorksheetWord(layout.bullseyeCard.word))}</text>`
      : imageMode === "both" && bullseyeImage
          ? `<g>
            <image href="${escapeHtml(bullseyeImage)}" x="${(layout.centerX - 12).toFixed(2)}" y="${(layout.centerY - 12).toFixed(2)}" width="24" height="24" preserveAspectRatio="xMidYMid slice" clip-path="url(#bullseyeClip)" />
            <text x="${layout.centerX.toFixed(2)}" y="${(layout.centerY + 16).toFixed(2)}" text-anchor="middle" font-size="5.1" font-weight="800" fill="#0f172a">${escapeHtml(formatWorksheetWord(layout.bullseyeCard.word))}</text>
          </g>`
      : imageMode === "both"
        ? `<text x="${layout.centerX.toFixed(2)}" y="${(layout.centerY + 16).toFixed(2)}" text-anchor="middle" font-size="5.1" font-weight="800" fill="#0f172a">${escapeHtml(formatWorksheetWord(layout.bullseyeCard.word))}</text>`
      : bullseyeImage
        ? `<image href="${escapeHtml(bullseyeImage)}" x="${(layout.centerX - 12).toFixed(2)}" y="${(layout.centerY - 12).toFixed(2)}" width="24" height="24" preserveAspectRatio="xMidYMid slice" clip-path="url(#bullseyeClip)" />`
        : `<circle cx="${layout.centerX}" cy="${layout.centerY}" r="10" fill="#ffffff" stroke="#dbe4f0" />`;

  return `
    <div class="worksheet-shell bullseye-shell ${inkSaver ? "ink-saver" : ""}">
      <div class="worksheet-head bullseye-head">
        <div class="worksheet-head-top bullseye-head-top">
          <div class="worksheet-kicker">Classendo Worksheet</div>
          <div class="worksheet-name-line">Name: <span></span></div>
        </div>
        <h1 class="worksheet-title bullseye-title">${escapeHtml(accentTitle)}</h1>
      </div>

      <div class="bullseye-stage">
        <svg class="bullseye-board" viewBox="0 0 ${layout.width} ${layout.height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
          <defs>
            <clipPath id="bullseyeClip">
              <circle cx="${layout.centerX}" cy="${layout.centerY}" r="${layout.bullseyeRadius - 1}" />
            </clipPath>
          </defs>
          <circle cx="${layout.centerX}" cy="${layout.centerY}" r="${layout.outerRadius}" fill="${inkSaver ? "#ffffff" : "#f8fafc"}" stroke="${inkSaver ? "#cbd5e1" : "#ffffff"}" stroke-width="1.2" />
          ${slotMarkup}
          <circle cx="${layout.centerX}" cy="${layout.centerY}" r="${layout.bullseyeRadius}" fill="${inkSaver ? "#ffffff" : "#dbeafe"}" stroke="${inkSaver ? "#94a3b8" : "#1d4ed8"}" stroke-width="1.3" />
          ${bullseyeMarkup}
        </svg>

      </div>

      <div class="worksheet-footer bullseye-footer">classendo.com</div>
    </div>
  `;
}

function getGridCellSize(width: number) {
  if (width >= 15) return 33;
  if (width >= 13) return 36;
  if (width >= 11) return 40;
  return 44;
}

function buildCrosswordHtml(cards: LessonCard[], draft: WorksheetDraft, options: CrosswordHtmlOptions) {
  const layout = generateCrosswordLayout(cards, draft.difficulty, draft.shuffleSeed);
  if (!layout) {
    return `<div style="padding:32px;border:1px dashed #cbd5e1;border-radius:18px;color:#64748b;">No crossword could be generated from the selected cards.</div>`;
  }

  const cellSize = Math.min(getGridCellSize(layout.width) + 2, 46);
  const singleClueRow = layout.entries.length <= 8;
  const clueColumns = Math.min(8, Math.max(1, layout.entries.length));

  const cellMap = new Map(layout.cells.map((cell) => [`${cell.row}:${cell.col}`, cell]));
  const gridRows = Array.from({ length: layout.height }).map((_, row) => {
    const cols = Array.from({ length: layout.width }).map((__, col) => {
      const cell = cellMap.get(`${row}:${col}`);
      if (!cell) return `<div class="cw-cell cw-empty"></div>`;

      const shouldReveal = options.showAnswers || cell.reveal;
      const value = shouldReveal ? cell.letter : "&nbsp;";
      const number = cell.number ? `<span class="cw-number">${cell.number}</span>` : "";
      const classes = shouldReveal ? "cw-cell cw-cell-reveal" : "cw-cell";
      return `<div class="${classes}">${number}<span class="cw-letter">${value}</span></div>`;
    });

    return `<div class="cw-row">${cols.join("")}</div>`;
  });

  const clueCards = layout.entries
    .map((entry) => {
      const original = cards.find((card) => sanitizeWord(card.word) === entry.answer);
      const image = original?.image
        ? `<div class="clue-image-wrap"><img src="${escapeHtml(original.image)}" alt="${escapeHtml(formatWorksheetWord(entry.label))}" class="clue-image" /></div>`
        : "";
      const text = `<div class="clue-word">${escapeHtml(formatWorksheetWord(entry.label))}</div>`;
      let content = text;
      if (draft.clueMode === "image") content = image || text;
      if (draft.clueMode === "both") content = `${image}${text}`;
      return `<div class="clue-card"><div class="clue-number-badge">${entry.number}</div>${content}</div>`;
    })
    .join("");

  return `
    <div class="worksheet-shell">
      <div class="worksheet-head">
        <div class="worksheet-head-top">
          <div class="worksheet-kicker">Classendo Worksheet</div>
          <div class="worksheet-name-line">Name: <span></span></div>
        </div>
        <h1 class="worksheet-title">${escapeHtml(draft.title)}</h1>
        <p class="worksheet-instructions">${escapeHtml(draft.instructions)}</p>
      </div>
      <div class="crossword-stage ${singleClueRow ? "crossword-stage-large" : ""}">
        <div class="crossword-panel" style="--cw-cell-size:${cellSize}px;">${gridRows.join("")}</div>
      </div>
      <div class="clue-section ${singleClueRow ? "clue-section-compact" : ""}">
        <div class="clue-grid" style="--clue-columns:${clueColumns};">${clueCards}</div>
        <div class="worksheet-footer">classendo.com</div>
      </div>
      ${options.showAnswers ? `
        <div class="teacher-watermark">
          Teacher Copy
        </div>
      ` : ""}
    </div>
  `;
}

function buildWorksheetContentHtml(cards: LessonCard[], draft: WorksheetDraft, options: WorksheetDocumentOptions) {
  if (draft.type === "bullseye") {
    return `<section class="worksheet-page">${buildBullseyeGameHtml(cards, draft)}</section>`;
  }

  if (draft.type !== "crossword") {
    return `<div style="padding:32px;border:1px dashed #cbd5e1;border-radius:18px;color:#64748b;">This worksheet type is not implemented yet.</div>`;
  }

  if (options.showAnswers) {
    return `<section class="worksheet-page">${buildCrosswordHtml(cards, draft, { showAnswers: true })}</section>`;
  }

  const studentPage = buildCrosswordHtml(cards, draft, {
    showAnswers: false,
  });

  if (options.includeTeacherCopy === false) {
    return `<section class="worksheet-page">${studentPage}</section>`;
  }

  const teacherPage = buildCrosswordHtml(cards, draft, {
    showAnswers: true,
  });

  return `
    <section class="worksheet-page">${studentPage}</section>
    <section class="worksheet-page worksheet-page-break">${teacherPage}</section>
  `;
}

export function buildWorksheetDocumentHtml(
  cards: LessonCard[],
  draft: WorksheetDraft,
  options: WorksheetDocumentOptions = {}
) {
  const content = buildWorksheetContentHtml(cards, draft, options);
  const bodyClass = options.previewMode ? "worksheet-preview-body" : "";
  const isBullseye = draft.type === "bullseye";
  const pageWidth = isBullseye ? "297mm" : "210mm";
  const pageHeight = isBullseye ? "210mm" : "297mm";
  const pageSize = isBullseye ? "A4 landscape" : "A4 portrait";

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(draft.title || "Worksheet")}</title>
        <style>
          @page { margin: 0; size: ${pageSize}; }
          body {
            margin: 0;
            font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            background: #eef2f7;
            color: #0f172a;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .bullseye-shell {
            padding: 4px 8px 2px;
          }
          .bullseye-head {
            min-height: 12mm;
            padding-top: 1px;
          }
          .bullseye-head-top {
            align-items: center;
          }
          .bullseye-title {
            font-size: 28px;
            color: #1d4ed8;
            text-shadow: none;
            margin-top: 0;
          }
          .bullseye-stage {
            position: relative;
            flex: 1 1 auto;
            min-height: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: -1mm 0 0;
          }
          .bullseye-board {
            width: 100%;
            height: 100%;
            display: block;
          }
          .bullseye-footer {
            margin-top: 0;
            padding-top: 0;
            letter-spacing: 0.22em;
          }
          .ink-saver .bullseye-board text,
          .ink-saver .bullseye-board .bullseye-points {
            fill: #0f172a;
          }
          .worksheet-preview-body {
            padding: 28px;
          }
          .worksheet-page {
            width: ${pageWidth};
            height: ${pageHeight};
            padding: 3mm;
            margin: 0 auto;
            box-sizing: border-box;
          }
          .worksheet-page-break {
            page-break-before: always;
            break-before: page;
          }
          .worksheet-shell {
            background: white;
            border: 1px solid #dbe4f0;
            border-radius: 30px;
            padding: 10px 12px 4px;
            box-shadow: 0 20px 70px rgba(15, 23, 42, 0.08);
            height: 100%;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            gap: 4px;
            position: relative;
          }
          .worksheet-head {
            flex: 0 0 auto;
            min-height: 48px;
            padding: 1px 2px 0;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .worksheet-head-top {
            width: 100%;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 16px;
          }
          .worksheet-kicker {
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.18em;
            color: #64748b;
            margin-bottom: 4px;
          }
          .worksheet-name-line {
            font-size: 10px;
            color: #475569;
            white-space: nowrap;
          }
          .worksheet-name-line span {
            display: inline-block;
            width: 92px;
            border-bottom: 1.5px solid #94a3b8;
            transform: translateY(-2px);
            margin-left: 4px;
          }
          .worksheet-title {
            font-size: 28px;
            line-height: 1.05;
            margin: 0 0 3px;
            text-align: center;
            width: 100%;
          }
          .worksheet-instructions {
            font-size: 11px;
            color: #475569;
            margin: 0;
            line-height: 1.25;
            max-width: none;
            text-align: center;
            width: 100%;
          }
          .crossword-stage {
            flex: 1 1 auto;
            min-height: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
          }
          .crossword-panel {
            display: flex;
            flex-direction: column;
            gap: 0;
            width: fit-content;
            max-width: 100%;
            padding: 8px;
            border: 1px solid #d7dfeb;
            border-radius: 20px;
            background: white;
          }
          .cw-row {
            display: flex;
          }
          .cw-cell {
            width: var(--cw-cell-size);
            height: var(--cw-cell-size);
            border: 1px solid #cbd5e1;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            background: white;
          }
          .cw-cell-reveal {
            border-color: #bfdbfe;
            background: rgba(239, 246, 255, 0.9);
          }
          .cw-empty {
            border-color: transparent;
            background: transparent;
          }
          .cw-number {
            position: absolute;
            top: 4px;
            left: 5px;
            font-size: 9px;
            color: #64748b;
          }
          .cw-letter {
            font-size: calc(var(--cw-cell-size) * 0.44);
            font-weight: 700;
            color: #1e3a8a;
          }
          .clue-section-title {
            display: none;
          }
          .clue-grid {
            display: grid;
            grid-template-columns: repeat(var(--clue-columns), minmax(0, 1fr));
            gap: 4px;
            width: 100%;
          }
          .clue-card {
            display: flex;
            flex-direction: column;
            gap: 3px;
            align-items: center;
            justify-content: center;
            padding: 1px 0;
            break-inside: avoid;
            min-height: 52px;
          }
          .clue-number-badge {
            width: 20px;
            height: 20px;
            border-radius: 999px;
            background: #0f172a;
            color: white;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 700;
            flex-shrink: 0;
            box-shadow: none;
          }
          .clue-image-wrap {
            width: 66px;
            height: 66px;
            border-radius: 12px;
            overflow: hidden;
            background: transparent;
            border: 0;
            flex-shrink: 0;
            box-shadow: none;
          }
          .clue-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .clue-word {
            font-size: 11px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
            word-break: break-word;
            max-width: 100%;
            color: #1f2937;
            letter-spacing: -0.01em;
          }
          .clue-section {
            flex: 0 0 18%;
            min-height: 72px;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            gap: 2px;
            margin-top: 0.5mm;
          }
          .clue-section-compact {
            flex-basis: 14%;
            min-height: 60px;
          }
          .worksheet-footer {
            text-align: center;
            font-size: 9px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.16em;
            margin-top: auto;
          }
          .teacher-watermark {
            position: absolute;
            top: 20px;
            right: 24px;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.16em;
            color: #94a3b8;
          }
          @media screen and (max-width: 980px) {
            .worksheet-preview-body {
              padding: 16px;
            }
            .worksheet-page {
              width: 100%;
              min-height: auto;
            }
            .worksheet-shell {
              min-height: auto;
              padding: 22px;
            }
            .clue-grid {
              grid-template-columns: repeat(4, minmax(0, 1fr));
            }
          }
        </style>
      </head>
      <body class="${bodyClass}">
        ${content}
      </body>
    </html>
  `;
}

export function buildWorksheetPrintHtml(
  cards: LessonCard[],
  draft: WorksheetDraft,
  options: WorksheetDocumentOptions = {}
) {
  return buildWorksheetDocumentHtml(cards, draft, {
    includeTeacherCopy: false,
    ...options,
  });
}

async function buildBullseyePreviewHtml(cards: LessonCard[], draft: WorksheetDraft) {
  const svg = await buildBullseyeSvg(cards, draft, (card) => resolveBoardImageSrc(card));
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(draft.title || "Bullseye")}</title>
        <style>
          @page {
            margin: 0;
            size: A4 landscape;
          }
          html, body {
            margin: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #eef2f7;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            box-sizing: border-box;
          }
          .bullseye-preview-shell {
            width: 100%;
            height: 100%;
            max-width: 100%;
            max-height: 100%;
          }
          .bullseye-preview-shell svg {
            width: 100%;
            height: 100%;
            display: block;
          }
        </style>
      </head>
      <body>
        <div class="bullseye-preview-shell">${svg}</div>
      </body>
    </html>
  `;
}

export async function buildWorksheetPreviewHtml(
  cards: LessonCard[],
  draft: WorksheetDraft,
  options: WorksheetDocumentOptions = {}
) {
  if (draft.type === "bullseye") {
    return buildBullseyePreviewHtml(cards, draft);
  }

  return buildWorksheetDocumentHtml(cards, draft, options);
}

export function openWorksheetPrintWindow(html: string, popupMessage: string, onDone: () => void) {
  const windowRef = window.open("", "_blank");
  if (!windowRef) {
    alert(popupMessage);
    onDone();
    return;
  }

  try {
    windowRef.opener = null;
  } catch {
    // Ignore browsers that prevent overriding opener here.
  }

  windowRef.document.open();
  windowRef.document.write(html);
  windowRef.document.close();

  setTimeout(() => {
    try {
      windowRef.focus();
      windowRef.print();
    } finally {
      onDone();
    }
  }, 600);
}
