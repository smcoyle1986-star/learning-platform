import fs from "node:fs";
import path from "node:path";

import { generateNounImageSet } from "../lib/noun-images/pipeline";
import { NounGenerationInput } from "../lib/noun-images/types";

function parseEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const FIXES: NounGenerationInput[] = [
  { lemma: "body", countability: "count", variantNumbers: [2], overwriteExisting: true },
  { lemma: "face", countability: "count", variantNumbers: [1], overwriteExisting: true },
  { lemma: "feet", countability: "count", variantNumbers: [1, 3], overwriteExisting: true },
  { lemma: "finger", countability: "count", variantNumbers: [1, 2], overwriteExisting: true },
  { lemma: "foot", countability: "count", variantNumbers: [2], overwriteExisting: true },
  { lemma: "hair", countability: "count", variantNumbers: [2], overwriteExisting: true },
  { lemma: "toe", countability: "count", variantNumbers: [1, 2], overwriteExisting: true },
  { lemma: "tooth", countability: "count", variantNumbers: [2], overwriteExisting: true },
];

async function main() {
  parseEnvFile(path.join(process.cwd(), ".env.local"));
  parseEnvFile(path.join(process.cwd(), ".env"));

  for (const fix of FIXES) {
    const label = `${fix.lemma} [${fix.variantNumbers?.join(",")}]`;
    console.log(`Starting ${label}`);
    const results = await generateNounImageSet(fix);
    console.log(`Finished ${label}: ${results.map((item) => item.imagePath).join(", ")}`);
  }

  console.log("All body fixes completed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
