import { NextRequest, NextResponse } from "next/server";

import { AdminAuthorizationError, requireAdmin } from "@/lib/admin/auth";

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN?.trim();
const REPLICATE_MODEL_VERSION = process.env.REPLICATE_MODEL_VERSION;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.GENERATED_IMAGES_BUCKET ?? "generated-images";

if (!REPLICATE_TOKEN) {
  console.warn("REPLICATE_API_TOKEN is not set");
}
if (!REPLICATE_MODEL_VERSION) {
  console.warn("REPLICATE_MODEL_VERSION is not set");
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("Supabase env vars missing");
}

type ReplicatePrediction = {
  id: string;
  status: string;
  output?: unknown;
};

async function createReplicatePrediction(input: Record<string, unknown>, modelVersion: string) {
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Token ${REPLICATE_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: modelVersion,
      input,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate create failed: ${res.status} ${text}`);
  }

  return res.json() as Promise<ReplicatePrediction>;
}

async function pollPrediction(predictionId: string, timeoutMs = 120000, intervalMs = 2000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await fetch(`https://api.replicate.com/v1/predictions/${predictionId}`, {
      headers: { Authorization: `Token ${REPLICATE_TOKEN}` },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Replicate poll failed: ${res.status} ${text}`);
    }
    const json = await res.json() as ReplicatePrediction;
    if (json.status === "succeeded") return json;
    if (json.status === "failed") throw new Error(`Replicate prediction failed: ${JSON.stringify(json)}`);
    // still running
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Replicate prediction timed out");
}

export async function POST(req: NextRequest) {
  try {
    if (req.headers.get("origin") !== req.nextUrl.origin) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
    await requireAdmin();

    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > 64 * 1024) {
      return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
    }
    if (!REPLICATE_TOKEN || !REPLICATE_MODEL_VERSION) {
      return NextResponse.json({ error: "Server not configured: missing replicate env" }, { status: 500 });
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server not configured: missing supabase env" }, { status: 500 });
    }

    const body = await req.json() as Record<string, unknown>;
    const {
      prompt,
      masterImageUrl,
      filenamePrefix = "gen",
      filenameBase,
      negativePrompt,
      options,
      modelVersion,
    } = body || {};

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing required field: prompt" }, { status: 400 });
    }
    const resolvedModelVersion = typeof modelVersion === "string" && modelVersion.trim()
      ? modelVersion.trim()
      : REPLICATE_MODEL_VERSION;
    if (!resolvedModelVersion) {
      return NextResponse.json({ error: "Server not configured: missing model version" }, { status: 500 });
    }

    // Build the input object for the model.
    // NOTE: SDXL models accept various inputs; here we include prompt and optionally an image reference.
    const input: Record<string, unknown> = {
      prompt,
      ...(negativePrompt ? { negative_prompt: negativePrompt } : null),
      ...(options && typeof options === "object" ? options : null),
      // you can tune other parameters for the model here (num_images, width, height, etc.)
      // e.g. "num_outputs": 1
    };

    if (masterImageUrl) {
      // Provide reference image(s) to the model if available
      // Some Replicate SDXL wrappers accept "image" or "image[]"; keeping it as "image" is commonly accepted.
      // If your model variant expects a different key (init_image, image_urls), adapt accordingly.
      input.image = masterImageUrl;
    }

    // 1) Create prediction
    const created = await createReplicatePrediction(input, resolvedModelVersion);
    const predictionId = created.id;
    // 2) Poll until succeeded
    const result = await pollPrediction(predictionId, 2 * 60 * 1000, 2000); // 2 minutes timeout
    // 3) Extract outputs
    // Many models return result.output as array of URLs (or data URIs).
    const outputs = (Array.isArray(result.output) ? result.output : [result.output])
      .filter((value): value is string => typeof value === "string" && value.length > 0);

    // 4) Upload outputs to Supabase Storage
    // Import server-side supabase client lazily to avoid client bundle issues
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const uploadedUrls: string[] = [];

    for (let i = 0; i < outputs.length; i++) {
      const out = outputs[i];
      let buffer: Buffer | null = null;
      let ext = "png";

      if (typeof out === "string" && out.startsWith("data:")) {
        // data URI e.g. data:image/png;base64,...
        const match = out.match(/^data:(image\/[a-zA-Z+]+);base64,(.*)$/);
        if (!match) throw new Error("Unsupported data URI output");
        const mime = match[1];
        const b64 = match[2];
        buffer = Buffer.from(b64, "base64");
        if (mime.includes("jpeg") || mime.includes("jpg")) ext = "jpg";
        else if (mime.includes("webp")) ext = "webp";
      } else if (typeof out === "string") {
        // assume it's a public URL -> fetch it
        const fetchRes = await fetch(out);
        if (!fetchRes.ok) {
          console.warn("Failed to download output URL:", out, fetchRes.status);
          continue;
        }
        const arrayBuffer = await fetchRes.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
        // try to infer extension from headers/url
        const ct = fetchRes.headers.get("content-type") || "";
        if (ct.includes("jpeg") || ct.includes("jpg")) ext = "jpg";
        else if (ct.includes("png")) ext = "png";
        else if (ct.includes("webp")) ext = "webp";
        else {
          const urlLower = out.toLowerCase();
          if (urlLower.endsWith(".jpg") || urlLower.endsWith(".jpeg")) ext = "jpg";
          else if (urlLower.endsWith(".webp")) ext = "webp";
          else if (urlLower.endsWith(".png")) ext = "png";
        }
      } else {
        console.warn("Unknown output type from Replicate:", typeof out, out);
        continue;
      }

      if (!buffer) continue;

      const safeBase = String(filenameBase || filenamePrefix || "gen")
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 100) || "gen";
      const baseName = filenameBase
        ? `${safeBase}${outputs.length > 1 ? `-${i}` : ""}`
        : `${safeBase}-${Date.now()}-${i}`;
      const fileName = `${baseName}.${ext}`;
      const path = `${fileName}`;

      const upload = await supabase.storage.from(BUCKET).upload(path, buffer, {
        contentType: ext === "jpg" ? "image/jpeg" : `image/${ext}`,
        upsert: false,
      });

      if (upload.error) {
        console.error("Supabase upload error:", upload.error);
        continue;
      }

      // get public url (clean and robust)
      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(upload.data.path);
      const pub = publicData?.publicUrl ?? `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(upload.data.path)}`;
      uploadedUrls.push(pub);
    }

    return NextResponse.json({ ok: true, urls: uploadedUrls, replicate: { id: predictionId, status: result.status } });
  } catch (err: unknown) {
    if (err instanceof AdminAuthorizationError) {
      return NextResponse.json({ error: "Administrator access is required." }, { status: err.status });
    }
    console.error("generate-image error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Image generation failed." },
      { status: 500 },
    );
  }
}
