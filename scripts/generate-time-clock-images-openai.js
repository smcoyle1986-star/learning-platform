const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const idx = trimmed.indexOf("=");
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const lemmas = [
  "eight fifteen",
  "eight forty-five",
  "eight o'clock",
  "eight thirty",
  "eleven o'clock",
  "five fifteen",
  "five forty-five",
  "five o'clock",
  "five thirty",
  "four o'clock",
  "nine o'clock",
  "one o'clock",
  "seven o'clock",
  "six o'clock",
  "ten fifteen",
  "ten forty-five",
  "ten o'clock",
  "ten thirty",
  "three o'clock",
  "twelve o'clock",
  "two fifteen",
  "two forty-five",
  "two o'clock",
  "two thirty",
];

const hourWords = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

function parseTime(lemma) {
  const parts = lemma.toLowerCase().split(" ");
  const hour = hourWords[parts[0]];
  if (!hour) throw new Error(`Unsupported hour in lemma: ${lemma}`);

  let minutes = 0;
  if (lemma.includes("fifteen")) minutes = 15;
  else if (lemma.includes("thirty")) minutes = 30;
  else if (lemma.includes("forty-five")) minutes = 45;
  else if (lemma.includes("o'clock")) minutes = 0;
  else throw new Error(`Unsupported minute format in lemma: ${lemma}`);

  return { hour, minutes };
}

function formatDigital(hour, minutes) {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  return `${hh}:${mm}`;
}

function toFolderName(lemma) {
  return lemma.replace(/ /g, "_");
}

function buildPrompt(lemma, hour, minutes) {
  return [
    "Create a single analog clock face icon illustration only.",
    `The clock must show exactly ${lemma} (${formatDigital(hour, minutes)}).`,
    "No people, no text, no background, no extra objects, no border scene.",
    "Transparent alpha PNG background.",
    "Clock face only, centered, large, fully visible.",
    "Show clear numbers 1 through 12 around the dial.",
    "Hour hand and minute hand must be clearly different length and color.",
    "Minute hand longer than hour hand.",
    "Use clean educational style, high contrast, easy for children to read.",
    "No shadows outside clock. No watermark.",
  ].join(" ");
}

async function generateOne(apiKey, lemma, outPath) {
  const { hour, minutes } = parseTime(lemma);
  const prompt = buildPrompt(lemma, hour, minutes);

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      background: "transparent",
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI image generation failed (${response.status}): ${text}`);
  }

  const json = await response.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error(`No image data returned for lemma: ${lemma}`);
  fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is missing in environment.");
  }

  const root = "/Users/Sean/Downloads/time";
  fs.mkdirSync(root, { recursive: true });

  for (let i = 0; i < lemmas.length; i += 1) {
    const lemma = lemmas[i];
    const folder = path.join(root, toFolderName(lemma));
    fs.mkdirSync(folder, { recursive: true });
    const outPath = path.join(folder, "lemma_1.png");

    process.stdout.write(`[${i + 1}/${lemmas.length}] ${lemma} ... `);
    try {
      await generateOne(apiKey, lemma, outPath);
      process.stdout.write(`saved -> ${outPath}\n`);
    } catch (error) {
      process.stdout.write(`failed\n`);
      console.error(error instanceof Error ? error.message : String(error));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

