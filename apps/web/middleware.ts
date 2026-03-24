import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth0, INVITE_COOKIE_NAME } from "@/lib/auth";
import { jwtVerify } from "jose";

/**
 * Check if the request has a valid invite session cookie.
 * This runs in Edge Runtime, so we use jose for JWT verification.
 */
async function hasValidInviteSession(request: NextRequest): Promise<boolean> {
  const sessionCookie = request.cookies.get(INVITE_COOKIE_NAME);
  if (!sessionCookie) return false;

  const secret = process.env.AUTH0_SECRET;
  if (!secret) return false;

  try {
    const key = new TextEncoder().encode(secret);
    await jwtVerify(sessionCookie.value, key, { algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  // Let auth0 handle /auth/* routes (login, callback, logout, etc.)
  const authRes = await auth0.middleware(request);

  // For /auth/* paths, return the auth response directly
  if (request.nextUrl.pathname.startsWith("/auth/")) {
    return authRes;
  }

  // For protected app routes, check Auth0 session first
  const session = await auth0.getSession(request);
  if (session) {
    return authRes;
  }

  // Then check invite session cookie
  const hasInvite = await hasValidInviteSession(request);
  if (hasInvite) {
    return authRes;
  }

  // No valid session — redirect to login
  return NextResponse.redirect(new URL("/auth/login", request.url));
}

export const config = {
  matcher: [
    "/auth/:path*",
    "/projects/:path*",
    "/annotate/:path*",
    "/stats/:path*",
  ],
};
