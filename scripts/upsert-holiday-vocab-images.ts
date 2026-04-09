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

type HolidayRow = {
  noun_id: string;
  lemma: string;
  category: "noun";
  image_path: string;
  is_default: boolean;
  is_premium: boolean;
  variant: string;
};

const HOLIDAY_ROWS: HolidayRow[] = [
  {
    noun_id: "d349fc7b-82b7-46e1-bee1-fdcf9948c658",
    lemma: "budha's birthday",
    category: "noun",
    image_path: "nouns/budha's birthday/budha's birthday_1.png",
    is_default: true,
    is_premium: false,
    variant: "budha's birthday_1",
  },
  {
    noun_id: "d349fc7b-82b7-46e1-bee1-fdcf9948c658",
    lemma: "budha's birthday",
    category: "noun",
    image_path: "nouns/budha's birthday/budha's birthday_2.png",
    is_default: false,
    is_premium: true,
    variant: "budha's birthday_2",
  },
  {
    noun_id: "2e7b5e29-6cbf-4714-be57-c8f4083e984e",
    lemma: "children's day",
    category: "noun",
    image_path: "nouns/children's day/children's day_1.png",
    is_default: true,
    is_premium: false,
    variant: "children's day_1",
  },
  {
    noun_id: "2e7b5e29-6cbf-4714-be57-c8f4083e984e",
    lemma: "children's day",
    category: "noun",
    image_path: "nouns/children's day/children's day_2.png",
    is_default: false,
    is_premium: true,
    variant: "children's day_2",
  },
  {
    noun_id: "31185790-9085-4454-8755-c73d3274e652",
    lemma: "christmas",
    category: "noun",
    image_path: "nouns/christmas_holidays/christmas_holidays_1.png",
    is_default: true,
    is_premium: false,
    variant: "christmas_1",
  },
  {
    noun_id: "31185790-9085-4454-8755-c73d3274e652",
    lemma: "christmas",
    category: "noun",
    image_path: "nouns/christmas_holidays/christmas_holidays_2.png",
    is_default: false,
    is_premium: true,
    variant: "christmas_2",
  },
  {
    noun_id: "5aa38caf-b8f8-48c0-8c99-3fe83341f3f2",
    lemma: "christmas eve",
    category: "noun",
    image_path: "nouns/christmas eve/christmas eve_1.png",
    is_default: true,
    is_premium: false,
    variant: "christmas eve_1",
  },
  {
    noun_id: "5aa38caf-b8f8-48c0-8c99-3fe83341f3f2",
    lemma: "christmas eve",
    category: "noun",
    image_path: "nouns/christmas eve/christmas eve_2.png",
    is_default: false,
    is_premium: true,
    variant: "christmas eve_2",
  },
  {
    noun_id: "439a7acf-9f8d-4063-a720-305c03586dd7",
    lemma: "diwali",
    category: "noun",
    image_path: "nouns/diwali/diwali_1.png",
    is_default: true,
    is_premium: false,
    variant: "diwali_1",
  },
  {
    noun_id: "439a7acf-9f8d-4063-a720-305c03586dd7",
    lemma: "diwali",
    category: "noun",
    image_path: "nouns/diwali/diwali_2.png",
    is_default: false,
    is_premium: true,
    variant: "diwali_2",
  },
  {
    noun_id: "ea4110f8-e8b7-48ca-89bd-e102e8e7e802",
    lemma: "easter",
    category: "noun",
    image_path: "nouns/easter/easter_1.png",
    is_default: true,
    is_premium: false,
    variant: "easter_1",
  },
  {
    noun_id: "ea4110f8-e8b7-48ca-89bd-e102e8e7e802",
    lemma: "easter",
    category: "noun",
    image_path: "nouns/easter/easter_2.png",
    is_default: false,
    is_premium: true,
    variant: "easter_2",
  },
  {
    noun_id: "cbcabd5b-fd91-48a5-8de6-4f824adf2481",
    lemma: "halloween",
    category: "noun",
    image_path: "nouns/halloween_holidays/halloween_holidays_1.png",
    is_default: true,
    is_premium: false,
    variant: "halloween_1",
  },
  {
    noun_id: "cbcabd5b-fd91-48a5-8de6-4f824adf2481",
    lemma: "halloween",
    category: "noun",
    image_path: "nouns/halloween_holidays/halloween_holidays_2.png",
    is_default: false,
    is_premium: true,
    variant: "halloween_2",
  },
  {
    noun_id: "765f18ee-bbf6-49dc-bdb0-8dce647b963a",
    lemma: "hanukkah",
    category: "noun",
    image_path: "nouns/hanukkah/hanukkah_1.png",
    is_default: true,
    is_premium: false,
    variant: "hanukkah_1",
  },
  {
    noun_id: "765f18ee-bbf6-49dc-bdb0-8dce647b963a",
    lemma: "hanukkah",
    category: "noun",
    image_path: "nouns/hanukkah/hanukkah_2.png",
    is_default: false,
    is_premium: true,
    variant: "hanukkah_2",
  },
  {
    noun_id: "3a70fbd2-ea20-48f5-bcc4-f91aa6762f85",
    lemma: "independence day",
    category: "noun",
    image_path: "nouns/independence day/independence day_1.png",
    is_default: true,
    is_premium: false,
    variant: "independence day_1",
  },
  {
    noun_id: "3a70fbd2-ea20-48f5-bcc4-f91aa6762f85",
    lemma: "independence day",
    category: "noun",
    image_path: "nouns/independence day/independence day_2.png",
    is_default: false,
    is_premium: true,
    variant: "independence day_2",
  },
  {
    noun_id: "b9b5c6f4-7d71-4a6c-b031-04604e5c73c1",
    lemma: "lunar new year",
    category: "noun",
    image_path: "nouns/lunar new year/lunar new year_1.png",
    is_default: true,
    is_premium: false,
    variant: "lunar new year_1",
  },
  {
    noun_id: "b9b5c6f4-7d71-4a6c-b031-04604e5c73c1",
    lemma: "lunar new year",
    category: "noun",
    image_path: "nouns/lunar new year/lunar new year_2.png",
    is_default: false,
    is_premium: true,
    variant: "lunar new year_2",
  },
  {
    noun_id: "3518c5fd-e50b-4a6f-9b5c-c628844247a8",
    lemma: "new year's eve",
    category: "noun",
    image_path: "nouns/new year's eve/new year's eve_1.png",
    is_default: true,
    is_premium: false,
    variant: "new year's eve_1",
  },
  {
    noun_id: "3518c5fd-e50b-4a6f-9b5c-c628844247a8",
    lemma: "new year's eve",
    category: "noun",
    image_path: "nouns/new year's eve/new year's eve_2.png",
    is_default: false,
    is_premium: true,
    variant: "new year's eve_2",
  },
  {
    noun_id: "6ca504fc-20e6-4b4f-b7a1-5e92859b63a6",
    lemma: "ramadan",
    category: "noun",
    image_path: "nouns/ramadan/ramadan_1.png",
    is_default: true,
    is_premium: false,
    variant: "ramadan_1",
  },
  {
    noun_id: "6ca504fc-20e6-4b4f-b7a1-5e92859b63a6",
    lemma: "ramadan",
    category: "noun",
    image_path: "nouns/ramadan/ramadan_2.png",
    is_default: false,
    is_premium: true,
    variant: "ramadan_2",
  },
  {
    noun_id: "f2e52ab0-74bb-475b-bd8a-55008638efd4",
    lemma: "st patrick's day",
    category: "noun",
    image_path: "nouns/st patrick's day/st patrick's day_1.png",
    is_default: true,
    is_premium: false,
    variant: "st patrick's day_1",
  },
  {
    noun_id: "f2e52ab0-74bb-475b-bd8a-55008638efd4",
    lemma: "st patrick's day",
    category: "noun",
    image_path: "nouns/st patrick's day/st patrick's day_2.png",
    is_default: false,
    is_premium: true,
    variant: "st patrick's day_2",
  },
  {
    noun_id: "110f3d48-0722-4a75-bebb-34f0a81f8e34",
    lemma: "thanksgiving",
    category: "noun",
    image_path: "nouns/thanksgiving/thanksgiving_1.png",
    is_default: true,
    is_premium: false,
    variant: "thanksgiving_1",
  },
  {
    noun_id: "110f3d48-0722-4a75-bebb-34f0a81f8e34",
    lemma: "thanksgiving",
    category: "noun",
    image_path: "nouns/thanksgiving/thanksgiving_2.png",
    is_default: false,
    is_premium: true,
    variant: "thanksgiving_2",
  },
  {
    noun_id: "9af9c4bc-c4bd-4309-8075-d7a7cc8fcded",
    lemma: "valentines day",
    category: "noun",
    image_path: "nouns/valentines day/valentines day_1.png",
    is_default: true,
    is_premium: false,
    variant: "valentines day_1",
  },
  {
    noun_id: "9af9c4bc-c4bd-4309-8075-d7a7cc8fcded",
    lemma: "valentines day",
    category: "noun",
    image_path: "nouns/valentines day/valentines day_2.png",
    is_default: false,
    is_premium: true,
    variant: "valentines day_2",
  },
];

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

  const nounIds = [...new Set(HOLIDAY_ROWS.map((row) => row.noun_id))];

  const { error: deleteError } = await supabase
    .from("vocab_images")
    .delete()
    .in("noun_id", nounIds);

  if (deleteError) {
    throw new Error(`Failed to delete existing holiday vocab_images rows: ${deleteError.message}`);
  }

  const { error: insertError } = await supabase
    .from("vocab_images")
    .insert(HOLIDAY_ROWS);

  if (insertError) {
    throw new Error(`Failed to insert holiday vocab_images rows: ${insertError.message}`);
  }

  console.log(`Inserted ${HOLIDAY_ROWS.length} holiday vocab_images rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
