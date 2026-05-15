const fs = require("fs");
const path = require("path");

const root = "/Users/Sean/Downloads/time";
fs.mkdirSync(root, { recursive: true });

const lemmas = [
  "afternoon",
  "breakfast",
  "dinner",
  "eight fifteen",
  "eight forty-five",
  "eight o'clock",
  "eight thirty",
  "eleven o'clock",
  "evening",
  "five fifteen",
  "five forty-five",
  "five o'clock",
  "five thirty",
  "four o'clock",
  "last week",
  "lunch",
  "midday",
  "midnight",
  "month",
  "morning",
  "next week",
  "night",
  "nine o'clock",
  "noon",
  "one o'clock",
  "seven o'clock",
  "six o'clock",
  "snack",
  "ten fifteen",
  "ten forty-five",
  "ten o'clock",
  "ten thirty",
  "three o'clock",
  "tomorrow",
  "twelve o'clock",
  "two fifteen",
  "two forty-five",
  "two o'clock",
  "two thirty",
  "year",
  "yesterday",
];

let removedFiles = 0;
let createdFolders = 0;

for (const lemma of lemmas) {
  const filePath = path.join(root, `${lemma}.png`);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    fs.unlinkSync(filePath);
    removedFiles += 1;
  }

  const folderPath = path.join(root, lemma);
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
    createdFolders += 1;
  }
}

console.log(`Removed ${removedFiles} files and created ${createdFolders} folders in ${root}`);

