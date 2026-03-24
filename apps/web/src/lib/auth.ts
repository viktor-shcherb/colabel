import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

export const auth0 = new Auth0Client({
  signInReturnToPath: "/projects",
});

export const INVITE_COOKIE_NAME = "colabel-session";

/**
 * Get the signing key for invite session JWTs.
 * Uses AUTH0_SECRET which is always available in the Next.js environment.
 */
function getSigningKey(): Uint8Array {
  const secret = process.env.AUTH0_SECRET;
  if (!secret) {
    throw new Error("AUTH0_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Try to get an invite session from the colabel-session cookie.
 * Returns a session-like object compatible with Auth0's session shape.
 */
async function getInviteSession(): Promise<{
  user: {
    sub: string;
    email: string;
    name: string;
    picture: string | null;
  };
} | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(INVITE_COOKIE_NAME);
    if (!sessionCookie) return null;

    const { payload } = await jwtVerify(sessionCookie.value, getSigningKey(), {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string"
    ) {
      return null;
    }

    return {
      user: {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: null,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Get session from either Auth0 OR invite cookie.
 * Auth0 sessions take precedence.
 */
export async function getSession() {
  // Try Auth0 first
  const auth0Session = await auth0.getSession();
  if (auth0Session) return auth0Session;

  // Try invite session cookie
  const inviteSession = await getInviteSession();
  if (inviteSession) return inviteSession;

  return null;
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
