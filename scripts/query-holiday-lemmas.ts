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
  loadEnvFile(path.join(process.cwd(), ".env.local"));
  loadEnvFile(path.join(process.cwd(), ".env"));

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  const { data, error } = await supabase
    .from("nouns")
    .select("lemma")
    .contains("themes", ["holidays"])
    .order("lemma", { ascending: true });

  if (error) throw error;

  console.log(JSON.stringify((data ?? []).map((row) => row.lemma), null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
