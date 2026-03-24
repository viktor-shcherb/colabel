import { NextResponse } from "next/server";
import { INVITE_COOKIE_NAME, auth0 } from "@/lib/auth";

export async function GET(request: Request) {
  // Check if user has an Auth0 session — if so, use Auth0 logout
  const auth0Session = await auth0.getSession();
  if (auth0Session) {
    // Redirect to Auth0 logout which handles its own cookie clearing
    return NextResponse.redirect(new URL("/auth/logout", request.url));
  }

  // For invite sessions, clear the cookie and redirect to home
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(INVITE_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
