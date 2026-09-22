import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = [
  "/dashboard",
  "/agencies",
  "/branches",
  "/agents",
  "/buses",
  "/drivers",
  "/routes",
  "/trips",
];

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
      authenticated = response.ok;
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
    "/agencies/:path*",
    "/branches/:path*",
    "/agents/:path*",
    "/buses/:path*",
    "/drivers/:path*",
    "/routes/:path*",
    "/trips/:path*",
  ],
};
