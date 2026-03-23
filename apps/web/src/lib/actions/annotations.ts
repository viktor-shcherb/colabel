"use server";

import { db } from "@/db";
import { annotation } from "@/db/schema";
import { requireSession } from "@/lib/auth";
import { invalidateProgress } from "@/lib/cache";
import { saveAnnotationSchema } from "@/lib/schemas/annotation";

export async function saveAnnotationAction(input: {
  projectId: string;
  itemIndex: number;
  labels: unknown;
}) {
  const session = await requireSession();
  const parsed = saveAnnotationSchema.parse(input);
  const userId = session.user.sub as string;

  await db
    .insert(annotation)
    .values({
      projectId: parsed.projectId,
      userId,
      itemIndex: parsed.itemIndex,
      labels: parsed.labels,
    })
    .onConflictDoUpdate({
      target: [annotation.projectId, annotation.userId, annotation.itemIndex],
      set: {
        labels: parsed.labels,
        updatedAt: new Date(),
      },
    });

  await invalidateProgress(parsed.projectId, userId);
}
