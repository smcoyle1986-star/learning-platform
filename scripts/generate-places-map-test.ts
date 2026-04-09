import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

import { normalizeFlashcardPng } from "../lib/noun-images/image-processing";
import { generateImageWithOpenAI } from "../lib/noun-images/openai-image-client";
import { planNounImageVariants } from "../lib/noun-images/planner";
import { buildNounImagePrompt } from "../lib/noun-images/prompt-builder";

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

async function main() {
  parseEnvFile(path.join(process.cwd(), ".env.local"));
  parseEnvFile(path.join(process.cwd(), ".env"));

  const args = process.argv.slice(2);
  const lemmaArg = args.find((arg) => arg.startsWith("--lemmas="));
  const qualityArg = args.find((arg) => arg.startsWith("--qualities="));

  const lemmas = (lemmaArg
    ? lemmaArg
        .split("=")[1]
        ?.split(",")
        .map((value) => value.trim())
        .filter(Boolean)
    : ["library", "hospital", "restaurant", "school"]) ?? [];

  const qualities = ((qualityArg
    ? qualityArg
        .split("=")[1]
        ?.split(",")
        .map((value) => value.trim())
        .filter((value): value is "medium" | "high" => value === "medium" || value === "high")
    : ["medium", "high"]) ?? []) as Array<"medium" | "high">;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRole) {
    throw new Error("Supabase env vars are missing.");
  }

  const supabase = createClient(supabaseUrl, serviceRole, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const results: Array<{
    lemma: string;
    quality: string;
    imagePath: string;
    publicUrl: string;
  }> = [];

  for (const quality of qualities) {
    for (const lemma of lemmas) {
      const variant = planNounImageVariants({
        lemma,
        countability: "count",
      }).find((entry) => entry.variantNumber === 2);

      if (!variant) {
        throw new Error(`No variant 2 found for ${lemma}`);
      }

      const { prompt } = buildNounImagePrompt({
        lemma,
        countability: "count",
        variant,
      });

      const { imageBuffer } = await generateImageWithOpenAI({
        prompt,
        modelOverride: "gpt-image-1",
        qualityOverride: quality,
        useStyleReference: variant.useStyleReference,
        styleReferencePath: variant.styleReferencePath,
      });

      const normalized = await normalizeFlashcardPng(imageBuffer, {
        maxSubjectSize: 992,
      });

      const imagePath = `test/places_map_${quality}/${lemma}_2.png`;
      const { error: uploadError } = await supabase.storage
        .from("vocab-images")
        .upload(imagePath, normalized.buffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Upload failed for ${imagePath}: ${uploadError.message}`);
      }

      const publicUrl = supabase.storage.from("vocab-images").getPublicUrl(imagePath).data
        .publicUrl;

      results.push({
        lemma,
        quality,
        imagePath,
        publicUrl,
      });

      console.log(`${quality} ${lemma} -> ${imagePath}`);
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
