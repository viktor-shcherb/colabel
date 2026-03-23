import "server-only";
import { getSession as auth0GetSession } from "@auth0/nextjs-auth0";

export async function getSession() {
  return auth0GetSession();
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
