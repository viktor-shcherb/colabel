import "server-only";
import { db } from "@/db";
import { annotation } from "@/db/schema";
import { and, eq, sql, gte, lte } from "drizzle-orm";

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
