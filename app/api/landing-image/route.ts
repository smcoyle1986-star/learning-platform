import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "Classendo-images";

function contentTypeForPath(filePath: string) {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".avif")) return "image/avif";
  return "application/octet-stream";
}

function sniffContentType(buffer: Buffer, filePath: string) {
  if (buffer.length >= 8) {
    const png = buffer.subarray(0, 8);
    if (
      png[0] === 0x89 &&
      png[1] === 0x50 &&
      png[2] === 0x4e &&
      png[3] === 0x47 &&
      png[4] === 0x0d &&
      png[5] === 0x0a &&
      png[6] === 0x1a &&
      png[7] === 0x0a
    ) {
      return "image/png";
    }

    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return "image/jpeg";
    }

    const prefix = buffer.subarray(0, Math.min(buffer.length, 256)).toString("utf8").trimStart();
    if (prefix.startsWith("<svg") || prefix.startsWith("<?xml")) {
      return "image/svg+xml";
    }

    if (
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38 &&
      (buffer[4] === 0x39 || buffer[4] === 0x37) &&
      buffer[5] === 0x61
      ) {
      return "image/gif";
    }
  }

  if (buffer.length >= 12) {
    const riff = buffer.subarray(0, 4).toString("ascii");
    const webp = buffer.subarray(8, 12).toString("ascii");
    if (riff === "RIFF" && webp === "WEBP") {
      return "image/webp";
    }
  }

  const pathType = contentTypeForPath(filePath);
  if (pathType !== "application/octet-stream") return pathType;

  return "image/png";
}

export async function GET(request: Request) {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return NextResponse.json({ error: "Missing Supabase env" }, { status: 500 });
    }

    const url = new URL(request.url);
    const path = url.searchParams.get("path")?.trim();
    if (!path) {
      return NextResponse.json({ error: "Missing path" }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? "Unable to load image" }, { status: 404 });
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    const requestedWidth = Number(url.searchParams.get("width"));
    const requestedQuality = Number(url.searchParams.get("quality"));
    const width = Number.isFinite(requestedWidth)
      ? Math.min(Math.max(Math.round(requestedWidth), 160), 1920)
      : null;
    const quality = Number.isFinite(requestedQuality)
      ? Math.min(Math.max(Math.round(requestedQuality), 40), 90)
      : 72;
    const shouldTransform = width !== null || url.searchParams.get("format") === "webp";
    const output = shouldTransform
      ? await sharp(buffer)
          .resize({ width: width ?? undefined, withoutEnlargement: true })
          .webp({ quality })
          .toBuffer()
      : buffer;

    return new NextResponse(output, {
      status: 200,
      headers: {
        "Content-Type": shouldTransform ? "image/webp" : sniffContentType(buffer, path),
        // Versioned landing URLs allow browser and edge caches to retain a compact
        // derived asset without making future artwork uploads impossible to publish.
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to proxy landing image:", error);
    return NextResponse.json({ error: "Failed to load image" }, { status: 500 });
  }
}
