import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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
    outputDir: string;
    keepTheme: string;
    dryRun: boolean;
    limit?: number;
  } = {
    outputDir: "/Users/Sean/Desktop/verbs-backup",
    keepTheme: "action",
    dryRun: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--output-dir=")) {
      parsed.outputDir = arg.split("=")[1]?.trim() || parsed.outputDir;
    } else if (arg.startsWith("--keep-theme=")) {
      parsed.keepTheme = arg.split("=")[1]?.trim().toLowerCase() || parsed.keepTheme;
    } else if (arg.startsWith("--limit=")) {
      const value = Number(arg.split("=")[1]);
      if (Number.isFinite(value) && value > 0) parsed.limit = value;
    } else if (arg === "--dry-run") {
      parsed.dryRun = true;
    }
  }

  return parsed;
}

function extractStorageInfo(imageUrl: string) {
  try {
    const parsed = new URL(imageUrl);
    const parts = parsed.pathname.split("/").filter(Boolean);
    const objectIndex = parts.findIndex((part) => part === "object");
    if (objectIndex < 0) return null;
    const publicIndex = objectIndex + 1;
    if (parts[publicIndex] !== "public") return null;
    const bucket = parts[publicIndex + 1];
    const objectPath = parts.slice(publicIndex + 2).join("/");
    if (!bucket || !objectPath) return null;
    return { bucket, objectPath };
  } catch {
    return null;
  }
}

async function main() {
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));

  const args = parseArgs();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing Supabase env vars.");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let query = supabase
    .from("verbs")
    .select("lemma,themes,image_id")
    .not("image_id", "is", null)
    .order("lemma", { ascending: true });

  if (args.limit) {
    query = query.limit(args.limit);
  }

  const { data, error } = await query;
  if (error) throw error;

  const allRows = data ?? [];
  const filtered = allRows.filter((row: any) => {
    const themes = (row.themes ?? []).map((t: string) => String(t).toLowerCase());
    return !themes.includes(args.keepTheme);
  });

  const downloadTargets = filtered
    .map((row: any) => ({
      lemma: String(row.lemma ?? ""),
      imageUrl: String(row.image_id ?? ""),
      storage: extractStorageInfo(String(row.image_id ?? "")),
    }))
    .filter((item) => item.lemma && item.imageUrl && item.storage);

  console.log(
    JSON.stringify(
      {
        keepThemeOnSupabase: args.keepTheme,
        outputDir: args.outputDir,
        totalVerbsWithImages: allRows.length,
        selectedForBackup: downloadTargets.length,
        dryRun: args.dryRun,
      },
      null,
      2
    )
  );

  if (args.dryRun) {
    console.log("Sample paths:");
    for (const item of downloadTargets.slice(0, 10)) {
      console.log(`${item.lemma} -> ${item.storage!.bucket}/${item.storage!.objectPath}`);
    }
    return;
  }

  let done = 0;
  for (const item of downloadTargets) {
    const info = item.storage!;
    const response = await fetch(item.imageUrl, { cache: "no-store" });
    if (!response.ok) {
      console.error(`Failed ${item.lemma}: ${response.status}`);
      continue;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const localPath = path.join(args.outputDir, info.bucket, info.objectPath);
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, buffer);

    done += 1;
    console.log(`Backed up ${done}/${downloadTargets.length}: ${info.bucket}/${info.objectPath}`);
  }

  console.log(`Backup complete. Files written: ${done}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
