import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type StorageBucket = ReturnType<ReturnType<typeof createClient>["storage"]["from"]>;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "Classendo-images";
const ROOT_FOLDER = "landing";

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif"]);

function isImageFile(name: string, mimetype?: string | null) {
  const lower = name.toLowerCase();
  if (mimetype) return mimetype.startsWith("image/");
  return [...IMAGE_EXTENSIONS].some((ext) => lower.endsWith(ext));
}

function isIgnoreFile(name: string) {
  const lower = name.toLowerCase();
  return lower === ".keep" || lower === ".gitkeep" || lower === ".ds_store";
}

function hasFileExtension(name: string) {
  return /\.[a-z0-9]+$/i.test(name);
}

type LandingImage = {
  path: string;
  label: string;
  version: string | null;
};

async function listRecursive(bucket: StorageBucket, folder: string): Promise<LandingImage[]> {
  const collected: LandingImage[] = [];
  const pageSize = 100;
  let offset = 0;

  while (true) {
    const { data, error } = await bucket.list(folder, {
      limit: pageSize,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) throw error;
    const entries = data ?? [];
    if (entries.length === 0) break;

    for (const entry of entries) {
      const name = String(entry.name ?? "").trim();
      if (!name || isIgnoreFile(name)) continue;
      const mimetype = typeof entry.metadata?.mimetype === "string" ? entry.metadata.mimetype : null;

      const fullPath = `${folder}/${name}`.replace(/^\/+/, "");
      if (isImageFile(name, mimetype)) {
        collected.push({
          path: fullPath,
          label: name.replace(/\.[^.]+$/, "").replace(/_/g, " "),
          version: entry.updated_at ?? null,
        });
        continue;
      }

      const nested = await listRecursive(bucket, fullPath);
      if (nested.length > 0) {
        collected.push(...nested);
        continue;
      }

      // Some uploads may be saved as extensionless objects (for example "landing/community_1").
      // Only use the direct object URL fallback when the entry truly has no file extension.
      if (!hasFileExtension(name)) {
        collected.push({
          path: fullPath,
          label: name.replace(/\.[^.]+$/, "").replace(/_/g, " "),
          version: entry.updated_at ?? null,
        });
      }
    }

    if (entries.length < pageSize) break;
    offset += pageSize;
  }

  return collected;
}

export async function GET() {
  try {
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return NextResponse.json({ slides: [] }, { status: 200 });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const bucket = supabase.storage.from(BUCKET);
    const slides = await listRecursive(bucket, ROOT_FOLDER);

    return NextResponse.json({ slides });
  } catch (error) {
    console.error("Failed to load landing images:", error);
    return NextResponse.json({ slides: [] }, { status: 200 });
  }
}
