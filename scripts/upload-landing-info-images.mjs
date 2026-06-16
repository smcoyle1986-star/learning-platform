import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const index = trimmed.indexOf("=");
  if (index === -1) continue;
  env[trimmed.slice(0, index)] = trimmed.slice(index + 1);
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const uploadBucket = supabase.storage.from("Classendo-images");

const common = {
  bg: "#f7f6f2",
  panel: "#ffffff",
  border: "#e3e7db",
  text: "#2f3a2f",
  muted: "#5c665c",
  green: "#86a96a",
  greenDark: "#6f9156",
  blue: "#6f8fd8",
  purple: "#9b8bd6",
  gold: "#d7b56d",
  coral: "#e7a0a0",
  mint: "#dfe8d1",
};

function wrapSvg(inner) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1600" height="900" viewBox="0 0 1600 900" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1600" height="900" rx="56" fill="${common.bg}"/>
  ${inner}
</svg>`;
}

function text(x, y, value, size, weight = 700, fill = common.text, anchor = "start") {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${value}</text>`;
}

const resources = wrapSvg(`
  <defs>
    <linearGradient id="r1" x1="170" y1="120" x2="1430" y2="760" gradientUnits="userSpaceOnUse">
      <stop stop-color="${common.green}" stop-opacity="0.12"/>
      <stop offset="1" stop-color="${common.blue}" stop-opacity="0.10"/>
    </linearGradient>
  </defs>
  <rect x="72" y="72" width="1456" height="756" rx="42" fill="${common.panel}" stroke="${common.border}" stroke-width="2"/>
  <rect x="114" y="110" width="360" height="52" rx="26" fill="${common.mint}"/>
  ${text(144, 145, "Classendo resources for every lesson and learner", 34, 800, common.text)}
  ${text(144, 194, "Explore everything teachers need to build clear, flexible English lessons.", 18, 500, common.muted)}
  <rect x="114" y="252" width="1372" height="482" rx="36" fill="url(#r1)" stroke="${common.border}" stroke-width="1.5"/>
  <g>
    <rect x="160" y="312" width="286" height="312" rx="30" fill="${common.panel}" stroke="${common.border}" stroke-width="2"/>
    <rect x="486" y="312" width="286" height="312" rx="30" fill="${common.panel}" stroke="${common.border}" stroke-width="2"/>
    <rect x="812" y="312" width="286" height="312" rx="30" fill="${common.panel}" stroke="${common.border}" stroke-width="2"/>
    <rect x="1138" y="312" width="286" height="312" rx="30" fill="${common.panel}" stroke="${common.border}" stroke-width="2"/>
    <circle cx="303" cy="400" r="42" fill="${common.green}" fill-opacity="0.20"/>
    <rect x="548" y="360" width="160" height="66" rx="22" fill="${common.blue}" fill-opacity="0.14"/>
    <rect x="874" y="360" width="160" height="66" rx="22" fill="${common.gold}" fill-opacity="0.20"/>
    <rect x="1200" y="360" width="160" height="66" rx="22" fill="${common.coral}" fill-opacity="0.18"/>
    ${text(303, 492, "Flashcards", 26, 800, common.text, "middle")}
    ${text(629, 492, "Games", 26, 800, common.text, "middle")}
    ${text(955, 492, "Worksheets", 26, 800, common.text, "middle")}
    ${text(1281, 492, "Lesson Plans", 26, 800, common.text, "middle")}
    ${text(303, 536, "Vocabulary and images", 16, 500, common.muted, "middle")}
    ${text(629, 536, "Whole-class activities", 16, 500, common.muted, "middle")}
    ${text(955, 536, "Printable practice", 16, 500, common.muted, "middle")}
    ${text(1281, 536, "Ready-to-use teaching flow", 16, 500, common.muted, "middle")}
  </g>
`);

const flowchart = wrapSvg(`
  <rect x="72" y="72" width="1456" height="756" rx="42" fill="${common.panel}" stroke="${common.border}" stroke-width="2"/>
  <rect x="114" y="110" width="290" height="52" rx="26" fill="${common.mint}"/>
  ${text(144, 145, "How teachers use Classendo", 34, 800, common.text)}
  ${text(144, 194, "Start with one lesson tray and move it into every part of the site.", 18, 500, common.muted)}
  <g>
    <rect x="128" y="300" width="250" height="170" rx="28" fill="${common.panel}" stroke="${common.border}" stroke-width="2"/>
    <rect x="442" y="300" width="250" height="170" rx="28" fill="${common.panel}" stroke="${common.border}" stroke-width="2"/>
    <rect x="756" y="300" width="250" height="170" rx="28" fill="${common.panel}" stroke="${common.border}" stroke-width="2"/>
    <rect x="1070" y="300" width="250" height="170" rx="28" fill="${common.panel}" stroke="${common.border}" stroke-width="2"/>
    <rect x="534" y="300" width="20" height="170" rx="10" fill="${common.green}" fill-opacity="0.18"/>
    <rect x="848" y="300" width="20" height="170" rx="10" fill="${common.blue}" fill-opacity="0.18"/>
    <rect x="1162" y="300" width="20" height="170" rx="10" fill="${common.purple}" fill-opacity="0.18"/>
    <path d="M378 385 H442" stroke="${common.greenDark}" stroke-width="5" stroke-linecap="round"/>
    <path d="M692 385 H756" stroke="${common.greenDark}" stroke-width="5" stroke-linecap="round"/>
    <path d="M1006 385 H1070" stroke="${common.greenDark}" stroke-width="5" stroke-linecap="round"/>
    <polygon points="434,377 446,385 434,393" fill="${common.greenDark}"/>
    <polygon points="748,377 760,385 748,393" fill="${common.greenDark}"/>
    <polygon points="1062,377 1074,385 1062,393" fill="${common.greenDark}"/>
    ${text(253, 375, "Flashcards", 28, 800, common.text, "middle")}
    ${text(253, 418, "Build a tray", 18, 500, common.muted, "middle")}
    ${text(567, 375, "Games", 28, 800, common.text, "middle")}
    ${text(567, 418, "Play as a class", 18, 500, common.muted, "middle")}
    ${text(881, 375, "Worksheets", 28, 800, common.text, "middle")}
    ${text(881, 418, "Practice on paper", 18, 500, common.muted, "middle")}
    ${text(1195, 375, "Printables", 28, 800, common.text, "middle")}
    ${text(1195, 418, "Export and print", 18, 500, common.muted, "middle")}
  </g>
  <g>
    <rect x="300" y="560" width="1000" height="120" rx="28" fill="${common.bg}" stroke="${common.border}" stroke-width="2"/>
    ${text(800, 620, "Lesson tray → activity → print or save → use again", 30, 800, common.text, "middle")}
    ${text(800, 658, "One tray can power flashcards, games, worksheets, printables, and lesson plans.", 18, 500, common.muted, "middle")}
  </g>
`);

const freeVsPremium = wrapSvg(`
  <rect x="72" y="72" width="1456" height="756" rx="42" fill="${common.panel}" stroke="${common.border}" stroke-width="2"/>
  <rect x="114" y="110" width="380" height="52" rx="26" fill="${common.mint}"/>
  ${text(144, 145, "Classendo free and premium plan comparison", 34, 800, common.text)}
  ${text(144, 194, "Choose the version that fits your classroom now, then upgrade when you need more.", 18, 500, common.muted)}
  <g>
    <rect x="146" y="270" width="562" height="420" rx="34" fill="${common.bg}" stroke="${common.border}" stroke-width="2"/>
    <rect x="892" y="270" width="562" height="420" rx="34" fill="${common.bg}" stroke="${common.border}" stroke-width="2"/>
    <rect x="176" y="300" width="160" height="38" rx="19" fill="${common.green}" fill-opacity="0.16"/>
    <rect x="922" y="300" width="190" height="38" rx="19" fill="${common.blue}" fill-opacity="0.16"/>
    ${text(256, 328, "Free", 24, 800, common.text, "middle")}
    ${text(1017, 328, "Premium", 24, 800, common.text, "middle")}
    ${text(256, 390, "Core classroom tools", 22, 700, common.text, "middle")}
    ${text(1017, 390, "Everything unlocked", 22, 700, common.text, "middle")}
    ${text(256, 452, "Flashcards", 18, 500, common.text, "middle")}
    ${text(1017, 452, "Flashcards", 18, 500, common.text, "middle")}
    ${text(256, 500, "One featured game", 18, 500, common.text, "middle")}
    ${text(1017, 500, "All games", 18, 500, common.text, "middle")}
    ${text(256, 548, "One featured worksheet", 18, 500, common.text, "middle")}
    ${text(1017, 548, "All worksheets", 18, 500, common.text, "middle")}
    ${text(256, 596, "Lesson planning", 18, 500, common.text, "middle")}
    ${text(1017, 596, "Saved sets, community, editing", 18, 500, common.text, "middle")}
  </g>
`);

const pricing = wrapSvg(`
  <defs>
    <linearGradient id="p1" x1="160" y1="150" x2="1440" y2="780" gradientUnits="userSpaceOnUse">
      <stop stop-color="${common.green}" stop-opacity="0.12"/>
      <stop offset="1" stop-color="${common.blue}" stop-opacity="0.10"/>
    </linearGradient>
  </defs>
  <rect x="72" y="72" width="1456" height="756" rx="42" fill="${common.panel}" stroke="${common.border}" stroke-width="2"/>
  <rect x="114" y="110" width="300" height="52" rx="26" fill="${common.mint}"/>
  ${text(144, 145, "Classendo premium monthly and yearly pricing", 34, 800, common.text)}
  ${text(144, 194, "Pick the plan that matches how often you teach with Classendo.", 18, 500, common.muted)}
  <rect x="120" y="258" width="1360" height="430" rx="34" fill="url(#p1)" stroke="${common.border}" stroke-width="1.5"/>
  <g>
    <rect x="188" y="316" width="320" height="300" rx="30" fill="${common.panel}" stroke="${common.border}" stroke-width="2"/>
    <rect x="640" y="316" width="320" height="300" rx="30" fill="${common.panel}" stroke="${common.border}" stroke-width="2"/>
    <rect x="1092" y="316" width="320" height="300" rx="30" fill="${common.panel}" stroke="${common.border}" stroke-width="2"/>
    <rect x="236" y="350" width="224" height="40" rx="20" fill="${common.green}" fill-opacity="0.16"/>
    <rect x="688" y="350" width="224" height="40" rx="20" fill="${common.blue}" fill-opacity="0.16"/>
    <rect x="1140" y="350" width="224" height="40" rx="20" fill="${common.purple}" fill-opacity="0.16"/>
    ${text(348, 378, "Free", 24, 800, common.text, "middle")}
    ${text(800, 378, "Monthly", 24, 800, common.text, "middle")}
    ${text(1252, 378, "Yearly", 24, 800, common.text, "middle")}
    ${text(348, 458, "$0", 52, 800, common.text, "middle")}
    ${text(800, 458, "Premium", 40, 800, common.text, "middle")}
    ${text(1252, 458, "Best value", 40, 800, common.text, "middle")}
    ${text(348, 526, "Core tools for teachers", 18, 500, common.muted, "middle")}
    ${text(800, 526, "Flexible monthly access", 18, 500, common.muted, "middle")}
    ${text(1252, 526, "Save more with yearly access", 18, 500, common.muted, "middle")}
    <circle cx="348" cy="570" r="20" fill="${common.green}" fill-opacity="0.18"/>
    <circle cx="800" cy="570" r="20" fill="${common.blue}" fill-opacity="0.18"/>
    <circle cx="1252" cy="570" r="20" fill="${common.purple}" fill-opacity="0.18"/>
    ${text(348, 577, "Get started", 16, 700, common.text, "middle")}
    ${text(800, 577, "Upgrade anytime", 16, 700, common.text, "middle")}
    ${text(1252, 577, "Best for regular use", 16, 700, common.text, "middle")}
  </g>
`);

const uploads = [
  { path: "classendo-images/information/resources.png", svg: resources },
  { path: "classendo-images/information/flowchart.png", svg: flowchart },
  { path: "classendo-images/information/free_vs_premium.png", svg: freeVsPremium },
  { path: "classendo-images/information/pricing.png", svg: pricing },
];

for (const asset of uploads) {
  const { error } = await uploadBucket.upload(asset.path, Buffer.from(asset.svg, "utf8"), {
    contentType: "image/svg+xml",
    upsert: true,
  });
  if (error) throw error;
  console.log(`Uploaded ${asset.path}`);
}
