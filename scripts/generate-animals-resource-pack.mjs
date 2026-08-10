import fs from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import sharp from "sharp";

const root = process.cwd();
const assetDir = path.join(root, "public", "resources", "animals-vocabulary-beginner-esl");
const packDir = path.join(root, "public", "free-resources");
const outputPdf = path.join(packDir, "animals-vocabulary-beginner-esl.pdf");
const words = ["dog", "cat", "bird", "fish", "rabbit", "lion"];
const sourceBase = "https://tsccyjrniiamnwgrtvpw.supabase.co/storage/v1/object/public/vocab-images/nouns";
const sources = {
  dog: `${sourceBase}/dog/dog_1.png`,
  cat: `${sourceBase}/cat/cat_1.png`,
  bird: `${sourceBase}/bird/bird_1.png`,
  fish: `${sourceBase}/fish/fish_1.png`,
  rabbit: `${sourceBase}/rabbit/rabbit_1.png`,
  lion: `${sourceBase}/lion/lion_1.png`,
};
const green = "#6f9560";
const dark = "#2f3a2f";
const soft = "#eff6eb";
const pdfUrl = "https://classendo.com/free-resources/animals-vocabulary-beginner-esl";

await fs.mkdir(assetDir, { recursive: true });
await fs.mkdir(packDir, { recursive: true });

for (const word of words) {
  const destination = path.join(assetDir, `${word}.png`);
  try { await fs.access(destination); } catch {
    const response = await fetch(sources[word]);
    if (!response.ok) throw new Error(`Could not download ${word}: ${response.status}`);
    await fs.writeFile(destination, Buffer.from(await response.arrayBuffer()));
  }
}

const imagePath = (word) => path.join(assetDir, `${word}.png`);
const drawFooter = (doc, page) => {
  doc.font("Helvetica").fontSize(8).fillColor("#73806f");
  doc.text(`Classendo free resource  |  Page ${page}`, 48, 731, { width: 245, lineBreak: false });
  const footerLink = "Optional interactive extension: Classendo.com";
  const footerWidth = doc.widthOfString(footerLink);
  doc.fillColor(green).text(footerLink, 310, 731, { lineBreak: false });
  doc.moveTo(310, 741).lineTo(310 + footerWidth, 741).strokeColor(green).lineWidth(0.45).stroke();
  doc.link(310, 731, footerWidth, 10, pdfUrl);
};
const header = (doc, title, eyebrow) => {
  doc.rect(0, 0, 612, 74).fill(soft);
  doc.fillColor(green).font("Helvetica-Bold").fontSize(9).text(eyebrow.toUpperCase(), 48, 22, { characterSpacing: 1.1 });
  doc.fillColor(dark).font("Helvetica-Bold").fontSize(23).text(title, 48, 39);
};
const card = (doc, word, x, y, width, height, label = true) => {
  doc.roundedRect(x, y, width, height, 12).fillAndStroke("#ffffff", "#d9e5d2");
  doc.image(imagePath(word), x + 14, y + 12, { fit: [width - 28, height - (label ? 58 : 24)], align: "center", valign: "center" });
  if (label) doc.fillColor(dark).font("Helvetica-Bold").fontSize(20).text(word, x, y + height - 36, { width, align: "center" });
};
const line = (doc, x1, y, x2) => doc.moveTo(x1, y).lineTo(x2, y).strokeColor("#aac29d").lineWidth(1.2).stroke();

const doc = new PDFDocument({ size: "LETTER", margin: 48, autoFirstPage: false, info: { Title: "Animals Vocabulary - Beginner ESL", Author: "Classendo", Subject: "Free printable beginner ESL lesson pack" } });
const stream = (await import("node:fs")).createWriteStream(outputPdf);
doc.pipe(stream);
let page = 0;
const addPage = () => { doc.addPage(); page += 1; };

addPage();
doc.rect(0, 0, 612, 792).fill("#f7f6f2");
doc.circle(520, 90, 130).fill("#e4f0dd");
doc.circle(80, 740, 150).fill("#eaf3e5");
doc.fillColor(green).font("Helvetica-Bold").fontSize(12).text("CLASSENDO FREE PRINTABLE", 48, 55, { characterSpacing: 1.5 });
doc.fillColor(dark).font("Helvetica-Bold").fontSize(35).text("Animals Vocabulary", 48, 100);
doc.fontSize(24).fillColor("#5b7250").text("Beginner ESL", 48, 143);
doc.font("Helvetica").fontSize(15).fillColor("#526050").text("A complete, ready-to-print lesson pack for young beginner English learners.", 48, 193, { width: 400, lineGap: 4 });
[["dog", 48, 274], ["cat", 220, 274], ["bird", 392, 274], ["fish", 48, 470], ["rabbit", 220, 470], ["lion", 392, 470]].forEach(([word, x, y]) => card(doc, word, x, y, 142, 164));
doc.roundedRect(48, 674, 516, 52, 14).fill("#ffffff");
doc.fillColor(dark).font("Helvetica-Bold").fontSize(12).text("Inside: flashcards, matching and writing worksheets, a speaking activity, lesson plan and answer key.", 64, 693, { width: 484, align: "center" });
drawFooter(doc, page);

addPage(); header(doc, "Teacher overview", "Start here");
doc.fillColor(dark).font("Helvetica-Bold").fontSize(16).text("At a glance", 48, 105);
const overview = [["Level", "A0-A1 beginner"], ["Age guide", "5-10 years"], ["Lesson length", "35-40 minutes"], ["Target vocabulary", "dog, cat, bird, fish, rabbit, lion"], ["Language", "What is it?  It's a ___."], ["Materials", "This pack, scissors, pencils or crayons, and tape."]];
overview.forEach(([label, value], index) => { const y = 140 + index * 44; doc.roundedRect(48, y, 516, 33, 8).fill(index % 2 ? "#ffffff" : "#f5f9f2"); doc.fillColor(green).font("Helvetica-Bold").fontSize(10).text(label.toUpperCase(), 62, y + 11, { width: 110 }); doc.fillColor(dark).font("Helvetica").fontSize(11).text(value, 180, y + 10, { width: 365 }); });
doc.fillColor(dark).font("Helvetica-Bold").fontSize(16).text("Learning goals", 48, 442);
doc.font("Helvetica").fontSize(12).fillColor("#526050").text("By the end of the lesson, learners can:", 48, 470);
["name the six animals from a picture.", "ask and answer: What is it? / It's a ___.", "recognise and write the six target words."].forEach((goal, index) => { doc.circle(58, 505 + index * 32, 7).fill("#c7deb9"); doc.fillColor(dark).font("Helvetica").fontSize(12).text(goal, 76, 498 + index * 32); });
doc.roundedRect(48, 624, 516, 76, 12).fill("#eaf3e5"); doc.fillColor(dark).font("Helvetica-Bold").fontSize(12).text("Optional interactive extension", 64, 642); doc.font("Helvetica").fontSize(10.5).fillColor("#526050").text("The PDF is complete on its own. If useful, teachers can later choose the same six cards in Classendo Flashcards, then use Classroom, Printables or Lesson Plans as an optional extension.", 64, 662, { width: 474, lineGap: 3 }); drawFooter(doc, page);

for (const sheet of [["dog", "cat", "bird"], ["fish", "rabbit", "lion"]]) { addPage(); header(doc, "Printable visual flashcards", "Cut and teach"); doc.fillColor("#526050").font("Helvetica").fontSize(10).text("Cut along the pale borders. Show the picture first, then reveal and say the word.", 48, 91); sheet.forEach((word, index) => card(doc, word, 78, 126 + index * 194, 456, 169)); doc.fillColor("#9eaa9a").fontSize(9).text("Cut line", 48, 713, { lineBreak: false }); drawFooter(doc, page); }

addPage(); header(doc, "Animals Vocabulary", "Student worksheet - visual matching"); doc.fillColor(dark).font("Helvetica").fontSize(11).text("Name: _______________________________     Date: __________________", 48, 95); doc.font("Helvetica-Bold").fontSize(13).text("1. Look at the pictures. Draw a line to match each picture with the correct word.", 48, 126);
const matchPictures = ["rabbit", "fish", "dog", "lion", "cat", "bird"]; const matchWords = ["bird", "rabbit", "dog", "lion", "fish", "cat"];
matchPictures.forEach((word, index) => { const y = 171 + index * 84; doc.roundedRect(52, y, 76, 62, 8).fillAndStroke("#f7faf4", "#d9e5d2"); doc.image(imagePath(word), 57, y + 4, { fit: [66, 52], align: "center", valign: "center" }); line(doc, 145, y + 31, 350, y + 31); doc.roundedRect(387, y + 9, 130, 43, 8).fill("#ffffff").stroke("#d9e5d2"); doc.fillColor(dark).font("Helvetica-Bold").fontSize(15).text(matchWords[index], 387, y + 23, { width: 130, align: "center" }); }); drawFooter(doc, page);

addPage(); header(doc, "Animals Vocabulary", "Student worksheet - trace and write"); doc.fillColor(dark).font("Helvetica").fontSize(11).text("Name: _______________________________     Date: __________________", 48, 95); doc.font("Helvetica-Bold").fontSize(13).text("A. Trace and write.", 48, 128);
words.forEach((word, index) => { const y = 162 + index * 58; doc.roundedRect(48, y, 65, 43, 8).fill("#f7faf4"); doc.image(imagePath(word), 55, y + 5, { fit: [51, 32], align: "center", valign: "center" }); doc.fillColor("#9ba79a").font("Helvetica-Oblique").fontSize(17).text(word, 140, y + 13); line(doc, 245, y + 31, 480); });
doc.fillColor(dark).font("Helvetica-Bold").fontSize(13).text("B. Complete the words.", 48, 535); ["d_g", "c_t", "b_rd", "f_sh", "r_bbit", "l_on"].forEach((word, index) => { const col = index % 3; const row = Math.floor(index / 3); doc.roundedRect(48 + col * 170, 570 + row * 64, 140, 42, 8).fill("#ffffff").stroke("#d9e5d2"); doc.fillColor(dark).font("Helvetica-Bold").fontSize(18).text(word, 48 + col * 170, 582 + row * 64, { width: 140, align: "center" }); }); drawFooter(doc, page);

addPage(); header(doc, "Animal Corners", "Classroom speaking activity"); doc.fillColor(dark).font("Helvetica-Bold").fontSize(16).text("Set-up", 48, 108); doc.font("Helvetica").fontSize(11.5).fillColor("#526050").text("Put the six picture flashcards around the room. Learners stand in the middle. Say a word. Learners move to the matching animal. When they arrive, ask: What is it? The group answers: It's a ___.", 48, 136, { width: 510, lineGap: 4 });
doc.fillColor(dark).font("Helvetica-Bold").fontSize(16).text("How to play", 48, 218); ["Say one animal word. Learners move to the correct card.", "Point to one learner at that card. Ask: What is it?", "The learner says: It's a dog/cat/bird/fish/rabbit/lion.", "After one round, let a confident learner become the caller."].forEach((step, index) => { const y = 253 + index * 42; doc.circle(61, y + 9, 12).fill("#dcebd4"); doc.fillColor(green).font("Helvetica-Bold").fontSize(11).text(String(index + 1), 55, y + 4); doc.fillColor(dark).font("Helvetica").fontSize(11.5).text(step, 86, y + 4); });
doc.fillColor(dark).font("Helvetica-Bold").fontSize(16).text("Cut-out caller cards", 48, 450); words.forEach((word, index) => { const col = index % 3; const row = Math.floor(index / 3); const x = 48 + col * 172; const y = 485 + row * 105; doc.roundedRect(x, y, 150, 83, 10).fillAndStroke("#ffffff", "#aac29d"); doc.image(imagePath(word), x + 10, y + 10, { fit: [59, 49], align: "center", valign: "center" }); doc.fillColor(dark).font("Helvetica-Bold").fontSize(17).text(word, x + 72, y + 31, { width: 65, align: "center" }); }); doc.roundedRect(48, 684, 516, 42, 10).fill("#eaf3e5"); doc.fillColor("#4f6547").font("Helvetica-Bold").fontSize(11).text("Variation: do not say the word. Show a flashcard and ask learners to find the matching corner.", 64, 700); drawFooter(doc, page);

addPage(); header(doc, "38-minute lesson plan", "Teacher guide");
const stages = [["0-4 min", "Hello and hook", "Make a dog, cat, bird, fish, rabbit or lion gesture. Learners copy and guess.", "Whole class"], ["4-11 min", "Teach the words", "Show each flashcard. Say the word, learners repeat. Add a simple gesture.", "Flashcards"], ["11-17 min", "Point to...", "Lay cards on a table or board. Say a word. Learners point, then say it together.", "Flashcards"], ["17-25 min", "Visual matching", "Pairs complete the matching worksheet. Check aloud by pointing and saying.", "Worksheet"], ["25-33 min", "Animal Corners", "Run the speaking activity. Encourage: What is it? / It's a ___.", "Activity sheet"], ["33-37 min", "Trace and write", "Learners complete the writing worksheet. Support by showing the matching flashcard.", "Worksheet"], ["37-38 min", "Exit check", "Each learner names one animal as they leave or points to it when named.", "Flashcards"]];
stages.forEach(([time, stage, instructions, materials], index) => { if (index === 4) { drawFooter(doc, page); addPage(); header(doc, "38-minute lesson plan", "Teacher guide - continued"); } const row = index < 4 ? index : index - 4; const y = 108 + row * 78; doc.roundedRect(48, y, 516, 63, 10).fill(row % 2 ? "#ffffff" : "#f5f9f2"); doc.fillColor(green).font("Helvetica-Bold").fontSize(10).text(time, 61, y + 12, { width: 58 }); doc.fillColor(dark).font("Helvetica-Bold").fontSize(11).text(stage, 130, y + 10, { width: 118 }); doc.fillColor("#526050").font("Helvetica").fontSize(9.5).text(instructions, 250, y + 9, { width: 220, lineGap: 2 }); doc.fillColor("#748071").font("Helvetica-Bold").fontSize(8).text(materials, 480, y + 25, { width: 67, align: "center" }); });
doc.roundedRect(48, 390, 516, 75, 10).fill("#eaf3e5"); doc.fillColor(dark).font("Helvetica-Bold").fontSize(11).text("Differentiation", 64, 406); doc.font("Helvetica").fontSize(9.5).fillColor("#526050").text("Support: let learners point before speaking and keep word cards visible. Stretch: learners become the caller and ask What is it? independently.", 64, 425, { width: 480 }); doc.fillColor(dark).font("Helvetica-Bold").fontSize(14).text("Quick preparation", 48, 515); doc.font("Helvetica").fontSize(10.5).fillColor("#526050").text("Print pages 3-4 at full size. Put the flashcards where all learners can see them, then use the same cards for Point to..., Animal Corners and the exit check.", 48, 541, { width: 500, lineGap: 4 }); drawFooter(doc, page);

addPage(); header(doc, "Answer key and teacher notes", "Finish strong"); doc.fillColor(dark).font("Helvetica-Bold").fontSize(16).text("Worksheet answers", 48, 108); doc.font("Helvetica-Bold").fontSize(12).text("Visual matching", 48, 145); doc.font("Helvetica").fontSize(11).fillColor("#526050").text("rabbit -> rabbit, fish -> fish, dog -> dog, lion -> lion, cat -> cat, bird -> bird", 48, 168); doc.fillColor(dark).font("Helvetica-Bold").fontSize(12).text("Trace and write", 48, 213); doc.font("Helvetica").fontSize(11).fillColor("#526050").text("dog, cat, bird, fish, rabbit, lion", 48, 236); doc.fillColor(dark).font("Helvetica-Bold").fontSize(12).text("Complete the words", 48, 281); doc.font("Helvetica").fontSize(11).fillColor("#526050").text("d, a, i, i, a, i", 48, 304);
doc.fillColor(dark).font("Helvetica-Bold").fontSize(16).text("Teacher notes", 48, 365); ["Keep the word fish the same for one fish and two fish.", "For early readers, hide the written word at first and use the picture side only.", "For mixed-level classes, pair a confident speaker with a learner who can point or repeat.", "The free PDF is designed to work without a Classendo account."].forEach((note, index) => { doc.circle(58, 405 + index * 39, 6).fill("#c7deb9"); doc.fillColor(dark).font("Helvetica").fontSize(11).text(note, 76, 400 + index * 39, { width: 465 }); }); doc.roundedRect(48, 592, 516, 94, 14).fill("#eaf3e5"); doc.fillColor(dark).font("Helvetica-Bold").fontSize(14).text("Optional: take the same six cards online", 64, 612); doc.font("Helvetica").fontSize(10.5).fillColor("#526050").text("Classendo Flashcards lets visitors choose up to six temporary cards, then use them in Classroom Mode, basic Printables or a guest Lesson Plan. The printable pack remains complete without this step.", 64, 635, { width: 474, lineGap: 3 }); doc.fillColor(green).font("Helvetica-Bold").fontSize(10.5).text("Open Classendo Flashcards", 64, 665, { link: "https://classendo.com/flashcards", underline: true }); drawFooter(doc, page);

doc.end();
await new Promise((resolve, reject) => stream.on("finish", resolve).on("error", reject));

const imageBuffers = Object.fromEntries(await Promise.all(words.map(async (word) => [word, await fs.readFile(imagePath(word))])));
const escape = (value) => value.replace(/[&<>]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[char]));
const pinSvg = ({ eyebrow, title, caption, focus, variant }) => {
  const tiles = words.map((word, index) => { const x = 75 + (index % 2) * 425; const y = 470 + Math.floor(index / 2) * 255; return `<g><rect x="${x}" y="${y}" width="360" height="215" rx="28" fill="#ffffff"/><image href="data:image/png;base64,${imageBuffers[word].toString("base64")}" x="${x + 16}" y="${y + 12}" width="200" height="155" preserveAspectRatio="xMidYMid meet"/><text x="${x + 230}" y="${y + 120}" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#2f3a2f">${word}</text></g>`; }).join("");
  const visual = variant === "worksheet" ? `<rect x="70" y="445" width="860" height="720" rx="36" fill="#ffffff"/><text x="120" y="530" font-family="Arial" font-size="34" font-weight="700" fill="#2f3a2f">Look. Match. Learn.</text>${["rabbit", "fish", "dog", "lion"].map((word, index) => `<image href="data:image/png;base64,${imageBuffers[word].toString("base64")}" x="${120 + (index % 2) * 390}" y="${570 + Math.floor(index / 2) * 250}" width="155" height="145" preserveAspectRatio="xMidYMid meet"/><line x1="300" y1="${645 + Math.floor(index / 2) * 250}" x2="${450 + (index % 2) * 250}" y2="${645 + Math.floor(index / 2) * 250}" stroke="#b7cdae" stroke-width="6"/>`).join("")}<rect x="120" y="1060" width="760" height="58" rx="20" fill="#eff6eb"/><text x="500" y="1099" text-anchor="middle" font-family="Arial" font-size="27" font-weight="700" fill="#58754c">Printable matching worksheet</text>` : variant === "activity" ? `<rect x="70" y="445" width="860" height="720" rx="36" fill="#eff6eb"/>${["dog", "cat", "bird", "fish", "rabbit", "lion"].map((word, index) => { const x = 95 + (index % 3) * 280; const y = 495 + Math.floor(index / 3) * 310; return `<rect x="${x}" y="${y}" width="245" height="250" rx="25" fill="#ffffff"/><image href="data:image/png;base64,${imageBuffers[word].toString("base64")}" x="${x + 26}" y="${y + 20}" width="190" height="150" preserveAspectRatio="xMidYMid meet"/><text x="${x + 122}" y="${y + 210}" text-anchor="middle" font-family="Arial" font-size="28" font-weight="700" fill="#2f3a2f">${word}</text>`; }).join("")}<rect x="180" y="1080" width="640" height="62" rx="24" fill="#6f9560"/><text x="500" y="1120" text-anchor="middle" font-family="Arial" font-size="28" font-weight="700" fill="#ffffff">“What is it?”  “It’s a lion.”</text>` : `<rect x="70" y="445" width="860" height="850" rx="36" fill="#eff6eb"/>${tiles}`;
  return `<svg width="1000" height="1500" xmlns="http://www.w3.org/2000/svg"><rect width="1000" height="1500" fill="#f7f6f2"/><circle cx="935" cy="75" r="150" fill="#dcebd4"/><text x="70" y="95" font-family="Arial" font-size="25" font-weight="700" letter-spacing="3" fill="#6f9560">${escape(eyebrow.toUpperCase())}</text><text x="70" y="170" font-family="Arial" font-size="59" font-weight="700" fill="#2f3a2f">${escape(title)}</text><text x="70" y="265" font-family="Arial" font-size="30" fill="#526050">${escape(caption)}</text><rect x="70" y="315" width="298" height="70" rx="35" fill="#6f9560"/><text x="219" y="360" text-anchor="middle" font-family="Arial" font-size="28" font-weight="700" fill="#ffffff">FREE PDF</text>${visual}<text x="500" y="1410" text-anchor="middle" font-family="Arial" font-size="30" font-weight="700" fill="#2f3a2f">Classendo.com</text><text x="500" y="1454" text-anchor="middle" font-family="Arial" font-size="22" fill="#667262">Free printable ESL resources</text></svg>`;
};
const pins = [{ file: "animals-vocabulary-full-pack-pinterest.png", eyebrow: "Beginner ESL", title: "Animals Vocabulary", caption: "Six-word lesson pack for young learners", focus: "lion", variant: "full" }, { file: "animals-vocabulary-matching-worksheet-pinterest.png", eyebrow: "Print and teach", title: "Animal Matching Worksheet", caption: "A simple visual activity for beginners", focus: "rabbit", variant: "worksheet" }, { file: "animals-vocabulary-speaking-activity-pinterest.png", eyebrow: "Low-prep speaking game", title: "Animal Corners", caption: "A movement activity for beginner ESL", focus: "lion", variant: "activity" }];
for (const pin of pins) await sharp(Buffer.from(pinSvg(pin))).png().toFile(path.join(assetDir, pin.file));
console.log(`Generated ${outputPdf} and ${pins.length} Pinterest pins.`);
