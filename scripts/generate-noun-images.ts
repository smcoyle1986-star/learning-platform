import fs from "node:fs";
import path from "node:path";

import {
  generateNounImageSet,
  loadNounsForTheme,
  loadNounsForGeneration,
} from "../lib/noun-images/pipeline";
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

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: {
    lemma?: string;
    theme?: string;
    exclude: string[];
    variants?: NounGenerationInput["variantNumbers"];
    countability?: NounGenerationInput["countability"];
    limit?: number;
    concurrency: number;
    overwriteExisting: boolean;
  } = {
    exclude: [],
    concurrency: 1,
    overwriteExisting: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--lemma=")) {
      parsed.lemma = arg.split("=")[1]?.trim().toLowerCase();
    } else if (arg.startsWith("--theme=")) {
      parsed.theme = arg.split("=")[1]?.trim().toLowerCase();
    } else if (arg.startsWith("--exclude=")) {
      parsed.exclude = arg
        .split("=")[1]
        ?.split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean) ?? [];
    } else if (arg.startsWith("--variants=")) {
      const variants = arg
        .split("=")[1]
        ?.split(",")
        .map((value) => Number(value.trim()))
        .filter((value): value is 1 | 2 | 3 => value === 1 || value === 2 || value === 3);
      if (variants?.length) {
        parsed.variants = Array.from(new Set(variants));
      }
    } else if (arg.startsWith("--countability=")) {
      const value = arg.split("=")[1]?.trim();
      if (value === "count" || value === "uncount" || value === "both") {
        parsed.countability = value;
      }
    } else if (arg.startsWith("--limit=")) {
      const value = Number(arg.split("=")[1]);
      if (Number.isFinite(value) && value > 0) {
        parsed.limit = value;
      }
    } else if (arg.startsWith("--concurrency=")) {
      const value = Number(arg.split("=")[1]);
      if (Number.isFinite(value) && value > 0) {
        parsed.concurrency = value;
      }
    } else if (arg === "--overwrite-existing") {
      parsed.overwriteExisting = true;
    }
  }

  return parsed;
}

async function runPool<T>(
  items: T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<void>
) {
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      await task(items[current], current);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  );
}

async function main() {
  parseEnvFile(path.join(process.cwd(), ".env.local"));
  parseEnvFile(path.join(process.cwd(), ".env"));

  const args = parseArgs();

  let items: NounGenerationInput[];
  if (args.lemma) {
    if (!args.countability) {
      throw new Error("When --lemma is provided, --countability is also required.");
    }

    items = [
      {
        lemma: args.lemma,
        countability: args.countability,
        overwriteExisting: args.overwriteExisting,
        variantNumbers: args.variants,
      },
    ];
  } else if (args.theme) {
    items = (await loadNounsForTheme(args.theme, args.limit)).map((item) => ({
      ...item,
      overwriteExisting: args.overwriteExisting,
      variantNumbers: args.variants,
    }));
  } else {
    items = (await loadNounsForGeneration(args.limit)).map((item) => ({
      ...item,
      overwriteExisting: args.overwriteExisting,
      variantNumbers: args.variants,
    }));
  }

  if (args.exclude.length > 0) {
    const excluded = new Set(args.exclude);
    items = items.filter((item) => !excluded.has(item.lemma.trim().toLowerCase()));
  }

  if (items.length === 0) {
    console.log("No nouns found for generation.");
    return;
  }

  console.log(
    `Starting noun image generation for ${items.length} lemma(s) with concurrency ${args.concurrency}.`
  );

  const failures: Array<{ lemma: string; error: string }> = [];

  await runPool(items, args.concurrency, async (item, index) => {
    const label = `[${index + 1}/${items.length}] ${item.lemma}`;
    console.log(`${label} starting`);

    try {
      const result = await generateNounImageSet(item);
      console.log(
        `${label} complete -> ${result.map((image) => image.imagePath).join(", ")}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ lemma: item.lemma, error: message });
      console.error(`${label} failed -> ${message}`);
    }
  });

  if (failures.length > 0) {
    console.error(`Completed with ${failures.length} failure(s).`);
    for (const failure of failures) {
      console.error(`- ${failure.lemma}: ${failure.error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("All noun images generated successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
