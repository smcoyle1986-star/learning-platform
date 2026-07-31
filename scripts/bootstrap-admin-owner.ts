import fs from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

function loadLocalEnvironment() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }

  return value;
}

function requestedEmail() {
  const equalsArgument = process.argv.find((argument) =>
    argument.startsWith("--email="),
  );
  const emailFlagIndex = process.argv.indexOf("--email");
  const value = equalsArgument?.slice("--email=".length)
    ?? (emailFlagIndex >= 0 ? process.argv[emailFlagIndex + 1] : undefined)
    ?? process.env.CLASSENDO_OWNER_EMAIL;

  if (!value?.trim()) {
    throw new Error(
      "Provide an existing authentication user with --email user@example.com.",
    );
  }

  return value.trim().toLowerCase();
}

async function main() {
  loadLocalEnvironment();

  const email = requestedEmail();
  const supabase = createClient(
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  const perPage = 200;
  let user = null;

  for (let page = 1; !user; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw error;

    user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email,
    ) ?? null;

    if (!user && data.users.length < perPage) break;
  }

  if (!user) {
    throw new Error(
      `No Supabase Auth user exists for ${email}. Sign up first, then rerun this command.`,
    );
  }

  const { data, error } = await supabase.rpc(
    "bootstrap_first_admin_owner",
    { target_user_id: user.id },
  );

  if (error) throw error;

  const result = data as {
    changed?: boolean;
    role?: string;
  } | null;

  console.log(
    result?.changed
      ? `Created the Classendo owner membership for ${email}.`
      : `${email} is already the Classendo owner; no change was needed.`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Owner bootstrap failed: ${message}`);
  process.exitCode = 1;
});
