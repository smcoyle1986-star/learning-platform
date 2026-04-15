import { PrintableBuildOptions } from "@/lib/printables/types";

export function getPrintableHeaderHtml(from: string) {
  const returnUrl = from === "dashboard" ? "/dashboard" : "/flashcards";
  const returnText = from === "dashboard" ? "Return to Dashboard" : "Return to Flashcards";
  return `
    <div style="font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; padding:12px 24px; display:flex; align-items:center; justify-content:space-between;">
      <div style="font-weight:800; color:#2563eb; font-size:28px;">Classendo</div>
      <div style="font-size:18px; font-weight:700;">Printables</div>
      <div><a href="${returnUrl}" style="color:#166534; text-decoration:none; font-weight:600;">${returnText}</a></div>
    </div>
  `;
}

export function buildPrintableHtml(opts: PrintableBuildOptions) {
  const { pages, contentOption, inkSaving, siteHeaderHtml } = opts;

  const style = `
    <style>
      @page { margin: 0.75in; }
      body { font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; margin:0; padding:0; color:#111827; }
      .print-page { page-break-after: always; break-after: page; margin: 0 auto; width: 100%; box-sizing: border-box; padding: 18px; }
      .page-grid { display: grid; gap: 18px; }
      .card { border: 1px solid ${inkSaving ? "rgba(0,0,0,0.12)" : "#e5e7eb"}; border-radius:12px; padding:12px; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; }
      .card img { width:100%; height:auto; object-fit:cover; border-radius:8px; display:block; }
      .card .word { margin-top:10px; font-weight:700; text-align:center; }
      ${inkSaving ? ".card img { filter: grayscale(100%); }" : ""}
      .g1 { grid-template-columns: repeat(1, 1fr); }
      .g2 { grid-template-columns: repeat(2, 1fr); }
      .g4 { grid-template-columns: repeat(2, 1fr); }
      .g8 { grid-template-columns: repeat(4, 1fr); }
    </style>
  `;

  const bodyHtml = pages
    .map((pageCards) => {
      const per = pageCards.length;
      let cls = "g1";
      if (per === 1) cls = "g1";
      else if (per === 2) cls = "g2";
      else if (per === 4) cls = "g4";
      else if (per === 8) cls = "g8";
      else if (per <= 2) cls = "g2";
      else if (per <= 4) cls = "g4";
      else cls = "g8";

      const cardsHtml = pageCards
        .map((card) => {
          const imageHtml = `<div style="width:100%; height:160px; overflow:hidden; border-radius:8px; background:#f3f4f6;">
              <img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.word)}" style="width:100%; height:100%; object-fit:cover;" />
            </div>`;
          const wordHtml =
            contentOption === "picture+word"
              ? `<div class="word" style="font-size:18px;">${escapeHtml(card.word.replaceAll("_", " "))}</div>`
              : "";

          return `<div class="card">${imageHtml}${wordHtml}</div>`;
        })
        .join("");

      return `<div class="print-page"><div class="page-grid ${cls}">${cardsHtml}</div></div>`;
    })
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Classendo Print</title>
        ${style}
      </head>
      <body>
        ${siteHeaderHtml}
        <main>
          ${bodyHtml}
        </main>
      </body>
    </html>
  `;
}

export function openPrintableWindow(html: string, popupMessage: string, onDone: () => void) {
  const windowRef = window.open("", "_blank", "noopener,noreferrer");
  if (!windowRef) {
    alert(popupMessage);
    onDone();
    return;
  }

  windowRef.document.open();
  windowRef.document.write(html);
  windowRef.document.close();

  setTimeout(() => {
    try {
      windowRef.focus();
      windowRef.print();
    } catch (error) {
      console.error("Print window action failed:", error);
    } finally {
      onDone();
    }
  }, 600);
}

function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
