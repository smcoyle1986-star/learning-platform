import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { hasCompletedGoogleOnboarding, isVerifiedGoogleAuthUser } from "@/lib/auth/google-auth-state";
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

  const googleSetupPath = request.nextUrl.pathname === "/signup/complete-google"
    || request.nextUrl.pathname === "/auth/callback"
    || request.nextUrl.pathname.startsWith("/api/auth/google/")
    || request.nextUrl.pathname === "/api/auth/signout";
  if (isVerifiedGoogleAuthUser(user) && !googleSetupPath) {
    const { data: profile, error: profileError } = await getSupabaseAdmin()
      .from("profiles")
      .select("username,country_region,user_type")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError) {
      console.error("Could not check Google signup completion:", profileError);
      return NextResponse.json({ error: "Account setup is temporarily unavailable." }, { status: 503 });
    }
    if (!hasCompletedGoogleOnboarding(profile, user.user_metadata)) {
      if (request.nextUrl.pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Complete your account setup to continue.", onboardingRequired: true }, { status: 403 });
      }
      const onboardingUrl = request.nextUrl.clone();
      onboardingUrl.pathname = "/signup/complete-google";
      onboardingUrl.search = "";
      return redirectWithCookies(response, onboardingUrl);
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
