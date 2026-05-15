const fs = require("fs");
const path = require("path");

const dir = "/Users/Sean/Downloads/time";
fs.mkdirSync(dir, { recursive: true });

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

for (const lemma of lemmas) {
  fs.writeFileSync(path.join(dir, `${lemma}.png`), "");
}

console.log(`Created ${lemmas.length} files in ${dir}`);

