const fs = require("fs");
const path = require("path");

const root = "/Users/Sean/Downloads/time";

if (!fs.existsSync(root)) {
  console.error(`Missing folder: ${root}`);
  process.exit(1);
}

const entries = fs.readdirSync(root, { withFileTypes: true });
let renamed = 0;

for (const entry of entries) {
  if (!entry.isDirectory()) continue;
  if (!entry.name.includes(" ")) continue;

  const from = path.join(root, entry.name);
  const toName = entry.name.replace(/ /g, "_");
  const to = path.join(root, toName);

  if (fs.existsSync(to)) {
    console.warn(`Skipped (target exists): ${toName}`);
    continue;
  }

  fs.renameSync(from, to);
  renamed += 1;
}

console.log(`Renamed ${renamed} folders in ${root}`);

