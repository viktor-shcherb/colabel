import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { db } from "@/db";
import { invite, user, projectMember } from "@/db/schema";
import { eq } from "drizzle-orm";
import { INVITE_COOKIE_NAME } from "@/lib/auth";

function getSigningKey(): Uint8Array {
  const secret = process.env.AUTH0_SECRET;
  if (!secret) {
    throw new Error("AUTH0_SECRET is not set");
  }
  return new TextEncoder().encode(secret);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  // 1. Look up the invite
  const [inviteRecord] = await db
    .select()
    .from(invite)
    .where(eq(invite.token, token))
    .limit(1);

  if (!inviteRecord) {
    return new NextResponse("Invalid invite link.", { status: 404 });
  }

  // 2. Validate: not expired
  if (new Date() > inviteRecord.expiresAt) {
    return new NextResponse("This invite link has expired.", { status: 410 });
  }

  // 3. Validate: not already used
  if (inviteRecord.usedAt) {
    return new NextResponse("This invite link has already been used.", {
      status: 410,
    });
  }

  // 4. Create/upsert user
  const userId = `invite|${inviteRecord.id}`;
  const userEmail =
    inviteRecord.email ?? `invite-${inviteRecord.id}@colabel.local`;
  const userName = inviteRecord.name ?? "Invited User";

  await db
    .insert(user)
    .values({
      id: userId,
      email: userEmail,
      name: userName,
      role: inviteRecord.role,
    })
    .onConflictDoUpdate({
      target: user.id,
      set: {
        name: userName,
        updatedAt: new Date(),
      },
    });

  // 5. If project_id is set, add user to project_member
  if (inviteRecord.projectId) {
    await db
      .insert(projectMember)
      .values({
        projectId: inviteRecord.projectId,
        userId: userId,
        role: inviteRecord.role,
      })
      .onConflictDoNothing();
  }

  // 6. Create session JWT
  const jwt = await new SignJWT({
    sub: userId,
    email: userEmail,
    name: userName,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(inviteRecord.expiresAt)
    .sign(getSigningKey());

  // 7. Mark invite as used
  await db
    .update(invite)
    .set({ usedAt: new Date() })
    .where(eq(invite.id, inviteRecord.id));

  // 8. Set cookie and redirect
  const isProduction = process.env.NODE_ENV === "production";
  const response = NextResponse.redirect(
    new URL("/projects", _request.url),
  );
  response.cookies.set(INVITE_COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    expires: inviteRecord.expiresAt,
  });

  return response;
}
