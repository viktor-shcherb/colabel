import "server-only";
import { db } from "@/db";
import { annotation, user } from "@/db/schema";
import { and, eq, sql, gte, lte, ne, inArray } from "drizzle-orm";

export async function getAnnotation(
  projectId: string,
  userId: string,
  itemIndex: number,
) {
  return db.query.annotation.findFirst({
    where: and(
      eq(annotation.projectId, projectId),
      eq(annotation.userId, userId),
      eq(annotation.itemIndex, itemIndex),
    ),
  });
}

export async function getAnnotationsForWindow(
  projectId: string,
  userId: string,
  centerIndex: number,
  windowSize: number,
) {
  const minIndex = Math.max(0, centerIndex - windowSize);
  const maxIndex = centerIndex + windowSize;

  return db
    .select()
    .from(annotation)
    .where(
      and(
        eq(annotation.projectId, projectId),
        eq(annotation.userId, userId),
        gte(annotation.itemIndex, minIndex),
        lte(annotation.itemIndex, maxIndex),
      ),
    );
}

export async function getAnnotatedCount(
  projectId: string,
  userId: string,
): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(annotation)
    .where(
      and(eq(annotation.projectId, projectId), eq(annotation.userId, userId)),
    );
  return Number(result[0]?.count ?? 0);
}

export interface UserAnnotationStat {
  userId: string;
  userName: string | null;
  userEmail: string;
  count: number;
}

export async function getAnnotationStats(
  projectId: string,
): Promise<UserAnnotationStat[]> {
  const rows = await db
    .select({
      userId: annotation.userId,
      userName: user.name,
      userEmail: user.email,
      count: sql<number>`count(*)`,
    })
    .from(annotation)
    .innerJoin(user, eq(annotation.userId, user.id))
    .where(eq(annotation.projectId, projectId))
    .groupBy(annotation.userId, user.name, user.email);

  return rows.map((r) => ({
    userId: r.userId,
    userName: r.userName,
    userEmail: r.userEmail,
    count: Number(r.count),
  }));
}

export interface AnnotationForItem {
  userId: string;
  userName: string | null;
  labels: unknown;
}

export async function getAnnotationsForItem(
  projectId: string,
  itemIndex: number,
  excludeUserId?: string,
): Promise<AnnotationForItem[]> {
  const conditions = [
    eq(annotation.projectId, projectId),
    eq(annotation.itemIndex, itemIndex),
  ];
  if (excludeUserId) {
    conditions.push(ne(annotation.userId, excludeUserId));
  }

  const rows = await db
    .select({
      userId: annotation.userId,
      userName: user.name,
      labels: annotation.labels,
    })
    .from(annotation)
    .innerJoin(user, eq(annotation.userId, user.id))
    .where(and(...conditions));

  return rows;
}

export async function getAnnotationsForItemByUsers(
  projectId: string,
  itemIndex: number,
  userIds: string[],
): Promise<AnnotationForItem[]> {
  if (userIds.length === 0) return [];

  const rows = await db
    .select({
      userId: annotation.userId,
      userName: user.name,
      labels: annotation.labels,
    })
    .from(annotation)
    .innerJoin(user, eq(annotation.userId, user.id))
    .where(
      and(
        eq(annotation.projectId, projectId),
        eq(annotation.itemIndex, itemIndex),
        inArray(annotation.userId, userIds),
      ),
    );

  return rows;
}

export async function getAllAnnotationLabels(
  projectId: string,
): Promise<{ labels: unknown }[]> {
  return db
    .select({ labels: annotation.labels })
    .from(annotation)
    .where(eq(annotation.projectId, projectId));
}
