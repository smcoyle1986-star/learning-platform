import fs from "node:fs/promises";

import { getEnv, getOptionalEnv } from "@/lib/server/env";

type OpenAIImageResponse = {
  data?: Array<{
    b64_json?: string;
  }>;
};

function getOpenAIImageModel() {
  return getOptionalEnv("OPENAI_IMAGE_MODEL", "gpt-image-2")!;
}

function getOpenAIImageQuality() {
  return getOptionalEnv("OPENAI_IMAGE_QUALITY", "medium")!;
}

function getStyleReferencePath() {
  return getOptionalEnv("NOUN_STYLE_REFERENCE_PATH");
}

function getStyleReferenceUrl() {
  return getOptionalEnv("NOUN_STYLE_REFERENCE_URL");
}

async function parseOpenAIImageResponse(response: Response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI image request failed (${response.status}): ${text}`);
  }

  const json = (await response.json()) as OpenAIImageResponse;
  const b64 = json.data?.[0]?.b64_json;

  if (!b64) {
    throw new Error(`OpenAI image response missing b64_json: ${JSON.stringify(json)}`);
  }

  return Buffer.from(b64, "base64");
}

async function loadStyleReferenceBuffer(overridePath?: string, overrideUrl?: string) {
  const localPath = overridePath ?? getStyleReferencePath();
  if (localPath) {
    return await fs.readFile(localPath);
  }

  const remoteUrl = overrideUrl ?? getStyleReferenceUrl();
  if (remoteUrl) {
    const response = await fetch(remoteUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Failed to download NOUN_STYLE_REFERENCE_URL (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  return null;
}

export async function generateImageWithOpenAI(params: {
  prompt: string;
  modelOverride?: string;
  qualityOverride?: string;
  useStyleReference?: boolean;
  styleReferencePath?: string;
  styleReferenceUrl?: string;
}) {
  const model = params.modelOverride ?? getOpenAIImageModel();
  const quality = params.qualityOverride ?? getOpenAIImageQuality();
  const styleReference = params.useStyleReference === false
    ? null
    : await loadStyleReferenceBuffer(params.styleReferencePath, params.styleReferenceUrl);

  if (styleReference) {
    const form = new FormData();
    form.append("model", model);
    form.append("prompt", params.prompt);
    form.append("size", "1024x1024");
    form.append("quality", quality);
    form.append("background", "transparent");
    form.append("output_format", "png");
    form.append(
      "image[]",
      new Blob([styleReference], { type: "image/png" }),
      "noun-style-reference.png"
    );

    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getEnv("OPENAI_API_KEY")}`,
      },
      body: form,
    });

    return {
      imageBuffer: await parseOpenAIImageResponse(response),
      source: "edit" as const,
    };
  }

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getEnv("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: params.prompt,
      size: "1024x1024",
      quality,
      background: "transparent",
      output_format: "png",
    }),
  });

  return {
    imageBuffer: await parseOpenAIImageResponse(response),
    source: "generate" as const,
  };
}
