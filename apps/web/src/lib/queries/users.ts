import "server-only";
import { db } from "@/db";
import { user } from "@/db/schema";

/**
 * Upsert a user record from Auth0 session data.
 * Called from the app layout on every page load to keep user data in sync.
 */
export async function syncUser(profile: {
  sub: string;
  email: string;
  name?: string | null;
  picture?: string | null;
}) {
  try {
    await db
      .insert(user)
      .values({
        id: profile.sub,
        email: profile.email,
        name: profile.name ?? null,
        image: profile.picture ?? null,
      })
      .onConflictDoUpdate({
        target: user.id,
        set: {
          name: profile.name ?? null,
          image: profile.picture ?? null,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error("Failed to sync user to DB:", error);
  }
}
