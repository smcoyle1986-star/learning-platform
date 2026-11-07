import { readFileSync } from "node:fs";

const required = [
  {
    file: "app/signup/page.tsx",
    patterns: [/import\s+GoogleOAuthButton\s+from\s+["']@\/components\/auth\/GoogleOAuthButton["']/, /<GoogleOAuthButton\b/],
  },
  {
    file: "app/login/page.tsx",
    patterns: [/import\s+GoogleOAuthButton\s+from\s+["']@\/components\/auth\/GoogleOAuthButton["']/, /<GoogleOAuthButton\b/],
  },
  {
    file: "components/auth/GoogleOAuthButton.tsx",
    patterns: [/signInWithIdToken\s*\(/, /renderButton\s*\(/],
  },
  {
    file: "app/api/auth/google/status/route.ts",
    patterns: [/export\s+async\s+function\s+GET\s*\(/],
  },
  {
    file: "app/api/auth/google/complete/route.ts",
    patterns: [/export\s+async\s+function\s+POST\s*\(/],
  },
  {
    file: "app/signup/complete-google/page.tsx",
    patterns: [/\/api\/auth\/google\/complete/],
  },
];

const failures = [];

for (const check of required) {
  let source;
  try {
    source = readFileSync(check.file, "utf8");
  } catch {
    failures.push(`${check.file} is missing`);
    continue;
  }

  for (const pattern of check.patterns) {
    if (!pattern.test(source)) failures.push(`${check.file} is missing required Google-auth wiring (${pattern})`);
  }
}

if (failures.length) {
  console.error("Critical feature check failed; refusing to build without the released Google-auth flow:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Critical feature check passed: Google sign-up and login are wired to the Google Identity sign-in flow.");
