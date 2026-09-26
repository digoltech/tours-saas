import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/onboarding",
  "/agencies",
  "/agents",
  "/bookings",
  "/branches",
  "/buses",
  "/drivers",
  "/finance",
  "/profile",
  "/routes",
  "/seat-layout",
  "/settings",
  "/superadmin",
  "/trips",
];

const userHeader = "x-aone-auth-user";

export async function proxy(request: NextRequest) {
  if (
    !protectedPaths.some(
      (path) =>
        request.nextUrl.pathname === path ||
        request.nextUrl.pathname.startsWith(`${path}/`),
    )
  )
    return NextResponse.next();
  const token = request.cookies.get("aone_session")?.value;
  let authenticated = false;
  if (token) {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/auth/me`,
        { headers: { Cookie: `aone_session=${token}` }, cache: "no-store" },
      );
      if (response.ok) {
        const payload = (await response.json()) as {
          data?: { onboardingCompleted?: boolean } & Record<string, unknown>;
        };
        authenticated = true;
        const onboardingDone = payload.data?.onboardingCompleted === true;
        if (request.nextUrl.pathname === "/onboarding" && onboardingDone)
          return NextResponse.redirect(new URL("/dashboard/home", request.url));
        if (request.nextUrl.pathname !== "/onboarding" && !onboardingDone)
          return NextResponse.redirect(new URL("/onboarding", request.url));
        if (payload.data) {
          const requestHeaders = new Headers(request.headers);
          requestHeaders.set(userHeader, JSON.stringify(payload.data));
          return NextResponse.next({ request: { headers: requestHeaders } });
        }
      }
    } catch {
      authenticated = false;
    }
  }
  if (!authenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding",
    "/agencies/:path*",
    "/agents/:path*",
    "/bookings/:path*",
    "/branches/:path*",
    "/buses/:path*",
    "/drivers/:path*",
    "/finance/:path*",
    "/profile",
    "/routes/:path*",
    "/seat-layout/:path*",
    "/settings/:path*",
    "/superadmin/:path*",
    "/trips/:path*",
  ],
};
