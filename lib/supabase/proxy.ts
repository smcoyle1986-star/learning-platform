import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getClassendoVerification } from "@/lib/auth/server-verification";
import { getSupabaseAdmin } from "@/lib/server/supabase-admin";

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

function redirectWithCookies(response: NextResponse, location: URL) {
  const redirect = NextResponse.redirect(location);

  response.cookies.getAll().forEach((cookie) => {
    redirect.cookies.set(cookie);
  });

  redirect.headers.set("Cache-Control", "private, no-store");
  return redirect;
}

const PUBLIC_PAGES = ["/", "/login", "/signup", "/verify-email", "/verification-required", "/check-email", "/auth", "/landing", "/faq", "/games", "/flashcards", "/printables", "/legal", "/privacy", "/terms"];
const PUBLIC_APIS = ["/api/auth/", "/api/analytics/", "/api/games/popularity", "/api/games/free-analytics", "/api/stripe/pricing", "/api/stripe/webhook", "/api/landing-image", "/api/landing-images", "/api/ping", "/api/printables/export-pdf", "/api/cron/", "/api/internal/"];

function matchesPath(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function isPublicPath(path: string) {
  return path.startsWith("/api/")
    ? PUBLIC_APIS.some((prefix) => prefix.endsWith("/") ? path.startsWith(prefix) : matchesPath(path, prefix))
    : PUBLIC_PAGES.some((prefix) => matchesPath(path, prefix));
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

  // Always validate the token with Supabase Auth. Reading the session alone
  // would trust unverified cookie contents.
  const bearer = request.headers.get("authorization");
  const token = bearer?.startsWith("Bearer ") ? bearer.slice(7) : null;
  const { data: { user } } = token
    ? await getSupabaseAdmin().auth.getUser(token)
    : await supabase.auth.getUser();

  if (user && !isPublicPath(request.nextUrl.pathname)) {
    try {
      const verification = await getClassendoVerification(user.id);
      if (verification.phase === "expired") {
        if (request.nextUrl.pathname.startsWith("/api/")) {
          const denied = NextResponse.json({ error: "Verify your email to continue.", verificationRequired: true }, { status: 403 });
          denied.headers.set("Cache-Control", "private, no-store");
          return denied;
        }
        const requiredUrl = request.nextUrl.clone();
        requiredUrl.pathname = "/verification-required";
        requiredUrl.search = "";
        return redirectWithCookies(response, requiredUrl);
      }
    } catch (error) {
      console.error("Could not check email verification access:", error);
      return NextResponse.json({ error: "Verification access is temporarily unavailable." }, { status: 503 });
    }
  }

  if (request.nextUrl.pathname.startsWith("/admin")) {
    const isUnauthorizedPage =
      request.nextUrl.pathname === "/admin/unauthorized";

    if (!user) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set(
        "next",
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      );
      return redirectWithCookies(response, loginUrl);
    }

    const { data: membership, error: membershipError } = await supabase
      .from("admin_memberships")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    // The protected server layout is the authority. If this optimistic check
    // cannot reach the authorization table, let the request continue so the
    // layout can surface an availability error instead of mislabelling the
    // user as unauthorized.
    if (membershipError) {
      return markAuthenticatedResponsePrivate(request, response);
    }

    if (!membership && !isUnauthorizedPage) {
      const unauthorizedUrl = request.nextUrl.clone();
      unauthorizedUrl.pathname = "/admin/unauthorized";
      unauthorizedUrl.search = "";
      return redirectWithCookies(response, unauthorizedUrl);
    }

    if (membership && isUnauthorizedPage) {
      const adminUrl = request.nextUrl.clone();
      adminUrl.pathname = "/admin";
      adminUrl.search = "";
      return redirectWithCookies(response, adminUrl);
    }
  }

  return markAuthenticatedResponsePrivate(request, response);
}
