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
      @page { size: letter landscape; margin: 0.45in; }
      body { font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; margin:0; padding:0; color:#111827; }
      .print-page { page-break-after: always; break-after: page; margin: 0 auto; width: 100%; box-sizing: border-box; min-height: 7.6in; padding: 0.1in 0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
      .page-grid { display: grid; gap: 12px; width:100%; align-content:start; justify-items:stretch; }
      .card { border: 1px solid ${inkSaving ? "rgba(0,0,0,0.12)" : "#e5e7eb"}; border-radius:14px; padding:10px; display:flex; flex-direction:column; align-items:stretch; justify-content:space-between; width:100%; aspect-ratio: 1 / 1; box-sizing:border-box; }
      .card-image { flex:1; min-height:0; border-radius:10px; overflow:hidden; background:#f3f4f6; display:flex; align-items:center; justify-content:center; }
      .card img { width:100%; height:100%; object-fit:contain; display:block; }
      .card .word { margin-top:10px; font-weight:800; text-align:center; line-height:1.1; }
      ${inkSaving ? ".card img { filter: grayscale(100%); }" : ""}
      .g1 { grid-template-columns: repeat(1, minmax(0, 1fr)); max-width: 6.8in; }
      .g2 { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: 8.7in; }
      .g4 { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: 7.3in; }
      .g8 { grid-template-columns: repeat(4, minmax(0, 1fr)); max-width: 9.2in; }
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

      const cardsHtml = Array.from({ length: per })
        .map((_, index) => {
          const card = pageCards[index];
          if (!card) {
            return `<div class="card" style="opacity:0; pointer-events:none;"></div>`;
          }

          const imageHtml = `<div class="card-image">
              <img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.word)}" />
            </div>`;
          const wordHtml =
            contentOption === "picture+word"
              ? `<div class="word" style="font-size:${per <= 2 ? "22px" : per === 4 ? "20px" : "18px"};">${escapeHtml(card.word.replaceAll("_", " "))}</div>`
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
        <main>
          ${bodyHtml}
        </main>
      </body>
    </html>
  `;
}

export function printPrintableHtml(html: string, onDone: () => void) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";

  const cleanup = () => {
    iframe.remove();
    onDone();
  };

  const tryPrint = () => {
    try {
      const frameWindow = iframe.contentWindow;
      if (!frameWindow) {
        cleanup();
        return;
      }

      const afterPrint = () => {
        frameWindow.removeEventListener("afterprint", afterPrint);
        cleanup();
      };

      frameWindow.addEventListener("afterprint", afterPrint);
      frameWindow.focus();
      frameWindow.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) cleanup();
      }, 10000);
    } catch (error) {
      console.error("Print frame action failed:", error);
      cleanup();
    }
  };

  iframe.onload = () => {
    setTimeout(tryPrint, 100);
  };

  document.body.appendChild(iframe);
  iframe.srcdoc = html;
}

function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
