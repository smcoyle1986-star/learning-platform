// Batch-generate verb images via local API and store URLs in Supabase.
// Usage: node scripts/generate-verb-images.js [--limit=10] [--dry-run] [--gender=girl|boy|alternate|random] [--no-style] [--two-step]

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function parseEnvFile(filePath) {
  const env = {};
  if (!fs.existsSync(filePath)) return env;
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
    env[key] = value;
  }
  return env;
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\-]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { limit: null, dryRun: false, allowUnknown: false, gender: "alternate", noStyle: false, twoStep: false };
  for (const arg of args) {
    if (arg.startsWith("--limit=")) {
      const v = Number(arg.split("=")[1]);
      out.limit = Number.isFinite(v) ? v : null;
    } else if (arg === "--dry-run") {
      out.dryRun = true;
    } else if (arg === "--allow-unknown") {
      out.allowUnknown = true;
    } else if (arg.startsWith("--gender=")) {
      const v = arg.split("=")[1];
      if (v === "girl" || v === "boy" || v === "alternate" || v === "random") {
        out.gender = v;
      }
    } else if (arg === "--no-style") {
      out.noStyle = true;
    } else if (arg === "--two-step") {
      out.twoStep = true;
    }
  }
  return out;
}

async function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function requestWithRetry(url, options, maxRetries = 4) {
  let attempt = 0;
  while (true) {
    const res = await fetch(url, options);
    if (res.status !== 429) return res;
    const json = await res.json().catch(() => ({}));
    const retryAfter = Number(json?.retry_after ?? json?.detail?.retry_after ?? 0);
    const waitMs = retryAfter > 0 ? retryAfter * 1000 : 12000;
    console.log(`Rate limited (429). Waiting ${Math.ceil(waitMs / 1000)}s...`);
    await delay(waitMs);
    attempt += 1;
    if (attempt > maxRetries) return res;
  }
}

async function main() {
  const { limit, dryRun, allowUnknown, gender, noStyle, twoStep } = parseArgs();
  const envPath = path.join(process.cwd(), ".env.local");
  const env = { ...parseEnvFile(envPath), ...process.env };

  const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
  const API_BASE = env.LOCAL_API_BASE || "http://localhost:3000";

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase env vars. Check .env.local");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  let query = supabase.from("verbs").select("id, lemma, image_id").is("image_id", null);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) {
    console.error("Failed to fetch verbs:", error);
    process.exit(1);
  }

  if (!data || data.length === 0) {
    console.log("No verbs with image_id = null found.");
    return;
  }

  console.log(`Found ${data.length} verbs to generate.`);

  const negativePrompt = [
    "realistic",
    "photorealistic",
    "anime",
    "manga",
    "3d render",
    "hard outlines",
    "sharp shadows",
    "text",
    "watermark",
    "open mouth",
    "mouth open",
    "shouting",
    "surprised face",
    "idle pose",
    "standing still",
    "holding object without action",
    "no action",
    "background",
    "scenery",
    "room",
    "furniture",
    "landscape",
    "gradient background",
    "vignette",
    "shadow on background",
    "static pose",
    "idle standing",
  ].join(", ");

  const styleRefGirl =
    env.STYLE_REFERENCE_URL_GIRL ||
    env.STYLE_REFERENCE_URL ||
    "https://tsccyjrniiamnwgrtvpw.supabase.co/storage/v1/object/public/generated-images/gen-1770462333478-0.png";
  const styleRefBoy = env.STYLE_REFERENCE_URL_BOY || "";
  const styleText =
    env.STYLE_TEXT ||
    "cute children's book illustration, rounded proportions, large simple eyes, clean medium outline, soft gradient shading, pastel colors";
  const controlnetVersion =
    env.REPLICATE_CONTROLNET_MODEL_VERSION ||
    "d63e0b238b2d963d90348e2dad19830fbe372a7a43d90d234b2b63cae76d4397";

  const actionsPath = path.join(process.cwd(), "scripts", "verb-actions.json");
  const actions = fs.existsSync(actionsPath)
    ? JSON.parse(fs.readFileSync(actionsPath, "utf8"))
    : {};
  const missing = [];
  const propRules = [
    { re: /^(read|reading)$/i, hint: "open book visible" },
    { re: /^(write|writing|draw|drawing|paint|painting)$/i, hint: "paper visible on a table, pencil or crayon touching paper, drawing or writing visible" },
    { re: /^(watch|watching)$/i, hint: "tv screen in front, character sitting facing the screen" },
    { re: /^(play|playing)$/i, hint: "toys on the floor, hands actively touching toys" },
    { re: /^(go|going|walk|walking)$/i, hint: "direction sign with arrow, walking toward it" },
    { re: /^(cook|cooking)$/i, hint: "kitchen counter visible, pot or pan ON counter, spoon in hand, adult nearby supervising" },
    { re: /^(make|making|build|building|craft|crafting)$/i, hint: "simple craft item being made, hands actively working, item partially completed" },
    { re: /^(eat|eating|drink|drinking)$/i, hint: "food or cup touching lips, action mid-bite or sip" },
    { re: /^(swim|swimming)$/i, hint: "swimwear, water visible, swimming motion" },
    { re: /^(sleep|sleeping|nap|napping)$/i, hint: "pillow and blanket visible, eyes closed" },
    { re: /^(sing|singing)$/i, hint: "musical note icon nearby, cheerful expression" },
    { re: /^(listen|listening)$/i, hint: "hand near ear or small music note icon" },
    { re: /^(clean|cleaning)$/i, hint: "hands pressing cloth ON table surface, wiping motion, table clearly visible" },
    { re: /^(tidy|tidying)$/i, hint: "picking up toys and placing them INTO a box, toy halfway inside box" },
  ];

  for (let i = 0; i < data.length; i++) {
    const verb = data[i];
    const lemma = verb.lemma;
    const baseName = slugify(lemma);
    const action = actions[lemma];
    const propHint = propRules.find((r) => r.re.test(lemma))?.hint;
    const pick =
      gender === "girl"
        ? "girl"
        : gender === "boy"
          ? "boy"
          : gender === "random"
            ? Math.random() < 0.5
              ? "girl"
              : "boy"
            : i % 2 === 0
              ? "girl"
              : "boy";
    const genderPrompt =
      pick === "girl"
        ? "girl child, cute bob haircut or ponytail"
        : "boy child, short hair";
    const styleRef = pick === "girl" ? styleRefGirl : styleRefBoy;

    if (!action && !allowUnknown) {
      missing.push(lemma);
      console.log(`Skipping (no action mapping): ${lemma}`);
      continue;
    }

    const actionLine = `ACTION MUST BE CLEAR AND MID-MOTION: ${action || `performing the action of ${lemma}, clear body pose`}`;
    const propLine = propHint ? `REQUIRED PROPS/CONTACT: ${propHint}, prop must be touched or used` : null;
    const prompt = [
      actionLine,
      actionLine,
      propLine,
      "full body child character",
      genderPrompt,
      "simple clothing",
      "closed mouth, calm smile",
      "pure white background, no texture, no gradients, no vignette",
      "action centered and large in frame, props clearly visible",
      "soft watercolor children's book illustration",
      "gentle painterly texture",
      "warm soft light",
      "soft edges",
      "pastel palette",
    ].filter(Boolean).join(", ");

    const payload = {
      prompt,
      negativePrompt,
      masterImageUrl: noStyle ? undefined : (styleRef || undefined),
      filenameBase: baseName,
      options: {
        width: 1024,
        height: 1024,
        scheduler: "K_EULER",
        num_inference_steps: 30,
        guidance_scale: 18,
      },
    };

    console.log(`\n[${i + 1}/${data.length}] ${lemma}`);

    if (dryRun) {
      console.log("DRY RUN: would call /api/generate-image with", payload);
      continue;
    }

    try {
      let finalUrl = null;

      if (twoStep) {
        const actionPayload = {
          ...payload,
          masterImageUrl: undefined,
          filenameBase: `${baseName}-action`,
        };

        const actionRes = await requestWithRetry(`${API_BASE}/api/generate-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(actionPayload),
        });

        const actionJson = await actionRes.json();
        if (!actionRes.ok || !actionJson.ok) {
          console.error("Generate failed (action pass):", actionRes.status, actionJson);
          continue;
        }

        const actionUrl = Array.isArray(actionJson.urls) && actionJson.urls.length ? actionJson.urls[0] : null;
        if (!actionUrl) {
          console.error("No action URL returned for", lemma, actionJson);
          continue;
        }

        const stylePrompt = [
          prompt,
          `STYLE OVERRIDE: ${styleText}`,
          "keep the pose and props from the reference image",
        ].join(", ");

        const stylePayload = {
          ...payload,
          prompt: stylePrompt,
          masterImageUrl: actionUrl,
          filenameBase: baseName,
          modelVersion: controlnetVersion,
          options: {
            num_inference_steps: 30,
            guidance_scale: 7.5,
          },
        };

        const styleRes = await requestWithRetry(`${API_BASE}/api/generate-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(stylePayload),
        });

        const styleJson = await styleRes.json();
        if (!styleRes.ok || !styleJson.ok) {
          console.error("Generate failed (style pass):", styleRes.status, styleJson);
          continue;
        }

        finalUrl = Array.isArray(styleJson.urls) && styleJson.urls.length ? styleJson.urls[0] : null;
        if (!finalUrl) {
          console.error("No styled URL returned for", lemma, styleJson);
          continue;
        }
      } else {
        const res = await requestWithRetry(`${API_BASE}/api/generate-image`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok || !json.ok) {
          console.error("Generate failed:", res.status, json);
          continue;
        }

        finalUrl = Array.isArray(json.urls) && json.urls.length ? json.urls[0] : null;
        if (!finalUrl) {
          console.error("No URL returned for", lemma, json);
          continue;
        }
      }

      const { error: updateError } = await supabase
        .from("verbs")
        .update({ image_id: finalUrl })
        .eq("id", verb.id);

      if (updateError) {
        console.error("Failed to update verb image_id:", updateError);
        continue;
      }

      console.log("Saved:", finalUrl);
    } catch (err) {
      console.error("Unexpected error:", err);
    }

    // Delay to avoid rate limits (Replicate is strict under low credit)
    // await delay(12000);
  }

  if (missing.length) {
    const missingPath = path.join(process.cwd(), "scripts", "verb-actions.missing.txt");
    fs.writeFileSync(missingPath, missing.join("\n") + "\n");
    console.log(`\nMissing action mappings saved to ${missingPath}`);
    console.log("Add those verbs to scripts/verb-actions.json and re-run.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
