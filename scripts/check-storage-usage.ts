import fs from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Entry = { name: string; metadata?: Record<string, unknown> | null };

function load(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}

async function listAll(
  supabase: SupabaseClient,
  bucket: string,
  folder: string
) {
  const rows: Entry[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(folder, {
      limit: 100,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw error;
    const batch = (data ?? []) as unknown as Entry[];
    rows.push(...batch);
    if (batch.length < 100) break;
    offset += 100;
  }
  return rows;
}

async function walk(
  supabase: SupabaseClient,
  bucket: string,
  folder: string
): Promise<Array<{ path: string; size: number }>> {
  const entries = await listAll(supabase, bucket, folder);
  const out: Array<{ path: string; size: number }> = [];

  for (const entry of entries) {
    const name = String(entry.name ?? "");
    if (!name) continue;
    const full = folder ? `${folder}/${name}` : name;
    const lower = name.toLowerCase();
    if (
      lower.endsWith(".png") ||
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".webp") ||
      lower.endsWith(".gif") ||
      lower.endsWith(".svg") ||
      lower.endsWith(".pdf")
    ) {
      const size = Number((entry.metadata as any)?.size ?? 0);
      out.push({ path: full, size: Number.isFinite(size) ? size : 0 });
      continue;
    }
    out.push(...(await walk(supabase, bucket, full)));
  }

  return out;
}

async function main() {
  load(path.join(process.cwd(), ".env.local"));
  load(path.join(process.cwd(), ".env"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase env vars");

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) throw error;

  const report: Array<{ bucket: string; files: number; bytes: number }> = [];
  let totalBytes = 0;

  for (const bucket of buckets ?? []) {
    const files = await walk(supabase, bucket.name, "");
    const bytes = files.reduce((sum, f) => sum + f.size, 0);
    totalBytes += bytes;
    report.push({ bucket: bucket.name, files: files.length, bytes });
  }

  const toMb = (n: number) => Number((n / 1024 / 1024).toFixed(2));
  const out = {
    totalBytes,
    totalMB: toMb(totalBytes),
    freePlanLimitMB: 1024,
    underFreePlan: toMb(totalBytes) <= 1024,
    buckets: report
      .map((r) => ({ ...r, mb: toMb(r.bytes) }))
      .sort((a, b) => b.bytes - a.bytes),
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
