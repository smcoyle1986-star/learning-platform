import fs from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import sharp from "sharp";

const root = process.cwd();
const slug = "food-vocabulary-beginner-esl";
const assets = path.join(root, "public/resources", slug);
const output = path.join(root, "public/free-resources/food-core.pdf");
const words = ["apple", "banana", "bread", "cheese", "pizza", "rice"];
const green = "#6f9560", dark = "#2f3a2f", soft = "#edf4e9", muted = "#526050";
const pageUrl = `https://classendo.com/free-resources/${slug}`;
const image = (word) => path.join(assets, `${word}.png`);

const doc = new PDFDocument({ size: "LETTER", margin: 48, autoFirstPage: false, info: { Title: "Food Vocabulary - Beginner ESL", Author: "Classendo" } });
const stream = (await import("node:fs")).createWriteStream(output);
doc.pipe(stream);
let page = 0;
const addPage = () => { doc.addPage(); page += 1; };
const footer = () => {
  doc.font("Helvetica").fontSize(8).fillColor("#73806f").text(`Classendo free resource  |  Page ${page}`, 48, 731, { width: 245, lineBreak: false });
  const label = "Optional interactive extension: Classendo.com";
  const width = doc.widthOfString(label);
  doc.fillColor(green).text(label, 310, 731, { lineBreak: false });
  doc.moveTo(310, 741).lineTo(310 + width, 741).strokeColor(green).lineWidth(.45).stroke();
  doc.link(310, 731, width, 10, pageUrl);
};
const header = (title, eyebrow) => { doc.rect(0, 0, 612, 74).fill(soft); doc.fillColor(green).font("Helvetica-Bold").fontSize(9).text(eyebrow.toUpperCase(), 48, 22, { characterSpacing: 1.1 }); doc.fillColor(dark).font("Helvetica-Bold").fontSize(23).text(title, 48, 39); };
const card = (word, x, y, width, height) => { doc.roundedRect(x, y, width, height, 12).fillAndStroke("#fff", "#d9e5d2"); doc.image(image(word), x + 12, y + 10, { fit: [width - 24, height - 58], align: "center", valign: "center" }); doc.fillColor(dark).font("Helvetica-Bold").fontSize(20).text(word, x, y + height - 36, { width, align: "center" }); };
const nameLine = () => doc.fillColor(dark).font("Helvetica").fontSize(11).text("Name: _______________________________     Date: __________________", 48, 95);

addPage();
doc.rect(0, 0, 612, 792).fill("#f7f6f2"); doc.circle(520, 90, 130).fill("#e4f0dd"); doc.circle(80, 740, 150).fill("#eaf3e5");
doc.fillColor(green).font("Helvetica-Bold").fontSize(12).text("CLASSENDO FREE PRINTABLE", 48, 55, { characterSpacing: 1.5 });
doc.fillColor(dark).font("Helvetica-Bold").fontSize(35).text("Food Vocabulary", 48, 100); doc.fontSize(24).fillColor("#5b7250").text("Beginner ESL", 48, 143);
doc.font("Helvetica").fontSize(15).fillColor(muted).text("A complete, ready-to-print lesson pack for young beginner English learners.", 48, 193, { width: 400, lineGap: 4 });
words.forEach((word, i) => card(word, 48 + (i % 3) * 172, 274 + Math.floor(i / 3) * 196, 142, 164));
doc.roundedRect(48, 674, 516, 52, 14).fill("#fff"); doc.fillColor(dark).font("Helvetica-Bold").fontSize(12).text("Inside: flashcards, matching and sentence work, Battleship, Bullseye, lesson plan and answer key.", 64, 693, { width: 484, align: "center" }); footer();

addPage(); header("Teacher overview", "Start here");
const overview = [["Level", "A0-A1 beginner"], ["Age guide", "5-10 years"], ["Lesson length", "38 minutes"], ["Target vocabulary", words.join(", ")], ["Language", "What food is it? / It is ___.  I like ___."], ["Materials", "This pack, pencils, small counters, and a divider for pairs."]];
doc.fillColor(dark).font("Helvetica-Bold").fontSize(16).text("At a glance", 48, 105);
overview.forEach(([label, value], i) => { const y = 140 + i * 44; doc.roundedRect(48, y, 516, 33, 8).fill(i % 2 ? "#fff" : "#f5f9f2"); doc.fillColor(green).font("Helvetica-Bold").fontSize(10).text(label.toUpperCase(), 62, y + 11, { width: 110 }); doc.fillColor(dark).font("Helvetica").fontSize(10.5).text(value, 180, y + 10, { width: 365 }); });
doc.fillColor(dark).font("Helvetica-Bold").fontSize(14).text("Game essentials", 48, 430);
doc.font("Helvetica").fontSize(10.3).fillColor(muted).text("Battleship: each partner secretly draws five ships on their own grid. Take turns calling a food word and coordinate. The partner says hit or miss. Bullseye: drop a small token, name the food, then use the points shown.", 48, 455, { width: 505, lineGap: 4 });
doc.roundedRect(48, 548, 516, 102, 12).fill("#eaf3e5"); doc.fillColor(dark).font("Helvetica-Bold").fontSize(12).text("Optional interactive extension", 64, 566); doc.font("Helvetica").fontSize(10.5).fillColor(muted).text("The PDF is complete on its own. Teachers can choose the same six cards in Classendo Flashcards and open them in Classroom Mode to present full-screen and annotate over the cards.", 64, 587, { width: 474, lineGap: 3 }); footer();

for (const set of [["apple", "banana", "bread"], ["cheese", "pizza", "rice"]]) { addPage(); header("Printable visual flashcards", "Cut and teach"); doc.fillColor(muted).font("Helvetica").fontSize(10).text("Cut along the pale borders. Show the picture first, then reveal and say the word.", 48, 91); set.forEach((word, i) => card(word, 78, 126 + i * 194, 456, 169)); footer(); }

addPage(); header("Food Vocabulary", "Student worksheet - visual matching"); nameLine(); doc.fillColor(dark).font("Helvetica-Bold").fontSize(13).text("1. Look at the pictures. Draw a line to match each picture with the correct word.", 48, 126);
const pictures = ["pizza", "apple", "rice", "bread", "banana", "cheese"], labels = ["banana", "pizza", "bread", "rice", "cheese", "apple"];
pictures.forEach((word, i) => { const y = 171 + i * 84; doc.roundedRect(52, y, 76, 62, 8).fillAndStroke("#f7faf4", "#d9e5d2"); doc.image(image(word), 57, y + 4, { fit: [66, 52], align: "center", valign: "center" }); doc.moveTo(145, y + 31).lineTo(350, y + 31).strokeColor("#aac29d").lineWidth(1.2).stroke(); doc.roundedRect(387, y + 9, 130, 43, 8).fill("#fff").stroke("#d9e5d2"); doc.fillColor(dark).font("Helvetica-Bold").fontSize(15).text(labels[i], 387, y + 23, { width: 130, align: "center" }); }); footer();

addPage(); header("Food Vocabulary", "Student worksheet - write and say"); nameLine(); doc.fillColor(dark).font("Helvetica-Bold").fontSize(13).text("A. Look at each picture. Write the missing letters.", 48, 126);
[["apple", "_ p p l e"], ["banana", "b _ n _ n a"], ["bread", "b r _ a d"], ["cheese", "c h _ _ s e"], ["pizza", "p _ z z a"], ["rice", "r _ c e"]].forEach(([word, text], i) => { const y = 166 + i * 58; doc.roundedRect(48, y, 65, 43, 8).fill("#f7faf4"); doc.image(image(word), 55, y + 5, { fit: [51, 32], align: "center", valign: "center" }); doc.fillColor(dark).font("Helvetica-Bold").fontSize(17).text(text, 140, y + 13); });
doc.fillColor(dark).font("Helvetica-Bold").fontSize(13).text("B. Complete and say the sentence.", 48, 540); doc.font("Helvetica").fontSize(12).text("What food is it?  It is ____________________.", 48, 573); doc.text("I like ____________________.", 48, 622); doc.roundedRect(48, 664, 516, 42, 10).fill("#eaf3e5"); doc.fillColor("#4f6547").font("Helvetica-Bold").fontSize(11).text("Say your two sentences to a partner.", 64, 680); footer();

addPage(); header("38-minute lesson plan", "Teacher guide");
const stages = [["0-4 min", "Food mime", "Mime eating and show a card. Learners guess and repeat.", "Whole class"], ["4-10 min", "Teach the words", "Show each flashcard. Say the word, learners repeat and point.", "Flashcards"], ["10-16 min", "Visual matching", "Pairs match the pictures and words. Check aloud together.", "Page 5"], ["16-26 min", "Food Battleship", "Pairs sit behind a folder. Each draws five ships secretly, then calls a food word and coordinate. Partner answers hit or miss. Sink all ships to win.", "Page 7"], ["26-33 min", "Food Bullseye", "Learners drop a token, say I like ___ for the food shown, then score the printed points.", "Page 8"], ["33-37 min", "Write and say", "Learners finish the missing letters and say both model sentences to a partner.", "Page 6"], ["37-38 min", "Exit check", "Each learner names a food card or says I like ___.", "Flashcards"]];
stages.forEach(([time, stage, instructions, materials], i) => { const y = 105 + i * 76; doc.roundedRect(48, y, 516, 62, 10).fill(i % 2 ? "#fff" : "#f5f9f2"); doc.fillColor(green).font("Helvetica-Bold").fontSize(9.5).text(time, 61, y + 12, { width: 58 }); doc.fillColor(dark).font("Helvetica-Bold").fontSize(10.5).text(stage, 130, y + 10, { width: 105 }); doc.fillColor(muted).font("Helvetica").fontSize(9).text(instructions, 240, y + 8, { width: 235, lineGap: 2 }); doc.fillColor("#748071").font("Helvetica-Bold").fontSize(8).text(materials, 482, y + 23, { width: 60, align: "center" }); }); footer();

addPage(); header("Answer key and teacher notes", "Finish strong"); doc.fillColor(dark).font("Helvetica-Bold").fontSize(16).text("Worksheet answers", 48, 108); doc.font("Helvetica-Bold").fontSize(12).text("Visual matching", 48, 145); doc.font("Helvetica").fontSize(11).fillColor(muted).text("pizza -> pizza, apple -> apple, rice -> rice, bread -> bread, banana -> banana, cheese -> cheese", 48, 168); doc.fillColor(dark).font("Helvetica-Bold").fontSize(12).text("Missing letters", 48, 213); doc.font("Helvetica").fontSize(11).fillColor(muted).text("apple: a; banana: a, a; bread: e; cheese: e, e; pizza: i; rice: i", 48, 236);
doc.fillColor(dark).font("Helvetica-Bold").fontSize(16).text("Teacher notes", 48, 294); ["For Battleship, keep partners' grids private with a book or folder between them.", "Learners must say both a food word and a coordinate before a partner answers hit or miss.", "Use a button, coin, or small eraser as a Bullseye token.", "The printable pack works without a Classendo account."].forEach((note, i) => { doc.circle(58, 334 + i * 39, 6).fill("#c7deb9"); doc.fillColor(dark).font("Helvetica").fontSize(11).text(note, 76, 329 + i * 39, { width: 465 }); }); doc.roundedRect(48, 548, 516, 110, 14).fill("#eaf3e5"); doc.fillColor(dark).font("Helvetica-Bold").fontSize(14).text("Optional: take the same six cards online", 64, 568); doc.font("Helvetica").fontSize(10.5).fillColor(muted).text("Classendo Flashcards lets visitors choose up to six temporary cards, then open the same cards in Classroom Mode. The printable pack remains complete without this step.", 64, 591, { width: 474, lineGap: 3 }); footer();
doc.end(); await new Promise((resolve, reject) => stream.on("finish", resolve).on("error", reject));

const buffers = Object.fromEntries(await Promise.all(words.map(async (word) => [word, await fs.readFile(image(word))])));
const tiles = words.map((word, i) => { const x = 75 + (i % 2) * 425, y = 470 + Math.floor(i / 2) * 255; return `<g><rect x="${x}" y="${y}" width="360" height="215" rx="28" fill="#fff"/><image href="data:image/png;base64,${buffers[word].toString("base64")}" x="${x + 16}" y="${y + 12}" width="200" height="155" preserveAspectRatio="xMidYMid meet"/><text x="${x + 230}" y="${y + 120}" font-family="Arial" font-size="34" font-weight="700" fill="#2f3a2f">${word}</text></g>`; }).join("");
const svg = `<svg width="1000" height="1500" xmlns="http://www.w3.org/2000/svg"><rect width="1000" height="1500" fill="#f7f6f2"/><circle cx="935" cy="75" r="150" fill="#dcebd4"/><text x="70" y="95" font-family="Arial" font-size="25" font-weight="700" letter-spacing="3" fill="#6f9560">BEGINNER ESL</text><text x="70" y="170" font-family="Arial" font-size="59" font-weight="700" fill="#2f3a2f">Food Vocabulary</text><text x="70" y="265" font-family="Arial" font-size="30" fill="#526050">Six-word lesson pack for young learners</text><rect x="70" y="315" width="298" height="70" rx="35" fill="#6f9560"/><text x="219" y="360" text-anchor="middle" font-family="Arial" font-size="28" font-weight="700" fill="#fff">FREE PDF</text><rect x="70" y="445" width="860" height="850" rx="36" fill="#eff6eb"/>${tiles}<text x="500" y="1410" text-anchor="middle" font-family="Arial" font-size="30" font-weight="700" fill="#2f3a2f">Classendo.com</text><text x="500" y="1454" text-anchor="middle" font-family="Arial" font-size="22" fill="#667262">Free printable ESL resources</text></svg>`;
await sharp(Buffer.from(svg)).png().toFile(path.join(assets, "food-vocabulary-full-pack-pinterest.png"));
console.log("Generated Food core PDF and full-pack preview.");
