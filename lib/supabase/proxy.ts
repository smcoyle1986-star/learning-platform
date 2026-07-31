import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const secureCookies = process.env.NODE_ENV === "production";

function markAuthenticatedResponsePrivate(request: NextRequest, response: NextResponse) {
  const hasAuthCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));

  if (hasAuthCookie) {
    response.headers.set("Cache-Control", "private, no-store");
  }

  return response;
}

export async function refreshSupabaseSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        path: "/",
        sameSite: "lax",
        secure: secureCookies,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // This validates the token with Supabase Auth and refreshes it when needed.
  // Phase 2 will add role-aware redirects; this phase only establishes a
  // server-readable, refreshed session.
  await supabase.auth.getUser();

  return markAuthenticatedResponsePrivate(request, response);
}
