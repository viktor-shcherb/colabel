import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth0 } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  // Let auth0 handle /auth/* routes (login, callback, logout, etc.)
  const authRes = await auth0.middleware(request);

  // For /auth/* paths, return the auth response directly
  if (request.nextUrl.pathname.startsWith("/auth/")) {
    return authRes;
  }

  // For protected app routes, check session
  const session = await auth0.getSession(request);
  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  return authRes;
}

export const config = {
  matcher: [
    "/auth/:path*",
    "/projects/:path*",
    "/annotate/:path*",
    "/stats/:path*",
  ],
};
