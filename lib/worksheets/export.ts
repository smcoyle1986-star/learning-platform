import { LessonCard } from "@/lib/lessons/types";
import { buildBullseyeSvg, createBullseyeSectorPath, generateBullseyeLayout } from "@/lib/worksheets/bullseye";
import { generateCrosswordLayout } from "@/lib/worksheets/crossword";
import { generateWordsearchLayout } from "@/lib/worksheets/wordsearch";
import { WorksheetDraft, formatWorksheetWord } from "@/lib/worksheets/types";

type WorksheetDocumentOptions = {
  showAnswers?: boolean;
  includeTeacherCopy?: boolean;
  previewMode?: boolean;
  interactivePreview?: boolean;
};

type CrosswordHtmlOptions = {
  showAnswers: boolean;
};

type WordsearchHtmlOptions = {
  previewMode?: boolean;
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

function createSeededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function shuffleArray<T>(items: T[], seed: number) {
  const random = createSeededRandom(seed);
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function normalizeQuestionBuilderPrompts(prompts: string[] | undefined, minimum = 8) {
  const next = Array.isArray(prompts) ? prompts.map((item) => String(item ?? "")) : [];
  while (next.length < minimum) {
    next.push("");
  }
  return next;
}

function pickQuestionBuilderCard(cards: LessonCard[], rowIndex: number, seed: number) {
  if (cards.length === 0) return null;
  const fallbackIndex = Math.abs((seed + rowIndex * 13) % cards.length);
  return cards[fallbackIndex] ?? null;
}

function buildRepeatedTraceText(text: string, repeats: number) {
  const value = formatWorksheetWord(text).trim();
  if (!value) return "";
  const count = Math.max(1, Math.min(3, repeats));
  return Array.from({ length: count }, () => value).join("   ");
}

function buildRepeatedTraceSegments(text: string, repeats: number) {
  const value = formatWorksheetWord(text).trim();
  if (!value) return [];
  const count = Math.max(1, Math.min(3, repeats));
  return Array.from({ length: count }, () => value);
}

type BattleshipPlacement = {
  id: string;
  length: number;
  color: string;
  cells: { row: number; col: number }[];
};

function generateBattleshipPlacements(rows: number, cols: number, seed: number) {
  const shipLengths = [5, 4, 3, 3, 2];
  const colors = ["#c4b5fd", "#93c5fd", "#86efac", "#f9a8d4", "#fdba74"];
  const blocked = Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
  const placements: BattleshipPlacement[] = [];

  const canOccupy = (cells: { row: number; col: number }[]) =>
    cells.every(({ row, col }) => row >= 0 && row < rows && col >= 0 && col < cols && !blocked[row][col]);

  const blockAround = (cells: { row: number; col: number }[]) => {
    cells.forEach(({ row, col }) => {
      for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
        for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
          const nextRow = row + rowOffset;
          const nextCol = col + colOffset;
          if (nextRow >= 0 && nextRow < rows && nextCol >= 0 && nextCol < cols) {
            blocked[nextRow][nextCol] = true;
          }
        }
      }
    });
  };

  shipLengths.forEach((length, index) => {
    const candidates: { cells: { row: number; col: number }[] }[] = [];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const horizontalCells = Array.from({ length }, (_, step) => ({ row, col: col + step }));
        const verticalCells = Array.from({ length }, (_, step) => ({ row: row + step, col }));

        if (col + length <= cols && canOccupy(horizontalCells)) {
          candidates.push({ cells: horizontalCells });
        }
        if (row + length <= rows && canOccupy(verticalCells)) {
          candidates.push({ cells: verticalCells });
        }
      }
    }

    const shuffledCandidates = shuffleArray(candidates, seed + index * 131 + length * 17);
    const chosen = shuffledCandidates[0];
    if (!chosen) return;

    placements.push({
      id: `ship-${index}`,
      length,
      color: colors[index % colors.length],
      cells: chosen.cells,
    });
    blockAround(chosen.cells);
  });

  const cellMap = new Map<string, BattleshipPlacement>();
  placements.forEach((placement) => {
    placement.cells.forEach((cell) => {
      cellMap.set(`${cell.row}:${cell.col}`, placement);
    });
  });

  return cellMap;
}

function resolveBoardImageSrc(card: LessonCard) {
  const raw = String(card.image ?? card.back ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("http") || raw.startsWith("data:")) return raw;
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

function buildTicTacToeGameHtml(cards: LessonCard[], draft: WorksheetDraft) {
  const boardCount = draft.ticTacToeBoardCount ?? 1;
  const imageMode = draft.ticTacToeImageMode ?? "both";
  const boardGap = boardCount === 8 ? 14 : boardCount === 4 ? 16 : boardCount === 2 ? 18 : 20;
  const palette = [
    "#fde2e4",
    "#e2ece9",
    "#e8e1f7",
    "#fff1c7",
    "#d8f3dc",
    "#cde7ff",
    "#f7d6e0",
    "#f3e8ff",
    "#d6f5f1",
    "#ffd6a5",
    "#fce1f6",
    "#dbeafe",
  ];
  const sourceCards = shuffleArray(cards.length ? cards : [{ id: "placeholder", word: "Word", image: "" } as LessonCard], draft.shuffleSeed);
  const boardIndices = Array.from({ length: boardCount }, (_, index) => index);

  const boards = boardIndices
    .map((boardIndex) => {
      const boardCards = Array.from({ length: 9 }, (_, cellIndex) => {
        const absoluteIndex = boardIndex * 9 + cellIndex;
        return sourceCards[absoluteIndex % sourceCards.length] ?? sourceCards[0];
      });

      const cells = boardCards
        .map((card, cellIndex) => {
          const imageSrc = resolveBoardImageSrc(card);
          const word = formatWorksheetWord(card.word);
          const fill = palette[(boardIndex * 9 + cellIndex) % palette.length];
          const imageMarkup =
            imageMode === "text"
              ? `<div class="ttt-text-only">${escapeHtml(word)}</div>`
              : `
                <div class="ttt-image-frame">
                  ${
                    imageSrc
                      ? `<img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(word)}" class="ttt-image" />`
                      : `<div class="ttt-placeholder">${escapeHtml(word || "Word")}</div>`
                  }
                </div>
                ${imageMode === "both" ? `<div class="ttt-label">${escapeHtml(word)}</div>` : ""}
              `;
          return `
            <div class="ttt-cell" style="background:${fill};">
              ${imageMarkup}
            </div>
          `;
        })
        .join("");

      return `
        <article class="ttt-board-wrap">
          <div class="ttt-board">
            ${cells}
          </div>
        </article>
      `;
    })
    .join("");

  return `
    <div class="worksheet-shell ttt-shell">
      <div class="worksheet-head ttt-head">
        <div class="worksheet-head-top ttt-head-top">
          <div class="worksheet-kicker">Classendo Worksheet</div>
          <div class="worksheet-name-line">Name: <span></span></div>
        </div>
        <h1 class="worksheet-title ttt-title">${escapeHtml(draft.title || "Tic-Tac-Toe")}</h1>
      </div>

      <div class="ttt-stage ttt-count-${boardCount}" style="--ttt-gap:${boardGap}px;">
        ${boards}
      </div>

      <div class="worksheet-footer ttt-footer">classendo.com</div>
    </div>
  `;
}

function buildBattleshipGameHtml(cards: LessonCard[], draft: WorksheetDraft) {
  const rows = 6;
  const cols = 9;
  const columnLabels = Array.from({ length: cols }, (_, index) => String.fromCharCode(97 + index));
  const imageMode = draft.battleshipImageMode ?? "image";
  const showShips = draft.battleshipBoardMode === "ships";
  const pageCount = showShips ? Math.max(1, Math.floor(Number(draft.battleshipWorksheetCount ?? 1)) || 1) : 1;
  const sourceCards = shuffleArray(
    cards.length ? cards : ([{ id: "placeholder", word: "Word", image: "" } as LessonCard]),
    draft.shuffleSeed
  );
  const repeatedCards = Array.from({ length: rows * cols }, (_, index) => sourceCards[index % sourceCards.length] ?? sourceCards[0]);
  const boardCards = shuffleArray(repeatedCards, draft.shuffleSeed + 29);

  const renderPage = (pageIndex: number) => {
    const pageSeed = draft.shuffleSeed + pageIndex * 97;
    const shipCells = showShips ? generateBattleshipPlacements(rows, cols, pageSeed) : new Map<string, BattleshipPlacement>();

    const rowMarkup = Array.from({ length: rows }, (_, rowIndex) => {
      const rowNumber = rowIndex + 1;
      const cells = Array.from({ length: cols }, (_, colIndex) => {
        const card = boardCards[rowIndex * cols + colIndex] ?? sourceCards[0];
        const imageSrc = resolveBoardImageSrc(card);
        const word = formatWorksheetWord(card.word);
        const shipCell = shipCells.get(`${rowIndex}:${colIndex}`);
        const imageMarkup =
          imageMode === "text"
            ? `<div class="battleship-text-only">${escapeHtml(word || "?")}</div>`
            : imageSrc
              ? `<img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(word || `Cell ${rowNumber}${columnLabels[colIndex]}`)}" class="battleship-image" />`
              : `<div class="battleship-placeholder">${escapeHtml(word || "?")}</div>`;
        const textMarkup =
          imageMode === "both"
            ? `<div class="battleship-label">${escapeHtml(word || `Cell ${rowNumber}${columnLabels[colIndex]}`)}</div>`
            : "";
        return `
          <div class="battleship-cell${shipCell ? " battleship-cell-ship" : ""}"${shipCell ? ` style="background:${shipCell.color};"` : ""}>
            ${imageMarkup}
            ${textMarkup}
          </div>
        `;
      }).join("");

      return `
        <div class="battleship-row">
          <div class="battleship-axis-label battleship-axis-row">${rowNumber}</div>
          ${cells}
        </div>
      `;
    }).join("");

    return `
      <section class="worksheet-page${pageIndex > 0 ? " worksheet-page-break" : ""}">
        <div class="worksheet-shell battleship-shell">
          <div class="worksheet-head battleship-head">
            <div class="worksheet-head-top battleship-head-top">
              <div class="worksheet-kicker">Classendo Worksheet</div>
              <div class="worksheet-name-line">Name: <span></span></div>
            </div>
            <h1 class="worksheet-title battleship-title">${escapeHtml(draft.title || "Battleship")}</h1>
            <p class="worksheet-instructions">${escapeHtml(draft.instructions || "Find the battleships to win.")}</p>
          </div>

          <div class="battleship-stage">
            <div class="battleship-board">
              <div class="battleship-axis-top">
                <div class="battleship-axis-corner"></div>
                ${columnLabels
                  .map((label) => `<div class="battleship-axis-label battleship-axis-col">${label}</div>`)
                  .join("")}
              </div>
              ${rowMarkup}
            </div>
          </div>

          <div class="worksheet-footer battleship-footer">classendo.com</div>
        </div>
      </section>
    `;
  };

  return Array.from({ length: pageCount }, (_, pageIndex) => renderPage(pageIndex)).join("");
}

function buildMatchingGameHtml(cards: LessonCard[], draft: WorksheetDraft, options: { interactivePreview: boolean }) {
  const pageCards = chunkArray(shuffleArray(cards, draft.shuffleSeed), 8);

  if (pageCards.length === 0) {
    return `
      <div class="worksheet-shell matching-shell">
        <div class="worksheet-head matching-head">
          <div class="worksheet-head-top matching-head-top">
            <div class="worksheet-kicker">Classendo Worksheet</div>
            <div class="worksheet-name-line">Name: <span></span></div>
          </div>
          <h1 class="worksheet-title matching-title">${escapeHtml(draft.title || "Matching")}</h1>
          <p class="worksheet-instructions">${escapeHtml(draft.instructions || "Draw a line from each picture to the matching word.")}</p>
        </div>
        <div class="matching-empty">No cards available for matching.</div>
        <div class="worksheet-footer matching-footer">classendo.com</div>
      </div>
    `;
  }

  const renderPage = (page: typeof pageCards[number], pageIndex: number) => {
    const leftCards = shuffleArray(page, draft.shuffleSeed + pageIndex * 41 + 7);
    const rightCards = shuffleArray(page, draft.shuffleSeed + pageIndex * 41 + 19);

    const leftMarkup = leftCards
      .map((card, index) => {
        const imageSrc = resolveBoardImageSrc(card);
        const label = formatWorksheetWord(card.word);
        const number = index + 1;
        const staggerClass = index % 2 === 0 ? "matching-image-stagger-a" : "matching-image-stagger-b";
        return `
          <div class="matching-item matching-image-item ${staggerClass}">
            <div class="matching-badge">${number}</div>
            ${
              imageSrc
                ? `<img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(label)}" class="matching-image" />`
                : `<div class="matching-image-placeholder">${escapeHtml(label)}</div>`
            }
          </div>
        `;
      })
      .join("");

    const rightMarkup = rightCards
      .map((card, index) => {
        const label = formatWorksheetWord(card.word);
        const letter = String.fromCharCode(65 + index);
        return `
          <div class="matching-item matching-word-item">
            <div class="matching-badge matching-badge-word">${letter}</div>
            <div class="matching-word-label">${escapeHtml(label)}</div>
          </div>
        `;
      })
      .join("");

    return `
      <section class="matching-page ${pageIndex === 0 ? "is-active" : ""}" data-page-index="${pageIndex}" aria-hidden="${pageIndex === 0 ? "false" : "true"}">
        <div class="matching-page-inner">
          <div class="matching-columns">
            <div class="matching-column">
              <div class="matching-column-list">${leftMarkup}</div>
            </div>
            <div class="matching-column">
              <div class="matching-column-list">${rightMarkup}</div>
            </div>
          </div>
        </div>
      </section>
    `;
  };

  const renderShell = (body: string) => `
    <div class="worksheet-shell matching-shell">
      <div class="worksheet-head matching-head">
        <div class="worksheet-head-top matching-head-top">
          <div class="worksheet-kicker">Classendo Worksheet</div>
          <div class="worksheet-name-line">Name: <span></span></div>
        </div>
        <h1 class="worksheet-title matching-title">${escapeHtml(draft.title || "Matching")}</h1>
        <p class="worksheet-instructions">${escapeHtml(draft.instructions || "Draw a line from each picture to the matching word.")}</p>
      </div>
      ${body}
      <div class="worksheet-footer matching-footer">classendo.com</div>
    </div>
  `;

  if (!options.interactivePreview) {
    return pageCards
      .map((page, pageIndex) => `
        <section class="worksheet-page ${pageIndex > 0 ? "worksheet-page-break" : ""}">
          ${renderShell(`
            <div class="matching-stage">
              <div class="matching-carousel is-print">
                ${renderPage(page, pageIndex)}
              </div>
            </div>
          `)}
        </section>
      `)
      .join("");
  }

  const pageMarkup = pageCards.map((page, pageIndex) => renderPage(page, pageIndex)).join("");

  const controls =
    pageCards.length > 1
      ? `
        <button class="matching-nav matching-nav-prev" type="button" aria-label="Previous page">‹</button>
        <button class="matching-nav matching-nav-next" type="button" aria-label="Next page">›</button>
        <script>
          (() => {
            const root = document.querySelector(".matching-shell");
            if (!root) return;
            const pages = Array.from(root.querySelectorAll(".matching-page"));
            const prev = root.querySelector(".matching-nav-prev");
            const next = root.querySelector(".matching-nav-next");
            let active = 0;

            const update = () => {
              pages.forEach((page, index) => {
                const isActive = index === active;
                page.classList.toggle("is-active", isActive);
                page.setAttribute("aria-hidden", String(!isActive));
              });
              if (prev) prev.disabled = active === 0;
              if (next) next.disabled = active === pages.length - 1;
            };

            prev?.addEventListener("click", () => {
              active = Math.max(0, active - 1);
              update();
            });
            next?.addEventListener("click", () => {
              active = Math.min(pages.length - 1, active + 1);
              update();
            });

            update();
          })();
        </script>
      `
      : "";

  return `
    <section class="worksheet-page">
      ${renderShell(`
        <div class="matching-stage">
          <div class="matching-carousel is-interactive">
            ${pageMarkup}
            ${controls}
          </div>
        </div>
      `)}
    </section>
  `;
}

function buildWordsearchHtml(cards: LessonCard[], draft: WorksheetDraft, options: WordsearchHtmlOptions = {}) {
  const layout = generateWordsearchLayout(cards, draft.difficulty, draft.shuffleSeed, {
    fillRandomLetters: Boolean(draft.wordsearchAddRandomLetters),
  });
  const title = draft.title?.trim() || "Wordsearch";
  const listMode = draft.wordsearchListMode ?? "both";
  const previewMode = Boolean(options.previewMode);
  const visibleWords = layout.placements;
  const clueColumns = Math.min(6, Math.max(4, Math.ceil(Math.max(visibleWords.length, 1) / 2)));
  const clueRows = Math.ceil(Math.max(visibleWords.length, 1) / clueColumns);
  const palette = [
    "#fde2e4",
    "#e2ece9",
    "#e8e1f7",
    "#fff1c7",
    "#d8f3dc",
    "#cde7ff",
    "#f7d6e0",
    "#f3e8ff",
    "#d6f5f1",
    "#ffd6a5",
    "#fce1f6",
    "#dbeafe",
  ];
  const highlightedCells = new Map<string, number>();
  if (previewMode) {
    layout.placements.forEach((placement, placementIndex) => {
      for (let offset = 0; offset < placement.length; offset += 1) {
        const row = placement.row + placement.direction.dr * offset;
        const col = placement.col + placement.direction.dc * offset;
        highlightedCells.set(`${row}:${col}`, placementIndex);
      }
    });
  }

  const wordList = visibleWords
    .map((entry, index) => {
      const imageSrc = resolveBoardImageSrc(entry.card);
      const word = formatWorksheetWord(entry.word);
      const image = imageSrc
        ? `<div class="clue-image-wrap"><img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(word)}" class="clue-image" /></div>`
        : "";
      const text = `<div class="clue-word">${escapeHtml(word)}</div>`;
      const content = listMode === "image" ? image || text : listMode === "text" ? text : `${image}${text}`;

      return `
        <div class="clue-card wordsearch-clue-card">
          <div class="clue-number-badge">${index + 1}</div>
          ${content}
        </div>
      `;
    })
    .join("");

  const gridMarkup = layout.grid
    .map((row, rowIndex) =>
      row
        .map((letter, colIndex) => {
          const placementIndex = highlightedCells.get(`${rowIndex}:${colIndex}`);
          const highlight = previewMode && placementIndex !== undefined
            ? ` class="wordsearch-cell wordsearch-cell-answer" style="background:${palette[placementIndex % palette.length]};"`
            : ` class="wordsearch-cell"`;
          const letterMarkup = letter ? `<span class="wordsearch-letter">${escapeHtml(letter)}</span>` : "";
          return `
            <div${highlight}>
              ${letterMarkup}
            </div>
          `;
        })
        .join("")
    )
    .join("");

  return `
    <div class="worksheet-shell wordsearch-shell">
      <div class="worksheet-head wordsearch-head">
        <div class="worksheet-head-top wordsearch-head-top">
          <div class="worksheet-kicker">Classendo Worksheet</div>
          <div class="worksheet-name-line">Name: <span></span></div>
        </div>
        <h1 class="worksheet-title wordsearch-title">${escapeHtml(title)}</h1>
        <p class="worksheet-instructions wordsearch-instructions">${escapeHtml(draft.instructions || "Find the hidden lesson words in the grid below.")}</p>
      </div>

      <div class="wordsearch-stage">
        <div class="wordsearch-grid-wrap">
          <div class="wordsearch-grid" style="--wordsearch-columns:${layout.gridSize}; --wordsearch-rows:${layout.gridSize};">
            ${gridMarkup}
          </div>
        </div>

        <div class="wordsearch-list-section">
          <div class="wordsearch-list-grid" style="--wordsearch-columns:${clueColumns}; --wordsearch-rows:${clueRows};">
            ${wordList}
          </div>
        </div>
      </div>

      <div class="worksheet-footer wordsearch-footer">classendo.com</div>
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

  const crosswordTitle = draft.title.replace(/\s*worksheet\s*$/i, "").trim() || "Crossword";
  const cellSize = Math.min(getGridCellSize(layout.width) + 10, 56);
  const singleClueRow = layout.entries.length <= 8;
  const clueColumns = Math.min(6, Math.max(4, Math.ceil(layout.entries.length / 2)));
  const clueRows = Math.ceil(layout.entries.length / clueColumns);

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
        <h1 class="worksheet-title crossword-title">${escapeHtml(crosswordTitle)}</h1>
        <p class="worksheet-instructions">${escapeHtml(draft.instructions)}</p>
      </div>
      <div class="crossword-stage ${singleClueRow ? "crossword-stage-large" : ""}">
        <div class="crossword-panel" style="--cw-cell-size:${cellSize}px;">${gridRows.join("")}</div>
      </div>
      <div class="clue-section ${singleClueRow ? "clue-section-compact" : ""}">
        <div class="clue-grid" style="--clue-columns:${clueColumns}; --clue-rows:${clueRows};">${clueCards}</div>
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

function buildQuestionBuilderHtml(
  cards: LessonCard[],
  draft: WorksheetDraft,
  mode: "questions" | "reading" | "scramble" | "writing" = "questions"
) {
  const rowsPerPage = mode === "writing" ? 6 : 8;
  const sourceLines =
    mode === "reading"
      ? draft.readingLines
      : mode === "scramble"
        ? draft.sentenceScrambleLines
        : mode === "writing"
          ? draft.writingLines
          : draft.questionBuilderPrompts;
  const totalRows = Math.max(sourceLines?.length ?? 0, cards.length, rowsPerPage);
  const prompts = normalizeQuestionBuilderPrompts(sourceLines, totalRows);
  const pages = chunkArray(Array.from({ length: totalRows }, (_, index) => index), rowsPerPage);
  const title =
    draft.title?.trim() ||
    (mode === "reading"
      ? "Reading Worksheet"
      : mode === "scramble"
        ? "Sentence Scramble"
        : mode === "writing"
          ? "Writing"
        : "Question Builder");
  const instructions =
    draft.instructions?.trim() ||
    (mode === "reading"
      ? "Read each sentence and copy it for handwriting practice."
      : mode === "scramble"
        ? "Write each sentence, then use the scramble controls to mix up the words."
        : mode === "writing"
          ? "Trace the words and practice handwriting."
        : "Type your own questions directly into the worksheet.");

  const renderPage = (pageRowIndexes: number[], pageIndex: number) => {
    const rows = pageRowIndexes
      .map((rowIndex) => {
        const rowNumber = rowIndex + 1;
        const prompt = prompts[rowIndex] ?? "";
        const card = cards[rowIndex] ?? pickQuestionBuilderCard(cards, rowIndex, draft.shuffleSeed);
        const value = prompt.trim();
        const imageSrc = card ? resolveBoardImageSrc(card) : "";
        const label = formatWorksheetWord(card?.word ?? "");
        const displayValue = value || (mode === "reading" || mode === "writing" ? label : "");
        const imageMarkup = imageSrc
          ? `<img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(label || `Question ${rowNumber}`)}" class="${mode === "writing" ? "writing-image" : "question-image"}" />`
          : `<div class="${mode === "writing" ? "writing-image-placeholder" : "question-image-placeholder"}">${escapeHtml(label || `Question ${rowNumber}`)}</div>`;

        if (mode === "writing") {
          const listMode = draft.writingImageMode === "image" ? "image" : "both";
          const writingTraceable = Boolean(draft.writingTraceable);
          const showImage = true;
          const showTextCue = listMode === "both";
          const hasWritingLine = listMode === "both";
          const displayWord = hasWritingLine ? displayValue || label : "";
          const traceSegments = hasWritingLine ? buildRepeatedTraceSegments(displayWord || label, draft.writingTraceRepeats ?? 1) : [];
          return `
            <div class="writing-row">
              <div class="question-number-badge">${rowNumber}</div>
              <div class="writing-cue-wrap">
                <div class="writing-cue-card ${listMode === "both" ? "is-both" : ""}">
                  ${showImage ? imageMarkup : ""}
                  ${showTextCue ? `<div class="writing-cue-text">${escapeHtml(label || `Word ${rowNumber}`)}</div>` : ""}
                </div>
              </div>
              <div class="writing-guide">
                <div class="writing-guide-line writing-guide-line-top"></div>
                <div class="writing-guide-line writing-guide-line-mid"></div>
                <div class="writing-guide-line writing-guide-line-bottom"></div>
                ${hasWritingLine ? `
                  ${writingTraceable ? `<div class="writing-trace-layer ${traceSegments.length > 1 ? "is-repeat" : ""}">${traceSegments.map((segment) => `<span>${escapeHtml(segment)}</span>`).join("")}</div>` : ""}
                  <div class="writing-entry-line${writingTraceable ? " is-traceable" : ""}">${escapeHtml(displayWord)}</div>
                ` : ""}
              </div>
            </div>
          `;
        }

        return `
          <div class="question-row">
            <div class="question-number-badge">${rowNumber}</div>
            <div class="question-image-wrap">
              ${imageMarkup}
            </div>
            <div class="question-entry">
              <div class="question-entry-line">${escapeHtml(displayValue)}</div>
            </div>
          </div>
        `;
      })
      .join("");

    return `
      <section class="worksheet-page${pageIndex > 0 ? " worksheet-page-break" : ""}">
        <div class="worksheet-shell question-shell">
          <div class="worksheet-head question-head">
            <div class="worksheet-head-top question-head-top">
              <div class="worksheet-kicker">Classendo Worksheet</div>
              <div class="worksheet-name-line">Name: <span></span></div>
            </div>
            <h1 class="worksheet-title question-title">${escapeHtml(title)}</h1>
            <p class="worksheet-instructions">${escapeHtml(instructions)}</p>
          </div>

          <div class="question-stage">
            <div class="question-list">
              ${rows}
            </div>
          </div>

          <div class="worksheet-footer question-footer">classendo.com</div>
        </div>
      </section>
    `;
  };

  return pages.map((page, pageIndex) => renderPage(page, pageIndex)).join("");
}

function buildWorksheetContentHtml(cards: LessonCard[], draft: WorksheetDraft, options: WorksheetDocumentOptions) {
  if (draft.type === "questions") {
    return buildQuestionBuilderHtml(cards, draft);
  }

  if (draft.type === "reading") {
    return buildQuestionBuilderHtml(cards, draft, "reading");
  }

  if (draft.type === "writing") {
    return buildQuestionBuilderHtml(cards, draft, "writing");
  }

  if (draft.type === "sentence-scramble") {
    return buildQuestionBuilderHtml(cards, draft, "scramble");
  }

  if (draft.type === "bullseye") {
    return `<section class="worksheet-page">${buildBullseyeGameHtml(cards, draft)}</section>`;
  }

  if (draft.type === "tic-tac-toe") {
    return `<section class="worksheet-page">${buildTicTacToeGameHtml(cards, draft)}</section>`;
  }

  if (draft.type === "battleship") {
    return buildBattleshipGameHtml(cards, draft);
  }

  if (draft.type === "matching") {
    return buildMatchingGameHtml(cards, draft, {
      interactivePreview: Boolean(options.interactivePreview),
    });
  }

  if (draft.type === "wordsearch") {
    return `<section class="worksheet-page">${buildWordsearchHtml(cards, draft, { previewMode: Boolean(options.previewMode) })}</section>`;
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
  const bodyClass = [
    options.previewMode ? "worksheet-preview-body" : "",
    options.previewMode && draft.type === "battleship" ? "battleship-preview-body" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const isLandscapeBoard = draft.type === "bullseye" || draft.type === "tic-tac-toe" || draft.type === "battleship";
  const pageWidth = isLandscapeBoard ? "297mm" : "210mm";
  const pageHeight = isLandscapeBoard ? "210mm" : "297mm";
  const pageSize = isLandscapeBoard ? "A4 landscape" : "A4 portrait";

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
          .ttt-shell {
            padding: 4px 8px 2px;
          }
          .ttt-head {
            min-height: 12mm;
            padding-top: 1px;
          }
          .ttt-head-top {
            align-items: center;
          }
          .ttt-title {
            font-size: 28px;
            color: #1d4ed8;
            text-shadow: none;
            margin-top: 0;
          }
          .ttt-stage {
            position: relative;
            flex: 1 1 auto;
            min-height: 0;
            display: grid;
            gap: var(--ttt-gap, 14px);
            margin: 0;
            padding: 1mm 0 0;
            align-content: center;
            justify-content: center;
          }
          .ttt-count-1 {
            grid-template-columns: minmax(0, 1fr);
            grid-template-rows: minmax(0, 1fr);
          }
          .ttt-count-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            grid-template-rows: minmax(0, 1fr);
          }
          .ttt-count-4 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            grid-template-rows: repeat(2, minmax(0, 1fr));
          }
          .ttt-count-8 {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            grid-template-rows: repeat(2, minmax(0, 1fr));
          }
          .ttt-board-wrap {
            min-width: 0;
            min-height: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .ttt-board {
            width: 100%;
            height: 100%;
            aspect-ratio: 1 / 1;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            grid-template-rows: repeat(3, minmax(0, 1fr));
            gap: 3px;
            padding: 3px;
            background: #1d4ed8;
            border-radius: 14px;
            box-shadow:
              inset 0 0 0 1px rgba(255, 255, 255, 0.4),
              0 10px 24px rgba(15, 23, 42, 0.06);
          }
          .ttt-cell {
            border-radius: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            text-align: center;
            padding: 3px;
            overflow: hidden;
            color: #0f172a;
          }
          .ttt-image-frame {
            flex: 1 1 auto;
            min-height: 0;
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .ttt-image {
            object-fit: contain;
            display: block;
            max-width: 100%;
            max-height: 100%;
            width: 100%;
            height: 100%;
          }
          .ttt-label,
          .ttt-text-only,
          .ttt-placeholder {
            font-size: 10px;
            line-height: 1.1;
            font-weight: 800;
            max-width: 100%;
            word-break: break-word;
          }
          .ttt-text-only {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 0;
            padding: 0 6px;
            width: 100%;
            height: 100%;
          }
          .ttt-placeholder {
            color: #475569;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            padding: 0 4px;
          }
          .ttt-footer {
            margin-top: 0;
            padding-top: 0;
            letter-spacing: 0.22em;
          }
          .battleship-shell {
            padding: 4px 8px 2px;
          }
          .battleship-head {
            min-height: 12mm;
            padding-top: 1px;
          }
          .battleship-head-top {
            align-items: center;
          }
          .battleship-title {
            font-size: 28px;
            color: #1d4ed8;
            text-shadow: none;
            margin-top: 0;
          }
          .battleship-stage {
            position: relative;
            flex: 1 1 auto;
            min-height: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1mm 0 0;
          }
          .battleship-board {
            width: auto;
            height: 100%;
            aspect-ratio: 10 / 7;
            max-width: 100%;
            display: flex;
            flex-direction: column;
            border: 2px solid #1d4ed8;
            border-radius: 14px;
            overflow: hidden;
            background: #ffffff;
            box-shadow:
              inset 0 0 0 1px rgba(255, 255, 255, 0.45),
              0 10px 24px rgba(15, 23, 42, 0.04);
          }
          .battleship-axis-top,
          .battleship-row {
            display: grid;
            grid-template-columns: 42px repeat(9, minmax(0, 1fr));
          }
          .battleship-axis-top {
            min-height: 34px;
          }
          .battleship-row {
            flex: 1 1 0;
            min-height: 0;
          }
          .battleship-axis-corner,
          .battleship-axis-label,
          .battleship-cell {
            border-right: 2px solid #1d4ed8;
            border-bottom: 2px solid #1d4ed8;
          }
          .battleship-axis-corner {
            background: #ffffff;
          }
          .battleship-axis-label {
            display: flex;
            align-items: center;
            justify-content: center;
            color: #1d4ed8;
            font-size: 12px;
            font-weight: 900;
            letter-spacing: 0.08em;
            background: #ffffff;
          }
          .battleship-axis-row {
            font-size: 13px;
          }
          .battleship-cell {
            min-width: 0;
            min-height: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            background: #ffffff;
            overflow: hidden;
            padding: 2px;
          }
          .battleship-cell-ship {
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
          }
          .battleship-image {
            width: 100%;
            height: 100%;
            max-width: 96%;
            max-height: 96%;
            object-fit: contain;
            display: block;
          }
          .battleship-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: 900;
            color: #93c5fd;
          }
          .battleship-text-only {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-size: 12px;
            font-weight: 900;
            line-height: 1.1;
            color: #0f172a;
            padding: 0 2px;
            word-break: break-word;
          }
          .battleship-label {
            width: 100%;
            text-align: center;
            font-size: 11px;
            font-weight: 900;
            line-height: 1.1;
            color: #1d4ed8;
            word-break: break-word;
          }
          .battleship-footer {
            margin-top: 0;
            padding-top: 0;
            letter-spacing: 0.22em;
          }
          .wordsearch-shell {
            padding: 4px 8px 2px;
          }
          .wordsearch-head {
            min-height: 12mm;
            padding-top: 1px;
          }
          .wordsearch-head-top {
            align-items: center;
          }
          .wordsearch-title {
            font-size: 28px;
            color: #1d4ed8;
            text-shadow: none;
            margin-top: 0;
          }
          .wordsearch-stage {
            flex: 1 1 auto;
            min-height: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 6px;
            padding: 1mm 0 0;
          }
          .wordsearch-grid-wrap {
            flex: 1 1 auto;
            min-height: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .wordsearch-grid {
            width: min(100%, 170mm);
            aspect-ratio: 1 / 1;
            display: grid;
            grid-template-columns: repeat(var(--wordsearch-columns, 12), minmax(0, 1fr));
            grid-template-rows: repeat(var(--wordsearch-rows, 12), minmax(0, 1fr));
            gap: 1px;
            padding: 3px;
            border-radius: 18px;
            background: linear-gradient(135deg, #dbeafe, #f8fafc);
            box-shadow:
              inset 0 0 0 1px rgba(29, 78, 216, 0.14),
              0 10px 24px rgba(15, 23, 42, 0.06);
          }
          .wordsearch-cell {
            background: rgba(255, 255, 255, 0.96);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #0f172a;
            font-weight: 900;
            font-size: 10px;
            line-height: 1;
            letter-spacing: 0.04em;
            transition: background-color 0.2s ease;
          }
          .wordsearch-cell-answer {
            box-shadow: inset 0 0 0 1px rgba(29, 78, 216, 0.12);
          }
          .wordsearch-letter {
            display: block;
            transform: translateY(0.5px);
          }
          .wordsearch-list-section {
            flex: 0 0 auto;
          }
          .wordsearch-list-grid {
            display: grid;
            grid-template-columns: repeat(var(--wordsearch-columns, 4), minmax(0, 1fr));
            grid-template-rows: repeat(var(--wordsearch-rows, 2), minmax(0, 1fr));
            gap: 4px;
          }
          .wordsearch-footer {
            margin-top: 0;
            padding-top: 0;
            letter-spacing: 0.22em;
          }
          .question-shell {
            gap: 6px;
            padding: 10px 12px 8px;
          }
          .question-head {
            min-height: 44px;
            padding-top: 0;
          }
          .question-title {
            color: #1d4ed8;
            text-shadow: none;
            margin-bottom: 0;
          }
          .question-stage {
            flex: 1 1 auto;
            min-height: 0;
            display: flex;
            align-items: stretch;
            justify-content: stretch;
            width: 100%;
            padding: 3mm 1mm 2mm;
            box-sizing: border-box;
          }
          .question-list {
            width: 100%;
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
          }
          .question-row {
            display: grid;
            grid-template-columns: 20px 76px minmax(0, 1fr);
            gap: 10px;
            align-items: start;
            min-height: 96px;
          }
          .question-number-badge {
            width: 20px;
            height: 20px;
            border-radius: 999px;
            background: #1d4ed8;
            color: white;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            font-weight: 800;
            flex-shrink: 0;
            margin-top: 3px;
          }
          .question-image-wrap {
            width: 76px;
            height: 76px;
            border-radius: 14px;
            overflow: hidden;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-top: 4px;
          }
          .question-image {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
          }
          .question-image-placeholder {
            width: 100%;
            height: 100%;
            font-size: 10px;
            font-weight: 700;
            line-height: 1.1;
            color: #94a3b8;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            padding: 4px;
          }
          .question-entry {
            min-height: 64px;
            border-bottom: 1px solid #dbe4f0;
            padding: 2px 0 10px;
            display: flex;
            align-items: flex-start;
          }
          .question-entry-line {
            min-height: 48px;
            font-size: 14px;
            font-weight: 700;
            line-height: 1.25;
            letter-spacing: -0.01em;
            color: #1f2937;
            white-space: pre-wrap;
            word-break: break-word;
          }
          .question-entry-line:empty::before {
            content: "Type your question here";
            color: #94a3b8;
            font-weight: 600;
          }
          .writing-row {
            display: grid;
            grid-template-columns: 20px 132px minmax(0, 1fr);
            gap: 14px;
            align-items: start;
            min-height: 132px;
          }
          .writing-cue-wrap {
            width: 132px;
            min-height: 128px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-top: 2px;
          }
          .writing-cue-card {
            width: 100%;
            min-height: 128px;
            border-radius: 18px;
            background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
            border: 1px solid #dbe4f0;
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.8);
            padding: 10px 8px 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 6px;
            overflow: hidden;
          }
          .writing-image {
            width: 100%;
            height: 90px;
            object-fit: contain;
            display: block;
          }
          .writing-image-placeholder {
            width: 100%;
            min-height: 90px;
            display: flex;
            align-items: center;
            justify-content: center;
            text-align: center;
            font-size: 12px;
            font-weight: 800;
            color: #94a3b8;
            line-height: 1.1;
            padding: 4px;
          }
          .writing-cue-text {
            width: 100%;
            text-align: center;
            font-size: 15px;
            line-height: 1.15;
            font-weight: 900;
            color: #111827;
            word-break: break-word;
          }
          .writing-guide {
            position: relative;
            min-height: 132px;
            padding: 4px 0 4px;
          }
          .writing-guide-empty {
            min-height: 132px;
          }
          .writing-trace-layer {
            position: absolute;
            left: 0;
            right: 0;
            top: 70px;
            transform: translateY(-50%);
            font-weight: 400;
            font-style: normal;
            line-height: 1.1;
            letter-spacing: 0;
            color: rgba(29, 78, 216, 0.12);
            font-family: "Comic Sans MS", "Comic Sans", sans-serif;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            gap: 28px;
            width: auto;
            max-width: 84%;
            margin: 0;
            padding: 0 4px 0 0;
            pointer-events: none;
            user-select: none;
          }
          .writing-trace-layer span {
            font-size: 32px;
            font-weight: 400;
            font-style: normal;
            white-space: nowrap;
            line-height: 1;
            flex: 0 0 auto;
          }
          .writing-guide-line {
            position: absolute;
            left: 0;
            right: 0;
            height: 2px;
            border-radius: 999px;
            background: rgba(17, 24, 39, 0.9);
          }
          .writing-guide-line-top {
            top: 50px;
          }
          .writing-guide-line-mid {
            top: 66px;
            height: 1px;
            background:
              repeating-linear-gradient(
                to right,
                rgba(148, 163, 184, 0.44) 0 2px,
                transparent 2px 6px
              );
          }
          .writing-guide-line-bottom {
            top: 82px;
          }
          .writing-entry-line {
            position: relative;
            z-index: 1;
            min-height: 132px;
            font-size: 20px;
            font-weight: 900;
            line-height: 1.1;
            letter-spacing: 0.005em;
            color: #1f2937;
            white-space: pre-wrap;
            word-break: break-word;
            padding-top: 10px;
            padding-bottom: 10px;
          }
          .writing-entry-line.is-traceable {
            color: transparent;
            text-shadow: none;
          }
          .writing-entry-line:empty::before {
            content: "Trace the word here";
            color: #94a3b8;
            font-weight: 600;
          }
          .question-footer {
            margin-top: 0;
          }
          .worksheet-preview-body {
            padding: 28px;
          }
          .battleship-preview-body {
            overflow-y: auto;
            scroll-snap-type: y mandatory;
          }
          .battleship-preview-body .worksheet-page {
            scroll-snap-align: start;
            scroll-snap-stop: always;
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
            gap: 2px;
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
          .crossword-title {
            color: #1d4ed8;
            text-shadow: none;
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
            padding: 4mm 0 2mm;
          }
          .crossword-panel {
            display: flex;
            flex-direction: column;
            gap: 0;
            width: fit-content;
            max-width: 100%;
            padding: 10px;
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
            font-size: 10px;
            color: #64748b;
          }
          .cw-letter {
            font-size: calc(var(--cw-cell-size) * 0.48);
            font-weight: 700;
            color: #1e3a8a;
          }
          .clue-section-title {
            display: none;
          }
          .clue-grid {
            display: grid;
            grid-template-columns: repeat(var(--clue-columns), minmax(0, 1fr));
            gap: 7px;
            width: 100%;
            grid-auto-rows: minmax(72px, auto);
          }
          .clue-card {
            display: flex;
            flex-direction: column;
            gap: 2px;
            align-items: center;
            justify-content: center;
            padding: 0;
            break-inside: avoid;
            min-height: 72px;
          }
          .clue-number-badge {
            width: 22px;
            height: 22px;
            border-radius: 999px;
            background: #0f172a;
            color: white;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
            flex-shrink: 0;
            box-shadow: none;
          }
          .clue-image-wrap {
            width: 80px;
            height: 80px;
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
            font-size: 12px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
            word-break: break-word;
            max-width: 100%;
            color: #1f2937;
            letter-spacing: -0.01em;
          }
          .clue-section {
            flex: 0 0 auto;
            min-height: 0;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: 6px;
            margin-top: auto;
            padding-top: 2mm;
            padding-bottom: 1mm;
          }
          .clue-section-compact {
            flex-basis: auto;
            min-height: 0;
          }
          .worksheet-footer {
            text-align: center;
            font-size: 9px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.16em;
            margin-top: 6px;
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
          .matching-shell {
            gap: 6px;
            padding: 10px 12px 6px;
          }
          .matching-head {
            min-height: 40px;
            padding-top: 0;
          }
          .matching-title {
            margin-bottom: 2px;
          }
          .matching-stage {
            flex: 1 1 auto;
            min-height: 0;
            display: flex;
            align-items: stretch;
            justify-content: stretch;
            width: 100%;
            padding: 2mm 0 0.5mm;
            position: relative;
          }
          .matching-carousel {
            position: relative;
            width: 100%;
            height: 100%;
            min-height: 0;
          }
          .matching-carousel.is-interactive {
            overflow: hidden;
          }
          .matching-carousel.is-print {
            overflow: visible;
          }
          .matching-page {
            width: 100%;
            height: 100%;
            box-sizing: border-box;
          }
          .matching-carousel.is-interactive .matching-page {
            position: absolute;
            inset: 0;
            opacity: 0;
            pointer-events: none;
            transform: translateX(18px);
            transition: opacity 180ms ease, transform 180ms ease;
          }
          .matching-carousel.is-interactive .matching-page.is-active {
            opacity: 1;
            pointer-events: auto;
            transform: translateX(0);
          }
          .matching-page-inner {
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            gap: 5px;
            min-height: 0;
          }
          .matching-columns {
            flex: 1 1 auto;
            min-height: 0;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 38px;
          }
          .matching-column {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 0;
          }
          .matching-column:last-child {
            padding-left: 24px;
          }
          .matching-column-list {
            flex: 1 1 auto;
            min-height: 0;
            display: grid;
            grid-template-columns: 1fr;
            gap: 2px;
          }
          .matching-item {
            display: grid;
            grid-template-columns: 20px minmax(0, 1fr);
            gap: 8px;
            align-items: start;
            min-height: 48px;
          }
          .matching-image-stagger-a {
            transform: translateY(2px);
          }
          .matching-image-stagger-b {
            transform: translateY(12px);
          }
          .matching-image-item {
            align-items: center;
          }
          .matching-word-item {
            grid-template-columns: 20px minmax(0, 1fr);
            align-items: start;
          }
          .matching-badge {
            width: 20px;
            height: 20px;
            border-radius: 999px;
            background: #1d4ed8;
            color: white;
            font-size: 9px;
            font-weight: 800;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            margin-top: 2px;
            align-self: start;
          }
          .matching-badge-word {
            background: #0f172a;
            margin-top: 4px;
          }
          .matching-image-frame {
            display: none;
          }
          .matching-image {
            width: 100%;
            max-height: 92px;
            object-fit: contain;
            display: block;
          }
          .matching-image-placeholder {
            color: #1d4ed8;
            font-size: 18px;
            font-weight: 800;
            line-height: 1.1;
            text-align: left;
            padding-left: 6px;
          }
          .matching-word-label {
            min-height: 48px;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            padding: 2px 0 0 34px;
            text-align: left;
            font-size: 13px;
            font-weight: 800;
            color: #1f2937;
            letter-spacing: -0.01em;
            line-height: 1.15;
            word-break: break-word;
          }
          .matching-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 46px;
            height: 46px;
            border-radius: 999px;
            border: 1px solid rgba(255, 255, 255, 0.92);
            background: rgba(255, 255, 255, 0.9);
            color: #0f172a;
            font-size: 32px;
            line-height: 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.16);
            opacity: 0;
            transition: opacity 160ms ease, transform 160ms ease;
            z-index: 5;
            cursor: pointer;
          }
          .matching-carousel:hover .matching-nav,
          .matching-carousel:focus-within .matching-nav {
            opacity: 1;
          }
          .matching-nav:hover {
            transform: translateY(-50%) scale(1.04);
          }
          .matching-nav:disabled {
            opacity: 0.2 !important;
            cursor: default;
          }
          .matching-nav-prev {
            left: 14px;
          }
          .matching-nav-next {
            right: 14px;
          }
          .matching-carousel.is-print .matching-page {
            position: static;
            opacity: 1;
            pointer-events: auto;
            transform: none;
            transition: none;
          }
          .matching-empty {
            flex: 1 1 auto;
            min-height: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px dashed #cbd5e1;
            border-radius: 24px;
            color: #64748b;
            background: rgba(255, 255, 255, 0.75);
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
            .matching-nav {
              width: 40px;
              height: 40px;
              font-size: 28px;
            }
          }
          @media screen and (max-width: 620px) {
            .matching-columns {
              grid-template-columns: 1fr;
            }
          }
          @media print {
            .matching-nav {
              display: none !important;
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
    previewMode: false,
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
