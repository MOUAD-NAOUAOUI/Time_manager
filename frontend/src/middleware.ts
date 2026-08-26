import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ─── Route Access Rules ────────────────────────────────────────────────────────
//
//  Public routes  → accessible without authentication
//  Protected routes → redirect to /auth/login if no auth_token cookie
//  Auth routes    → redirect to /dashboard if already authenticated
//
// ──────────────────────────────────────────────────────────────────────────────

const PUBLIC_PATHS  = ["/", "/auth/login", "/auth/register"];
const AUTH_PATHS    = ["/auth/login", "/auth/register"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));
}

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some(p => pathname === p || pathname.startsWith(p + "/"));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth_token")?.value;

  const isAuthenticated = Boolean(token && token.length > 10);

  // Authenticated user trying to visit login/register → send to dashboard
  if (isAuthenticated && isAuthPath(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Unauthenticated user trying to visit a protected route → send to login
  if (!isAuthenticated && !isPublicPath(pathname)) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next.js internals and static files
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|eot)).*)",
  ],
};
